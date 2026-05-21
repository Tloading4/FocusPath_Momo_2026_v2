const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe');

// Initialize Stripe with secret key from Firebase config
const stripeSecretKey = functions.config().stripe?.secret_key;
if (!stripeSecretKey) {
  console.error('Stripe secret key not configured. Run: firebase functions:config:set stripe.secret_key="sk_test_..."');
}
const stripeClient = stripe(stripeSecretKey);

// Create Stripe checkout session
exports.createStripeCheckoutSession = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { priceId, successUrl, cancelUrl, mode } = data;

    // Validate required parameters
    if (!priceId || !successUrl || !cancelUrl || !mode) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: priceId, successUrl, cancelUrl, mode');
    }

    const userId = context.auth.uid;
    const userEmail = context.auth.token.email;

    if (!userEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'User email is required');
    }

    // Get or create Stripe customer
    let customerId;
    
    // Check if user already has a Stripe customer ID
    const userProfileRef = admin.firestore().collection('userProfiles').doc(userId);
    const userProfileDoc = await userProfileRef.get();
    
    if (userProfileDoc.exists() && userProfileDoc.data().stripeCustomerId) {
      customerId = userProfileDoc.data().stripeCustomerId;
      console.log(`Using existing Stripe customer: ${customerId}`);
    } else {
      // Create new Stripe customer
      const customer = await stripeClient.customers.create({
        email: userEmail,
        metadata: {
          userId: userId,
        },
      });
      
      customerId = customer.id;
      console.log(`Created new Stripe customer: ${customerId}`);
      
      // Save customer ID to user profile
      await userProfileRef.set({
        stripeCustomerId: customerId,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    // Create Stripe checkout session
    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId: userId,
      },
    });

    console.log(`Created checkout session: ${session.id} for user: ${userId}`);

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