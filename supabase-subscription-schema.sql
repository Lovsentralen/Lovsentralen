-- Add subscription fields to handle Stripe subscriptions
-- Run this in your Supabase SQL editor

-- Add subscription columns to auth.users metadata or create a separate subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive', -- 'active', 'inactive', 'canceled', 'past_due', 'trialing'
  price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update (via webhooks)
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add a usage tracking table (optional, for future analytics)
CREATE TABLE IF NOT EXISTS public.usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL, -- 'case_created', 'analysis_run', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_user_id ON public.usage(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_created_at ON public.usage(created_at);

-- Enable RLS on usage
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON public.usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

