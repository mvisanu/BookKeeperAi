'use client'

import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
    <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
      <div className="flex gap-3">
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          {matchedCount} matched
        </Badge>
        <Badge variant="outline" className="text-yellow-700 border-yellow-400">
          {unmatchedTransactions} unmatched transactions
        </Badge>
        <Badge variant="outline">
          {unmatchedReceipts} unmatched receipts
        </Badge>
      </div>
      <div className="ml-auto flex gap-2">
        <Button onClick={runAutoMatch} disabled={running} size="sm" className="gap-1.5">
          <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Matching…' : 'Run Auto-Match'}
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  )
}
