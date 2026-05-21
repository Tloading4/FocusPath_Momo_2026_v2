const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe');
const fetch = require('node-fetch');

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe with secret key from Firebase config
const stripeSecretKey = functions.config().stripe?.secret_key;
if (!stripeSecretKey) {
  console.error('Stripe secret key not configured. Run: firebase functions:config:set stripe.secret_key="sk_test_..."');
}
const stripeClient = stripe(stripeSecretKey);

// Create Stripe checkout session
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { priceId, userId, successUrl, cancelUrl } = data;

    // Validate required parameters
    if (!priceId || !userId || !successUrl || !cancelUrl) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    // Verify the authenticated user matches the userId
    if (context.auth.uid !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'User ID mismatch');
    }

    // Create Stripe checkout session
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer_email: context.auth.token.email,
      metadata: {
        userId: userId,
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to create checkout session');
  }
});

// Handle Stripe webhooks
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = functions.config().stripe?.webhook_secret;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(400).send('Webhook secret not configured');
  }

  let event;

  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleSuccessfulPayment(session);
        break;
      
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        await handleSubscriptionChange(subscription);
        break;
      
      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice);
        break;
      
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        await handlePaymentFailed(failedInvoice);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).send('Webhook handler failed');
  }
});

// Helper function to handle successful payments
async function handleSuccessfulPayment(session) {
  const userId = session.client_reference_id || session.metadata?.userId;

  if (!userId) {
    console.error('No user ID found in session');
    return;
  }

  try {
    const subscriptionId = session.subscription;
    const customerId = session.customer;

    // Store or update Stripe customer mapping
    await admin.firestore().collection('stripe_customers').doc(userId).set({
      user_id: userId,
      stripe_customer_id: customerId,
      email: session.customer_email || session.customer_details?.email || '',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Get full subscription details from Stripe
    if (subscriptionId) {
      const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
      await createOrUpdateSubscription(userId, subscription);
    }

    // Update user profile for backward compatibility
    await admin.firestore().collection('userProfiles').doc(userId).set({
      subscriptionStatus: 'active',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`Updated subscription for user: ${userId}`);
  } catch (error) {
    console.error('Error updating user subscription:', error);
  }
}

// Helper function to handle subscription changes
async function handleSubscriptionChange(subscription) {
  try {
    // Find user by customer ID from stripe_customers collection
    const customerQuery = await admin.firestore()
      .collection('stripe_customers')
      .where('stripe_customer_id', '==', subscription.customer)
      .limit(1)
      .get();

    if (customerQuery.empty) {
      console.error('No user found for customer:', subscription.customer);
      return;
    }

    const customerDoc = customerQuery.docs[0];
    const userId = customerDoc.data().user_id;

    // Create or update subscription record
    await createOrUpdateSubscription(userId, subscription);

    // Update user profile for backward compatibility
    const status = subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'inactive';
    await admin.firestore().collection('userProfiles').doc(userId).set({
      subscriptionStatus: status,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`Updated subscription status to ${status} for customer: ${subscription.customer}`);
  } catch (error) {
    console.error('Error handling subscription change:', error);
  }
}

// Helper function to handle successful payments
async function handlePaymentSucceeded(invoice) {
  try {
    // Find user by customer ID from stripe_customers collection
    const customerQuery = await admin.firestore()
      .collection('stripe_customers')
      .where('stripe_customer_id', '==', invoice.customer)
      .limit(1)
      .get();

    if (customerQuery.empty) {
      console.error('No user found for customer:', invoice.customer);
      return;
    }

    const customerDoc = customerQuery.docs[0];
    const userId = customerDoc.data().user_id;

    // If there's a subscription, update it
    if (invoice.subscription) {
      const subscription = await stripeClient.subscriptions.retrieve(invoice.subscription);
      await createOrUpdateSubscription(userId, subscription);
    }

    // Update user profile
    await admin.firestore().collection('userProfiles').doc(userId).set({
      subscriptionStatus: 'active',
      lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`Payment succeeded for customer: ${invoice.customer}`);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

// Helper function to handle failed payments
async function handlePaymentFailed(invoice) {
  try {
    // Find user by customer ID from stripe_customers collection
    const customerQuery = await admin.firestore()
      .collection('stripe_customers')
      .where('stripe_customer_id', '==', invoice.customer)
      .limit(1)
      .get();

    if (customerQuery.empty) {
      console.error('No user found for customer:', invoice.customer);
      return;
    }

    const customerDoc = customerQuery.docs[0];
    const userId = customerDoc.data().user_id;

    // If there's a subscription, update it with past_due status
    if (invoice.subscription) {
      const subscription = await stripeClient.subscriptions.retrieve(invoice.subscription);
      await createOrUpdateSubscription(userId, subscription);
    }

    // Update user profile
    await admin.firestore().collection('userProfiles').doc(userId).set({
      subscriptionStatus: 'past_due',
      lastFailedPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`Payment failed for customer: ${invoice.customer}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// Helper function to create or update subscription in Firestore
async function createOrUpdateSubscription(userId, subscription) {
  try {
    const priceId = subscription.items?.data[0]?.price?.id || '';
    const price = subscription.items?.data[0]?.price;

    // Determine tier based on price metadata or default to premium
    let tier = 'premium';
    if (price?.metadata?.tier) {
      tier = price.metadata.tier;
    }

    const subscriptionData = {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      stripe_price_id: priceId,
      status: subscription.status,
      tier: tier,
      interval: price?.recurring?.interval || 'month',
      current_period_start: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
      current_period_end: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      canceled_at: subscription.canceled_at ? admin.firestore.Timestamp.fromMillis(subscription.canceled_at * 1000) : null,
      trial_start: subscription.trial_start ? admin.firestore.Timestamp.fromMillis(subscription.trial_start * 1000) : null,
      trial_end: subscription.trial_end ? admin.firestore.Timestamp.fromMillis(subscription.trial_end * 1000) : null,
      metadata: subscription.metadata || {},
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Use subscription ID as document ID for easy lookups
    await admin.firestore().collection('subscriptions').doc(subscription.id).set({
      ...subscriptionData,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`Subscription ${subscription.id} created/updated for user ${userId}`);
  } catch (error) {
    console.error('Error creating/updating subscription:', error);
    throw error;
  }
}

exports.chatWithPoe = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { message, conversationId, userContext } = data;
    const userId = context.auth.uid;

    if (!message || typeof message !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Message is required');
    }

    const poeApiKey = functions.config().poe?.api_key;
    if (!poeApiKey) {
      console.error('Poe API key not configured. Run: firebase functions:config:set poe.api_key="your_key"');
      throw new functions.https.HttpsError('failed-precondition', 'Poe API not configured');
    }

    const db = admin.firestore();
    const usageRef = db.collection('poeUsageTracking').doc(userId);
    const userProfileRef = db.collection('userProfiles').doc(userId);

    const [usageDoc, userProfileDoc] = await Promise.all([
      usageRef.get(),
      userProfileRef.get()
    ]);

    const today = new Date().toISOString().split('T')[0];
    const usageData = usageDoc.exists ? usageDoc.data() : { messageCount: 0, resetDate: today };
    const userProfile = userProfileDoc.exists ? userProfileDoc.data() : {};
    const subscriptionStatus = userProfile.subscriptionStatus || 'free';

    if (usageData.resetDate !== today) {
      usageData.messageCount = 0;
      usageData.resetDate = today;
    }

    const messageLimit = subscriptionStatus === 'active' ? 999999 : 20;

    if (usageData.messageCount >= messageLimit) {
      throw new functions.https.HttpsError('resource-exhausted', 'Daily message limit reached. Please upgrade to premium for unlimited messages.');
    }

    let systemPrompt = `You are a friendly and motivating focus productivity coach for an app called Focus Path™. Your role is to help users improve their focus, build better study/work habits, and achieve their productivity goals.

Context about the user:
- Current Level: ${userContext?.level || 1}
- Total XP: ${userContext?.totalXP || 0}
- Current Streak: ${userContext?.streakCount || 0} days
- Total Sessions Completed: ${userContext?.totalSessions || 0}
- Average Session Length: ${userContext?.avgSessionLength || 25} minutes
- Focus Score: ${userContext?.focusScore || 0}/100

Provide personalized, actionable advice. Be encouraging, concise, and specific. Use their stats to give relevant recommendations.`;

    if (userContext?.recentSessions && userContext.recentSessions.length > 0) {
      systemPrompt += `\n\nRecent activity: The user has completed ${userContext.recentSessions.length} sessions recently.`;
    }

    if (userContext?.distractionCount > 0) {
      systemPrompt += `\n\nThey've logged ${userContext.distractionCount} distractions recently. Help them minimize distractions.`;
    }

    const response = await fetch('https://api.poe.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${poeApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Poe API error:', response.status, errorText);
      throw new functions.https.HttpsError('internal', 'Failed to get response from AI');
    }

    const poeResponse = await response.json();
    const aiMessage = poeResponse.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    let conversationRef;
    if (conversationId) {
      conversationRef = db.collection('chatConversations').doc(conversationId);
      await conversationRef.update({
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        messageCount: admin.firestore.FieldValue.increment(2)
      });
    } else {
      conversationRef = db.collection('chatConversations').doc();
      await conversationRef.set({
        userId: userId,
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        messageCount: 2
      });
    }

    const messagesRef = conversationRef.collection('messages');
    await Promise.all([
      messagesRef.add({
        role: 'user',
        content: message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }),
      messagesRef.add({
        role: 'assistant',
        content: aiMessage,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      })
    ]);

    usageData.messageCount += 1;
    await usageRef.set(usageData, { merge: true });

    return {
      message: aiMessage,
      conversationId: conversationRef.id,
      remainingMessages: messageLimit - usageData.messageCount
    };

  } catch (error) {
    console.error('Error in chatWithPoe:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'An error occurred while processing your request');
  }
});