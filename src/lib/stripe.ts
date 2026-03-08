import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

// ── Plan definitions ─────────────────────────────────────────────────────────

export type PlanTier = 'free' | 'solo' | 'pro'

export interface PlanConfig {
  tier: PlanTier
  name: string
  description: string
  /** Monthly price in CAD cents (0 = free) */
  monthlyPriceCad: number
  /** Stripe Price ID for monthly billing (undefined for free) */
  stripePriceId: string | undefined
  limits: {
    receiptsPerMonth: number | null  // null = unlimited
    statementsPerMonth: number | null
  }
  features: string[]
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    tier: 'free',
    name: 'Free',
    description: 'Get started with basic bookkeeping',
    monthlyPriceCad: 0,
    stripePriceId: undefined,
    limits: {
      receiptsPerMonth: 10,
      statementsPerMonth: 1,
    },
    features: [
      'Up to 10 receipts/month',
      '1 bank statement/month',
      'AI extraction',
      'Manual reconciliation',
    ],
  },
  solo: {
    tier: 'solo',
    name: 'Solo',
    description: 'For freelancers and small businesses',
    monthlyPriceCad: 1200,
    stripePriceId: process.env.STRIPE_PRICE_SOLO,
    limits: {
      receiptsPerMonth: 100,
      statementsPerMonth: null,
    },
    features: [
      'Up to 100 receipts/month',
      'Unlimited bank statements',
      'AI extraction',
      'Auto reconciliation',
      'CSV export',
    ],
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    description: 'Unlimited for growing businesses',
    monthlyPriceCad: 2900,
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    limits: {
      receiptsPerMonth: null,
      statementsPerMonth: null,
    },
    features: [
      'Unlimited receipts',
      'Unlimited bank statements',
      'Priority AI processing',
      'Auto reconciliation',
      'CSV export',
      'Priority support',
    ],
  },
}

export function getPlanByPriceId(priceId: string): PlanTier | null {
  for (const [tier, config] of Object.entries(PLANS)) {
    if (config.stripePriceId === priceId) return tier as PlanTier
  }
  return null
}
