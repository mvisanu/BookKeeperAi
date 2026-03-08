'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Zap, Crown, Sparkles, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanConfig, PlanTier } from '@/lib/stripe'

interface BillingPageClientProps {
  currentTier: PlanTier
  hasSubscription: boolean
  plans: PlanConfig[]
}

const PLAN_ICONS: Record<PlanTier, typeof Zap> = {
  free: Sparkles,
  solo: Zap,
  pro: Crown,
}

const PLAN_ACCENT: Record<PlanTier, { color: string; glow: string; bg: string }> = {
  free: { color: 'oklch(0.65 0.04 262)', glow: 'transparent', bg: 'oklch(1 0 0 / 5%)' },
  solo: { color: '#27C5F5', glow: 'rgba(39,197,245,0.2)', bg: 'rgba(39,197,245,0.06)' },
  pro:  { color: '#a78bfa', glow: 'rgba(167,139,250,0.25)', bg: 'rgba(167,139,250,0.07)' },
}

export function BillingPageClient({ currentTier, hasSubscription, plans }: BillingPageClientProps) {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<PlanTier | 'portal' | null>(null)

  const successMessage = searchParams.get('success') === 'true'
  const canceledMessage = searchParams.get('canceled') === 'true'

  async function handleUpgrade(tier: PlanTier) {
    setLoading(tier)
    try {
      const isTrialEligible = tier === 'pro' && !hasSubscription
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          ...(isTrialEligible ? { trial_period_days: 14 } : {}),
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(null)
    }
  }

  async function handleManage() {
    setLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(null)
    }
  }

  const mutedText = { color: 'oklch(0.48 0.04 262)' }

  return (
    <div className="p-6 space-y-7 max-w-5xl animate-page-enter">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'oklch(0.93 0.02 259)' }}>
          Billing & Plans
        </h2>
        <p className="text-sm mt-0.5" style={mutedText}>
          Choose the plan that fits your bookkeeping needs.
        </p>
      </div>

      {/* Status banners */}
      {successMessage && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
          style={{ background: 'rgba(16,217,161,0.1)', border: '1px solid rgba(16,217,161,0.2)', color: '#10D9A1' }}
        >
          <Check className="h-4 w-4 shrink-0" />
          Subscription activated! Your plan has been upgraded.
        </div>
      )}
      {canceledMessage && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium"
          style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', color: '#F5A623' }}
        >
          Checkout was canceled — your plan was not changed.
        </div>
      )}

      {/* Current plan + manage */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={mutedText}>Current plan:</span>
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold capitalize"
            style={{
              background: PLAN_ACCENT[currentTier].bg,
              color: PLAN_ACCENT[currentTier].color,
              border: `1px solid ${PLAN_ACCENT[currentTier].glow}`,
            }}
          >
            {currentTier}
          </span>
        </div>
        {hasSubscription && (
          <button
            onClick={handleManage}
            disabled={loading === 'portal'}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: 'oklch(1 0 0 / 5%)',
              border: '1px solid oklch(1 0 0 / 8%)',
              color: 'oklch(0.65 0.04 262)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(39,197,245,0.08)'
              e.currentTarget.style.color = '#27C5F5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'oklch(1 0 0 / 5%)'
              e.currentTarget.style.color = 'oklch(0.65 0.04 262)'
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {loading === 'portal' ? 'Loading…' : 'Manage billing'}
          </button>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        {plans.map((plan) => {
          const Icon = PLAN_ICONS[plan.tier]
          const accent = PLAN_ACCENT[plan.tier]
          const isCurrent = plan.tier === currentTier
          const isPro = plan.tier === 'pro'

          return (
            <div
              key={plan.tier}
              className="relative flex flex-col rounded-xl overflow-hidden transition-all duration-200"
              style={{
                background: 'linear-gradient(180deg, oklch(0.15 0.04 268) 0%, oklch(0.12 0.04 268) 100%)',
                border: isPro ? `1px solid rgba(167,139,250,0.3)` : '1px solid oklch(1 0 0 / 7%)',
                boxShadow: isPro ? `0 0 32px rgba(167,139,250,0.12)` : 'none',
              }}
            >
              {/* Top accent line */}
              {(isPro || isCurrent) && (
                <div
                  className="h-[2px] w-full"
                  style={{
                    background: isPro
                      ? 'linear-gradient(90deg, #a78bfa, #c4b5fd)'
                      : `linear-gradient(90deg, ${accent.color}, transparent)`,
                  }}
                />
              )}

              {isPro && (
                <div className="absolute top-4 right-4">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                    style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}
                  >
                    Popular
                  </span>
                </div>
              )}

              <div className="p-6 flex flex-col flex-1">
                {/* Icon + name */}
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: accent.bg }}
                  >
                    <Icon className="h-4 w-4" style={{ color: accent.color }} />
                  </div>
                  <h3 className="text-base font-bold" style={{ color: 'oklch(0.88 0.02 259)' }}>{plan.name}</h3>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold nums" style={{ color: 'oklch(0.93 0.02 259)' }}>
                      {plan.monthlyPriceCad === 0 ? 'Free' : `$${plan.monthlyPriceCad / 100}`}
                    </span>
                    {plan.monthlyPriceCad > 0 && (
                      <span className="mb-1 text-sm" style={mutedText}>/mo CAD</span>
                    )}
                  </div>
                  <p className="text-xs mt-1" style={mutedText}>{plan.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: accent.color }} />
                      <span style={{ color: 'oklch(0.68 0.04 262)' }}>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div
                    className="w-full rounded-lg py-2.5 text-center text-sm font-semibold"
                    style={{
                      background: 'oklch(1 0 0 / 4%)',
                      color: 'oklch(0.45 0.04 262)',
                      border: '1px solid oklch(1 0 0 / 7%)',
                    }}
                  >
                    Current plan
                  </div>
                ) : plan.tier === 'free' ? (
                  <div
                    className="w-full rounded-lg py-2.5 text-center text-sm font-semibold"
                    style={{
                      background: 'oklch(1 0 0 / 3%)',
                      color: 'oklch(0.42 0.04 262)',
                      border: '1px solid oklch(1 0 0 / 5%)',
                    }}
                  >
                    Downgrade via portal
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.tier)}
                    disabled={loading === plan.tier}
                    className={cn(
                      'w-full rounded-lg py-2.5 text-sm font-bold transition-all duration-150',
                      loading === plan.tier && 'opacity-60'
                    )}
                    style={{
                      background: isPro
                        ? 'linear-gradient(135deg, #a78bfa, #c4b5fd)'
                        : `linear-gradient(135deg, #27C5F5, #5EB5FF)`,
                      color: isPro ? '#1a0a2e' : 'oklch(0.09 0.04 270)',
                      boxShadow: isPro
                        ? '0 0 20px rgba(167,139,250,0.35)'
                        : '0 0 20px rgba(39,197,245,0.35)',
                    }}
                  >
                    {loading === plan.tier
                      ? 'Redirecting…'
                      : isPro && !hasSubscription
                        ? 'Start 14-day free trial'
                        : `Upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <p className="text-xs" style={mutedText}>
        All prices in Canadian dollars (CAD). Monthly billing. Cancel anytime via the billing portal.
        Payments processed securely by Stripe.
      </p>
    </div>
  )
}
