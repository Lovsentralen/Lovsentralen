# Stripe Payment Setup Guide

This guide will help you set up Stripe payments for Lovsentralen (199 NOK/month subscription).

## Step 1: Create a Stripe Account

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Sign up for a new account
3. Verify your email

## Step 2: Get Your API Keys

1. Go to [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...`) - for frontend (not needed for this setup)
   - **Secret key** (starts with `sk_test_...`) - copy this!

3. Add to your `.env.local` file:
   ```
   STRIPE_SECRET_KEY=sk_test_your_key_here
   ```

## Step 3: Create Your Product and Price

1. Go to [https://dashboard.stripe.com/products](https://dashboard.stripe.com/products)
2. Click **"+ Add product"**
3. Fill in:
   - **Name**: `Lovsentralen Pro`
   - **Description**: `Ubegrenset tilgang til juridiske analyser`
4. Under **Pricing**:
   - Select **Recurring**
   - **Amount**: `199`
   - **Currency**: `NOK`
   - **Billing period**: `Monthly`
5. Click **"Save product"**
6. Click on the price you just created
7. Copy the **Price ID** (starts with `price_...`)
8. Add to your `.env.local`:
   ```
   STRIPE_PRICE_ID=price_your_id_here
   ```

## Step 4: Set Up Webhooks

Webhooks notify your app when payments succeed or fail.

### For Local Development (using Stripe CLI):

1. Install Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copy the webhook signing secret (shown in terminal, starts with `whsec_...`)
5. Add to your `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

### For Production (on Vercel):

1. Go to [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"+ Add endpoint"**
3. Enter your endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
5. Click **"Add endpoint"**
6. Click **"Reveal"** to see the signing secret
7. Add this to your Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

## Step 5: Run the Database Migration

Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor):

```sql
-- Copy contents from supabase-subscription-schema.sql
```

Or run the file directly.

## Step 6: Add Environment Variables

Your complete `.env.local` should have:

```
# Existing variables...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SERPER_API_KEY=...
OPENAI_API_KEY=...

# NEW Stripe variables:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

## Step 7: Configure Stripe Customer Portal

1. Go to [https://dashboard.stripe.com/settings/billing/portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable the following features:
   - ✅ Cancel subscriptions
   - ✅ Update payment methods
   - ✅ View invoices
3. Click **"Save"**

## Step 8: Test the Flow

1. Start your app: `npm run dev`
2. Go to `/pricing`
3. Click **"Start abonnement"**
4. Use Stripe test card: `4242 4242 4242 4242` (any future date, any CVC)
5. Complete the checkout
6. You should be redirected to `/subscription/success`
7. Check your Supabase database - there should be a new entry in the `subscriptions` table

## Going Live

When you're ready for real payments:

1. Go to Stripe Dashboard → **Activate your account**
2. Complete business verification
3. Switch from test to live API keys
4. Create a new product/price in live mode
5. Update all environment variables in Vercel with live keys
6. Update webhook to use production endpoint

## Troubleshooting

### "Subscription not showing as active"
- Check Supabase logs for webhook errors
- Make sure webhook secret is correct
- Check that the user_id metadata is being passed correctly

### "Webhook signature verification failed"
- Make sure you're using the correct webhook secret
- For local dev, use the secret from `stripe listen` command
- For production, use the secret from the webhook endpoint in Stripe Dashboard

### "Cannot find STRIPE_PRICE_ID"
- Make sure you created a recurring price (not one-time)
- Copy the price ID from the Stripe Dashboard (not the product ID)

---

## Summary of New Files Created

```
src/lib/stripe/index.ts          - Stripe client configuration
src/lib/subscription/index.ts    - Subscription status helpers
src/app/api/stripe/
  ├── create-checkout/route.ts   - Creates Stripe Checkout session
  ├── webhook/route.ts           - Handles Stripe webhooks
  └── portal/route.ts            - Opens Stripe billing portal
src/app/(dashboard)/pricing/page.tsx           - Pricing page
src/app/(dashboard)/subscription/success/page.tsx - Success page
src/components/subscription/
  ├── SubscribeButton.tsx        - Subscribe button component
  ├── SubscriptionGate.tsx       - Blocks content if not subscribed
  └── ManageSubscription.tsx     - Subscription management UI
supabase-subscription-schema.sql - Database schema for subscriptions
```

## Need Help?

- Stripe Docs: https://stripe.com/docs
- Supabase Docs: https://supabase.com/docs

