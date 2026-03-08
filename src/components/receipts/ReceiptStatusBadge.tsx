'use client'

import { Loader2, RotateCcw } from 'lucide-react'

interface ReceiptStatusBadgeProps {
  status: 'pending' | 'processing' | 'complete' | 'failed'
  onRetry?: () => void
}

export default function ReceiptStatusBadge({ status, onRetry }: ReceiptStatusBadgeProps) {
  if (status === 'pending') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ background: 'oklch(1 0 0 / 6%)', color: 'oklch(0.55 0.04 262)' }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'oklch(0.45 0.04 262)' }} />
        Pending
      </span>
    )
  }

  if (status === 'processing') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ background: 'rgba(245,166,35,0.12)', color: '#F5A623' }}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </span>
    )
  }

  if (status === 'complete') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ background: 'rgba(16,217,161,0.12)', color: '#10D9A1' }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#10D9A1', boxShadow: '0 0 4px #10D9A1' }} />
        Complete
      </span>
    )
  }

  // failed
  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ background: 'rgba(255,71,87,0.12)', color: '#FF4757' }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#FF4757' }} />
        Failed
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors"
          style={{ background: 'oklch(1 0 0 / 5%)', color: 'oklch(0.55 0.04 262)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(39,197,245,0.1)'
            e.currentTarget.style.color = '#27C5F5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'oklch(1 0 0 / 5%)'
            e.currentTarget.style.color = 'oklch(0.55 0.04 262)'
          }}
        >
          <RotateCcw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  )
}
