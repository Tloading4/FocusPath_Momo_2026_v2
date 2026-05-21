# Stripe API Key Setup Guide for Firebase Functions

This guide will walk you through connecting your Stripe API keys to Firebase Functions for the Focus Path application.

## Prerequisites

- Firebase CLI installed (`npm install -g firebase-tools`)
- A Stripe account (sign up at https://stripe.com)
- Firebase project created and initialized

## Step-by-Step Setup

### 1. Get Your Stripe API Keys

#### Get Publishable Key and Secret Key

1. Log in to your Stripe Dashboard: https://dashboard.stripe.com
2. Click on **Developers** in the left sidebar
3. Click on **API keys**
4. You'll see two types of keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

**Important:**
- Use `pk_test_` and `sk_test_` keys for development/testing
- Use `pk_live_` and `sk_live_` keys for production
- NEVER commit secret keys to your repository

### 2. Create Stripe Products and Prices

1. In Stripe Dashboard, go to **Products**: https://dashboard.stripe.com/products
2. Click **Add product**
3. Create two products:

**Monthly Premium Subscription:**
- Name: Focus Path Premium - Monthly
- Description: Unlock unlimited focus sessions and premium features
- Pricing: Recurring
- Price: $7.99 USD
- Billing period: Monthly
- After creation, copy the **Price ID** (starts with `price_`)

**Annual Premium Subscription:**
- Name: Focus Path Premium - Annual
- Description: Get 12 months for the price of 9.4 months
- Pricing: Recurring
- Price: $74.99 USD
- Billing period: Yearly
- After creation, copy the **Price ID** (starts with `price_`)

### 3. Configure Frontend Environment Variables

Update your `.env` file in the project root:

```env
# Stripe Publishable Key (client-side, safe to expose)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key

# Stripe Price IDs from step 2
VITE_STRIPE_PRICE_ID_MONTHLY=price_your_monthly_price_id
VITE_STRIPE_PRICE_ID_ANNUAL=price_your_annual_price_id
```

### 4. Configure Firebase Functions (Backend)

Firebase Functions use a separate configuration system to keep secrets secure.

#### Login to Firebase CLI

```bash
firebase login
```

If you're already logged in, you can skip this step.

#### Select Your Firebase Project

```bash
firebase use your-project-id
```

Replace `your-project-id` with your actual Firebase project ID.

#### Set Stripe Secret Key

```bash
firebase functions:config:set stripe.secret_key="sk_test_your_actual_secret_key"
```

**Important:** Replace `sk_test_your_actual_secret_key` with your actual Stripe secret key.

#### Verify Configuration

```bash
firebase functions:config:get
```

You should see output like:
```json
{
  "stripe": {
    "secret_key": "sk_test_..."
  }
}
```

### 5. Deploy Firebase Functions

Deploy your functions with the new configuration:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

This will deploy two functions:
- `createCheckoutSession` - Creates Stripe checkout sessions
- `stripeWebhook` - Handles Stripe webhook events

**Note the Function URLs** after deployment. You'll need the webhook URL in the next step.

Example:
```
Function URL (createCheckoutSession): https://us-central1-your-project.cloudfunctions.net/createCheckoutSession
Function URL (stripeWebhook): https://us-central1-your-project.cloudfunctions.net/stripeWebhook
```

### 6. Set Up Stripe Webhooks

Webhooks allow Stripe to notify your application about subscription events.

1. Go to Stripe Dashboard **Webhooks**: https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Enter your webhook URL from step 5:
   ```
   https://us-central1-your-project.cloudfunctions.net/stripeWebhook
   ```
4. Click **Select events** and choose:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. After creation, click on your webhook endpoint
7. Copy the **Signing secret** (starts with `whsec_`)

### 7. Configure Webhook Secret in Firebase

```bash
firebase functions:config:set stripe.webhook_secret="whsec_your_webhook_signing_secret"
```

Replace `whsec_your_webhook_signing_secret` with the actual signing secret from step 6.

### 8. Redeploy Functions with Webhook Secret

```bash
firebase deploy --only functions
```

### 9. Test Your Integration

#### Test with Stripe Test Cards

Use these test card numbers in test mode:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Requires Authentication:** `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any ZIP code.

#### Testing Steps

1. Start your development server: `npm run dev`
2. Navigate to the Premium Upgrade page
3. Click on a subscription plan
4. Complete checkout with a test card
5. Verify subscription status updates in your app
6. Check Firebase Firestore for subscription data

#### Monitor Logs

**Firebase Functions Logs:**
```bash
firebase functions:log
```

**Stripe Webhooks Logs:**
1. Go to https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. View recent webhook deliveries

## Configuration Summary

After completing all steps, you should have:

### Frontend (.env file)
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PRICE_ID_MONTHLY=price_...
VITE_STRIPE_PRICE_ID_ANNUAL=price_...
```

### Backend (Firebase Functions Config)
```bash
firebase functions:config:get
# Should show:
# {
#   "stripe": {
#     "secret_key": "sk_test_...",
#     "webhook_secret": "whsec_..."
#   }
# }
```

## Troubleshooting

### Error: "Stripe secret key not configured"

**Solution:** Run the Firebase config command again:
```bash
firebase functions:config:set stripe.secret_key="sk_test_your_key"
firebase deploy --only functions
```

### Error: "Webhook signature verification failed"

**Causes:**
1. Webhook secret not set or incorrect
2. Request body being parsed incorrectly

**Solution:**
```bash
firebase functions:config:set stripe.webhook_secret="whsec_your_secret"
firebase deploy --only functions
```

### Webhook Not Receiving Events

**Check:**
1. Function deployed successfully
2. Webhook URL is correct in Stripe Dashboard
3. Events are selected in webhook configuration
4. Check Firebase Functions logs for errors

### "Internal Error" During Checkout

**Check Firebase Functions Logs:**
```bash
firebase functions:log --limit 50
```

**Common causes:**
1. Stripe keys not configured
2. Invalid price IDs
3. Network/CORS issues

## Production Deployment

When moving to production:

1. **Switch to Live Keys:**
   - Use `pk_live_...` (publishable key) in `.env`
   - Use `sk_live_...` (secret key) in Firebase Functions config
   - Update price IDs to production price IDs

2. **Update Firebase Functions Config:**
   ```bash
   firebase functions:config:set stripe.secret_key="sk_live_your_live_key"
   firebase functions:config:set stripe.webhook_secret="whsec_your_live_webhook_secret"
   firebase deploy --only functions
   ```

3. **Create New Webhook for Production:**
   - Create a separate webhook endpoint in Stripe Dashboard
   - Point it to your production function URL
   - Use the new webhook secret in Firebase config

4. **Test Thoroughly:**
   - Test checkout flow
   - Test subscription updates
   - Test cancellations
   - Monitor webhooks in Stripe Dashboard

## Security Best Practices

1. **Never commit secrets to Git:**
   - `.env` file is in `.gitignore`
   - Use `.env.example` as a template only

2. **Use Test Mode for Development:**
   - Always test with `pk_test_` and `sk_test_` keys first

3. **Rotate Keys Regularly:**
   - Periodically rotate your API keys in Stripe Dashboard
   - Update Firebase Functions config after rotation

4. **Monitor Webhook Security:**
   - Always verify webhook signatures
   - Check Firebase Functions logs regularly

5. **Separate Test and Production:**
   - Use different Firebase projects for testing and production
   - Keep test and production Stripe accounts separate

## Need Help?

- Stripe Documentation: https://stripe.com/docs
- Firebase Functions Documentation: https://firebase.google.com/docs/functions
- Focus Path Support: Check in-app support
