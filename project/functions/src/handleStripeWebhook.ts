const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe');

// Initialize Stripe with secret key from Firebase config
const stripeSecretKey = functions.config().stripe?.secret_key;
const webhookSecret = functions.config().stripe?.webhook_secret;

if (!stripeSecretKey) {
  console.error('Stripe secret key not configured. Run: firebase functions:config:set stripe.secret_key="sk_test_..."');
}
if (!webhookSecret) {
  console.error('Stripe webhook secret not configured. Run: firebase functions:config:set stripe.webhook_secret="whsec_..."');
}

const stripeClient = stripe(stripeSecretKey);

// Handle Stripe webhooks
exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const sig = req.headers['stripe-signature'];

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    res.status(400).send('Webhook secret not configured');
    return;
  }

  let event;

  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleSuccessfulPayment(session);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        await handleSubscriptionChange(subscription);
        break;
      
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await handleSubscriptionCancellation(deletedSubscription);
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
    const userProfileRef = admin.firestore().collection('userProfiles').doc(userId);
    
    // Update user's subscription status in Firestore
    await userProfileRef.set({
      subscriptionStatus: 'active',
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      priceId: session.display_items?.[0]?.price?.id || null,
      subscriptionMode: session.mode,
      lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
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
    // Find user by customer ID
    const usersQuery = await admin.firestore()
      .collection('userProfiles')
      .where('stripeCustomerId', '==', subscription.customer)
      .limit(1)
      .get();

    if (usersQuery.empty) {
      console.error('No user found for customer:', subscription.customer);
      return;
    }

    const userDoc = usersQuery.docs[0];
    const status = subscription.status === 'active' ? 'active' : 'inactive';

    await userDoc.ref.set({
      subscriptionStatus: status,
      stripeSubscriptionId: subscription.id,
      priceId: subscription.items.data[0]?.price?.id || null,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`Updated subscription status to ${status} for customer: ${subscription.customer}`);
  } catch (error) {
    console.error('Error handling subscription change:', error);
  }
}

// Helper function to handle subscription cancellation
async function handleSubscriptionCancellation(subscription) {
  try {
    // Find user by customer ID
    const usersQuery = await admin.firestore()
      .collection('userProfiles')
      .where('stripeCustomerId', '==', subscription.customer)
      .limit(1)
      .get();

    if (usersQuery.empty) {
      console.error('No user found for customer:', subscription.customer);
      return;
    }

    const userDoc = usersQuery.docs[0];

    await userDoc.ref.set({
      subscriptionStatus: 'canceled',
      canceledAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`Subscription canceled for customer: ${subscription.customer}`);
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

// Helper function to handle successful payments
async function handlePaymentSucceeded(invoice) {
  try {
    // Find user by customer ID
    const usersQuery = await admin.firestore()
      .collection('userProfiles')
      .where('stripeCustomerId', '==', invoice.customer)
      .limit(1)
      .get();

    if (usersQuery.empty) {
      console.error('No user found for customer:', invoice.customer);
      return;
    }

    const userDoc = usersQuery.docs[0];

    await userDoc.ref.set({
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
    // Find user by customer ID
    const usersQuery = await admin.firestore()
      .collection('userProfiles')
      .where('stripeCustomerId', '==', invoice.customer)
      .limit(1)
      .get();

    if (usersQuery.empty) {
      console.error('No user found for customer:', invoice.customer);
      return;
    }

    const userDoc = usersQuery.docs[0];

    await userDoc.ref.set({
      subscriptionStatus: 'past_due',
      lastFailedPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`Payment failed for customer: ${invoice.customer}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}