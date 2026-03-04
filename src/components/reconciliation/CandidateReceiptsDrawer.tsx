'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { BankTransaction, Receipt } from '@/types'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface CandidateReceiptsDrawerProps {
  transaction: BankTransaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMatched: () => void
}

export default function CandidateReceiptsDrawer({
  transaction,
  open,
  onOpenChange,
  onMatched,
}: CandidateReceiptsDrawerProps) {
  const [candidates, setCandidates] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !transaction) return
    setLoading(true)
    fetch('/api/receipts?status=complete&limit=200')
      .then((r) => r.json())
      .then((data) => {
        // Sort by proximity to transaction
        const sorted = (data.data as Receipt[])
          .filter((r) => !r.is_matched && r.total_amount !== null && r.transaction_date !== null)
          .sort((a, b) => {
            const amountDiffA = Math.abs(Math.abs(transaction.amount) - (a.total_amount ?? 0))
            const amountDiffB = Math.abs(Math.abs(transaction.amount) - (b.total_amount ?? 0))
            return amountDiffA - amountDiffB
          })
        setCandidates(sorted.slice(0, 10))
      })
      .finally(() => setLoading(false))
  }, [open, transaction])

  const handleMatch = async (receipt: Receipt) => {
    if (!transaction) return
    const res = await fetch('/api/reconciliation/manual-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bank_transaction_id: transaction.id,
        receipt_id: receipt.id,
      }),
    })
    if (res.ok) {
      toast.success('Match created')
      onMatched()
      onOpenChange(false)
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Match failed')
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Find a Receipt Match</DrawerTitle>
          {transaction && (
            <p className="text-sm text-muted-foreground">
              Matching: {transaction.description} · ${Math.abs(transaction.amount).toFixed(2)} on{' '}
              {transaction.transaction_date}
            </p>
          )}
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-2 max-h-[60vh] overflow-auto">
          {loading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          {!loading && candidates.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No unmatched receipts found.</p>
          )}
          {candidates.map((receipt) => (
            <div
              key={receipt.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="text-sm font-medium">{receipt.vendor_name ?? 'Unknown vendor'}</p>
                <p className="text-xs text-muted-foreground">
                  {receipt.transaction_date} · ${receipt.total_amount?.toFixed(2) ?? '—'}
                  {receipt.category ? ` · ${receipt.category}` : ''}
                </p>
              </div>
              <Button size="sm" onClick={() => handleMatch(receipt)}>
                Match
              </Button>
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
