# Stripe Setup for Supabase Edge Functions

Your application uses **Supabase Edge Functions** for handling Stripe payments, not Firebase Functions. Follow this guide to configure Stripe correctly.

## Quick Setup

### 1. Get Your Stripe API Keys

1. Log in to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable Key** (starts with `pk_test_`)
3. Copy your **Secret Key** (starts with `sk_test_`)

### 2. Create Stripe Products

1. Go to https://dashboard.stripe.com/products
2. Create Monthly subscription: $7.99/month
3. Create Annual subscription: $74.99/year
4. Copy each **Price ID** (starts with `price_`)

### 3. Configure Frontend Environment Variables

Update your `.env` file:

```env
VITE_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
VITE_STRIPE_PRICE_ID_MONTHLY=price_your_monthly_id
VITE_STRIPE_PRICE_ID_ANNUAL=price_your_annual_id
```

### 4. Configure Stripe Secret in Supabase

**IMPORTANT:** You need to set your Stripe secret key as an environment variable in Supabase.

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions**
3. Under **Secrets**, add a new secret:
   - Key: `STRIPE_SECRET_KEY`
   - Value: `sk_test_your_stripe_secret_key`
4. Click **Save**

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref 0ec90b57d6e95fcbda19832f

# Set the secret
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
```

### 5. Verify Edge Functions are Deployed

Your Edge Functions should already be deployed. Verify:

1. Go to Supabase Dashboard → **Edge Functions**
2. You should see:
   - `create-checkout-session` (Status: ACTIVE)
   - `stripe-webhook` (Status: ACTIVE)

If not deployed, deploy them:

```bash
# Deploy all functions
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

### 6. Set Up Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Enter webhook URL:
   ```
   https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/stripe-webhook
   ```
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

### 7. Add Webhook Secret to Supabase

Add the webhook signing secret:

**Dashboard:**
- Go to Project Settings → Edge Functions → Secrets
- Key: `STRIPE_WEBHOOK_SECRET`
- Value: `whsec_your_webhook_secret`

**CLI:**
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 8. Create Required Database Tables

The following tables should already exist from migrations:

- `stripe_customers` - Maps users to Stripe customers
- `subscriptions` - Stores subscription information

If they don't exist, run:

```bash
supabase db push
```

### 9. Test Your Integration

1. Start your dev server: `npm run dev`
2. Navigate to Premium Upgrade page
3. Click on a subscription plan
4. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any ZIP code
5. Complete checkout
6. Verify subscription in Supabase dashboard

## Troubleshooting

### Error: "Stripe secret key not configured"

**Solution:** Set the `STRIPE_SECRET_KEY` secret in Supabase:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key
```

### Error: "Access Denied" (XML response)

**Causes:**
- Incorrect Supabase URL
- Missing or invalid anon key
- Edge function not deployed

**Solution:**
1. Verify `.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Check Edge Functions are deployed in Supabase Dashboard
3. Restart dev server after updating `.env`

### Webhook Not Receiving Events

**Check:**
1. Webhook URL is correct: `https://YOUR_SUPABASE_URL.supabase.co/functions/v1/stripe-webhook`
2. `STRIPE_WEBHOOK_SECRET` is set in Supabase secrets
3. Webhook events are selected in Stripe Dashboard
4. Check Supabase Edge Function logs

### View Edge Function Logs

In Supabase Dashboard:
1. Go to **Edge Functions**
2. Click on function name
3. View **Logs** tab

Or use CLI:
```bash
supabase functions logs create-checkout-session
supabase functions logs stripe-webhook
```

## Current Configuration

Your `.env` file currently has:

```env
VITE_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**What you need to add:**

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
VITE_STRIPE_PRICE_ID_MONTHLY=price_your_monthly_id
VITE_STRIPE_PRICE_ID_ANNUAL=price_your_annual_id
```

**What you need to set in Supabase (Dashboard or CLI):**

- `STRIPE_SECRET_KEY=sk_test_your_secret_key`
- `STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret`

## Security Notes

1. **Never commit secrets to Git**
   - `.env` is in `.gitignore`
   - Use `.env.example` as template only

2. **Use Test Keys for Development**
   - `pk_test_...` and `sk_test_...` for testing
   - `pk_live_...` and `sk_live_...` for production

3. **Secrets are Server-Side Only**
   - Supabase secrets are only available to Edge Functions
   - Never expose secret keys in frontend code

## Production Checklist

- [ ] Switch to live Stripe keys (`pk_live_...` and `sk_live_...`)
- [ ] Update `STRIPE_SECRET_KEY` in Supabase with live key
- [ ] Create production webhook in Stripe Dashboard
- [ ] Update `STRIPE_WEBHOOK_SECRET` in Supabase
- [ ] Test checkout flow with real card
- [ ] Monitor Edge Function logs
- [ ] Verify webhooks are being received

## Need Help?

- Stripe Docs: https://stripe.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Secrets: https://supabase.com/docs/guides/functions/secrets
