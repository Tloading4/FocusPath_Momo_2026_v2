# Stripe Quick Start Guide

Quick reference for connecting Stripe to Firebase Functions.

## 1. Get Stripe Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (pk_test_...)
3. Copy your **Secret key** (sk_test_...)

## 2. Create Subscription Products

1. Go to https://dashboard.stripe.com/products
2. Create two products:
   - **Monthly**: $7.99/month → Copy Price ID
   - **Annual**: $74.99/year → Copy Price ID

## 3. Configure Frontend

Edit `.env` file:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_STRIPE_PRICE_ID_MONTHLY=price_your_monthly_id
VITE_STRIPE_PRICE_ID_ANNUAL=price_your_annual_id
```

## 4. Configure Firebase Functions

```bash
# Login to Firebase
firebase login

# Select your project
firebase use your-project-id

# Set Stripe secret key
firebase functions:config:set stripe.secret_key="sk_test_your_secret_key"

# Verify configuration
firebase functions:config:get
```

## 5. Deploy Functions

```bash
firebase deploy --only functions
```

Copy the webhook URL from deployment output:
```
https://us-central1-YOUR-PROJECT.cloudfunctions.net/stripeWebhook
```

## 6. Configure Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Paste your webhook URL
4. Select these events:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
5. Copy **Signing secret** (whsec_...)

## 7. Add Webhook Secret

```bash
firebase functions:config:set stripe.webhook_secret="whsec_your_webhook_secret"
firebase deploy --only functions
```

## 8. Test

1. Run `npm run dev`
2. Go to Premium Upgrade page
3. Use test card: `4242 4242 4242 4242`
4. Any future date, any CVC, any ZIP

## Verify Everything Works

```bash
# Check Firebase Functions logs
firebase functions:log

# Check Stripe webhook deliveries
# Go to: https://dashboard.stripe.com/webhooks
```

## Quick Troubleshooting

**Error: "Stripe secret key not configured"**
```bash
firebase functions:config:set stripe.secret_key="sk_test_..."
firebase deploy --only functions
```

**Webhook not working**
```bash
firebase functions:config:set stripe.webhook_secret="whsec_..."
firebase deploy --only functions
```

**Need to see current config**
```bash
firebase functions:config:get
```

## Production Checklist

- [ ] Switch to live keys (pk_live_... and sk_live_...)
- [ ] Create production webhook endpoint
- [ ] Update Firebase Functions config with live keys
- [ ] Deploy to production
- [ ] Test with real card

---

For detailed instructions, see `STRIPE_SETUP.md`
