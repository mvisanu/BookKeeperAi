'use client'

import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface ReconciliationSummaryBarProps {
  matchedCount: number
  unmatchedTransactions: number
  unmatchedReceipts: number
  onMatchRun: () => void
}

export default function ReconciliationSummaryBar({
  matchedCount,
  unmatchedTransactions,
  unmatchedReceipts,
  onMatchRun,
}: ReconciliationSummaryBarProps) {
  const [running, setRunning] = useState(false)

  const runAutoMatch = async () => {
    setRunning(true)
    try {
      const res = await fetch('/api/run-matching', { method: 'POST' })
      if (!res.ok) throw new Error('Auto-match failed')
      const data = await res.json()
      toast.success(`Matched ${data.matched_count} pair${data.matched_count !== 1 ? 's' : ''}`)
      onMatchRun()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Auto-match failed')
    } finally {
      setRunning(false)
    }
  }

  const exportCsv = () => {
    window.location.href = '/api/reconciliation/export'
  }

  return (
    <div
      className="flex flex-wrap items-center gap-4 rounded-xl px-5 py-4"
      style={{
        background: 'linear-gradient(180deg, oklch(0.15 0.04 268) 0%, oklch(0.12 0.04 268) 100%)',
        border: '1px solid oklch(1 0 0 / 7%)',
      }}
    >
      <div className="flex flex-wrap gap-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{ background: 'rgba(16,217,161,0.12)', color: '#10D9A1' }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#10D9A1', boxShadow: '0 0 4px #10D9A1' }} />
          {matchedCount} matched
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{ background: 'rgba(245,166,35,0.12)', color: '#F5A623' }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#F5A623' }} />
          {unmatchedTransactions} unmatched tx
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{ background: 'oklch(1 0 0 / 6%)', color: 'oklch(0.55 0.04 262)' }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'oklch(0.45 0.04 262)' }} />
          {unmatchedReceipts} unmatched receipts
        </span>
      </div>
      <div className="ml-auto flex gap-2">
        <button
          onClick={runAutoMatch}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all duration-150"
          style={{
            background: 'linear-gradient(135deg, #27C5F5, #5EB5FF)',
            color: 'oklch(0.09 0.04 270)',
            boxShadow: running ? 'none' : '0 0 16px rgba(39,197,245,0.3)',
            opacity: running ? 0.6 : 1,
          }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Matching…' : 'Run Auto-Match'}
        </button>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
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
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>
    </div>
  )
}
