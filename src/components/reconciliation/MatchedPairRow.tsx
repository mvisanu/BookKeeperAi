'use client'

import { toast } from 'sonner'
import { Unlink } from 'lucide-react'
import type { ReconciliationMatch, BankTransaction, Receipt } from '@/types'

interface MatchedPairRowProps {
  match: ReconciliationMatch & {
    transaction: BankTransaction
    receipt: Receipt
  }
  onUnlinked: (matchId: string) => void
}

export default function MatchedPairRow({ match, onUnlinked }: MatchedPairRowProps) {
  const unlink = async () => {
    const res = await fetch(`/api/reconciliation/matches/${match.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Match unlinked')
      onUnlinked(match.id)
    } else {
      toast.error('Failed to unlink match')
    }
  }

  const confidence = Math.round(match.confidence_score * 100)
  const isHighConfidence = match.confidence_score >= 0.9

  return (
    <div
      className="flex items-center gap-4 rounded-xl p-3 transition-colors"
      style={{
        background: 'rgba(16,217,161,0.04)',
        border: '1px solid rgba(16,217,161,0.15)',
      }}
    >
      <div className="flex-1 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'oklch(0.45 0.04 262)' }}>Transaction</p>
          <p className="text-sm font-medium" style={{ color: 'oklch(0.82 0.02 259)' }}>{match.transaction.description}</p>
          <p className="text-xs mt-0.5 nums" style={{ color: 'oklch(0.55 0.04 262)' }}>
            {match.transaction.transaction_date} · ${Math.abs(match.transaction.amount).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'oklch(0.45 0.04 262)' }}>Receipt</p>
          <p className="text-sm font-medium" style={{ color: 'oklch(0.82 0.02 259)' }}>{match.receipt.vendor_name ?? 'Unknown vendor'}</p>
          <p className="text-xs mt-0.5 nums" style={{ color: 'oklch(0.55 0.04 262)' }}>
            {match.receipt.transaction_date} · ${match.receipt.total_amount?.toFixed(2) ?? '—'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{
            background: isHighConfidence ? 'rgba(16,217,161,0.12)' : 'rgba(245,166,35,0.12)',
            color: isHighConfidence ? '#10D9A1' : '#F5A623',
          }}
        >
          {confidence}%
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize"
          style={{ background: 'oklch(1 0 0 / 6%)', color: 'oklch(0.55 0.04 262)' }}
        >
          {match.match_type}
        </span>
        <button
          onClick={unlink}
          className="rounded-md p-1.5 transition-colors"
          style={{ color: 'oklch(0.48 0.04 262)' }}
          title="Unlink"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,71,87,0.1)'
            e.currentTarget.style.color = '#FF4757'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = ''
            e.currentTarget.style.color = 'oklch(0.48 0.04 262)'
          }}
        >
          <Unlink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
