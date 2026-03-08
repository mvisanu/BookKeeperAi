-- ============================================================
-- Migration: 20260304000001_stripe_billing
-- Description: Add Stripe subscription fields to profiles
-- ============================================================

-- Plan tier enum
DO $$ BEGIN
  CREATE TYPE plan_tier AS ENUM ('free', 'solo', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add Stripe + billing columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id    text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_price_id        text,
  ADD COLUMN IF NOT EXISTS plan                   plan_tier NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at        timestamptz;

-- Index for looking up by stripe customer id (webhook events)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON profiles(stripe_customer_id);
