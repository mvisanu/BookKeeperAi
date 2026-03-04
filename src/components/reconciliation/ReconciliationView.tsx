'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ReconciliationMatch, BankTransaction, Receipt } from '@/types'
import ReconciliationSummaryBar from './ReconciliationSummaryBar'
import MatchedPairRow from './MatchedPairRow'
import UnmatchedTransactionRow from './UnmatchedTransactionRow'
import UnmatchedReceiptRow from './UnmatchedReceiptRow'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

type FullMatch = ReconciliationMatch & {
  transaction: BankTransaction
  receipt: Receipt
}

export default function ReconciliationView() {
  const [matches, setMatches] = useState<FullMatch[]>([])
  const [unmatchedTx, setUnmatchedTx] = useState<BankTransaction[]>([])
  const [unmatchedReceipts, setUnmatchedReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [txRes, receiptRes] = await Promise.all([
      fetch('/api/transactions?unmatched_only=false&limit=500'),
      fetch('/api/receipts?limit=200'),
    ])

    const txData = txRes.ok ? (await txRes.json()).data as BankTransaction[] : []
    const receiptData = receiptRes.ok ? (await receiptRes.json()).data as Receipt[] : []

    setUnmatchedTx(txData.filter((t) => !t.is_matched && !t.is_duplicate))
    setUnmatchedReceipts(receiptData.filter((r) => !r.is_matched && r.status === 'complete'))

    // Fetch actual match records
    const matchesRes = await fetch('/api/reconciliation/matches-list').catch(() => null)
    if (matchesRes && matchesRes.ok) {
      const matchData = await matchesRes.json()
      setMatches(matchData.data ?? [])
    } else {
      // Fallback: no match details, just show counts
      setMatches([])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ReconciliationSummaryBar
        matchedCount={matches.length}
        unmatchedTransactions={unmatchedTx.length}
        unmatchedReceipts={unmatchedReceipts.length}
        onMatchRun={fetchData}
      />

      {matches.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-green-700">
            Matched Pairs ({matches.length})
          </h3>
          <div className="space-y-2">
            {matches.map((m) => (
              <MatchedPairRow
                key={m.id}
                match={m}
                onUnlinked={(id) => {
                  setMatches((prev) => prev.filter((x) => x.id !== id))
                  fetchData()
                }}
              />
            ))}
          </div>
        </section>
      )}

      {unmatchedTx.length > 0 && (
        <>
          {matches.length > 0 && <Separator />}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-yellow-700">
              Unmatched Transactions ({unmatchedTx.length})
            </h3>
            <div className="space-y-2">
              {unmatchedTx.map((tx) => (
                <UnmatchedTransactionRow key={tx.id} transaction={tx} onMatched={fetchData} />
              ))}
            </div>
          </section>
        </>
      )}

      {unmatchedReceipts.length > 0 && (
        <>
          {(matches.length > 0 || unmatchedTx.length > 0) && <Separator />}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              Unmatched Receipts ({unmatchedReceipts.length})
            </h3>
            <div className="space-y-2">
              {unmatchedReceipts.map((r) => (
                <UnmatchedReceiptRow key={r.id} receipt={r} />
              ))}
            </div>
          </section>
        </>
      )}

      {matches.length === 0 && unmatchedTx.length === 0 && unmatchedReceipts.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-lg font-medium">No data yet</p>
          <p className="mt-1 text-sm">
            Import bank statements and upload receipts to start reconciling.
          </p>
        </div>
      )}
    </div>
  )
}
