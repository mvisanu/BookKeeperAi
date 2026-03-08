import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, PLANS, type PlanTier } from '@/lib/stripe'
import { apiSuccess, apiError } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthenticated', 'UNAUTHENTICATED', 401)

  const body = await request.json()
  const tier = body.tier as PlanTier
  const trialDays = typeof body.trial_period_days === 'number' ? body.trial_period_days : undefined

  if (!tier || !PLANS[tier] || tier === 'free') {
    return apiError('Invalid plan tier', 'INVALID_PLAN', 400)
  }

  const plan = PLANS[tier]
  if (!plan.stripePriceId) {
    return apiError('Plan has no Stripe price configured', 'INVALID_PLAN', 400)
  }

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id as string | undefined

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/billing?success=true`,
    cancel_url: `${appUrl}/billing?canceled=true`,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    subscription_data: {
      ...(trialDays ? { trial_period_days: trialDays } : {}),
      metadata: { supabase_user_id: user.id, plan: tier },
    },
    metadata: { supabase_user_id: user.id, plan: tier },
  })

  return apiSuccess({ url: session.url })
}
