import { NextRequest, NextResponse } from 'next/server'
import { stripe, getPlanByPriceId, type PlanTier } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

// Use service-role client — webhook runs outside user session
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const supabase = getAdminClient()
  const userId = subscription.metadata?.supabase_user_id
  if (!userId) return

  const priceId = subscription.items.data[0]?.price?.id ?? ''
  const tier: PlanTier = getPlanByPriceId(priceId) ?? 'free'

  const isActive = ['active', 'trialing'].includes(subscription.status)
  const expiresAt = isActive
    ? new Date((subscription as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000).toISOString()
    : null

  await supabase
    .from('profiles')
    .update({
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      plan: isActive ? tier : 'free',
      plan_expires_at: expiresAt,
    })
    .eq('id', userId)
}

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await syncSubscription(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (userId) {
          const supabase = getAdminClient()
          await supabase
            .from('profiles')
            .update({
              stripe_subscription_id: null,
              stripe_price_id: null,
              plan: 'free',
              plan_expires_at: null,
            })
            .eq('id', userId)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string }
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription)
          await syncSubscription(sub)
        }
        break
      }

      case 'invoice.payment_failed': {
        // Leave plan active until subscription.deleted fires after retries exhausted
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error handling ${event.type}:`, err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
