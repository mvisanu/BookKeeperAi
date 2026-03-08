'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { BankTransaction, Receipt } from '@/types'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

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
          <DrawerTitle style={{ color: 'oklch(0.93 0.02 259)' }}>Find a Receipt Match</DrawerTitle>
          {transaction && (
            <p className="text-sm mt-0.5" style={{ color: 'oklch(0.55 0.04 262)' }}>
              Matching: {transaction.description} · ${Math.abs(transaction.amount).toFixed(2)} on{' '}
              {transaction.transaction_date}
            </p>
          )}
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-2 max-h-[60vh] overflow-auto">
          {loading && [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 w-full rounded-xl animate-pulse"
              style={{ background: 'oklch(1 0 0 / 4%)' }}
            />
          ))}
          {!loading && candidates.length === 0 && (
            <div
              className="flex items-center justify-center rounded-xl py-10 text-center"
              style={{ background: 'oklch(1 0 0 / 2%)', border: '1px dashed oklch(1 0 0 / 10%)' }}
            >
              <p className="text-sm" style={{ color: 'oklch(0.45 0.04 262)' }}>No unmatched receipts found.</p>
            </div>
          )}
          {candidates.map((receipt) => (
            <div
              key={receipt.id}
              className="flex items-center justify-between rounded-xl p-3 transition-colors"
              style={{
                background: 'oklch(1 0 0 / 3%)',
                border: '1px solid oklch(1 0 0 / 7%)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'oklch(1 0 0 / 5%)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'oklch(1 0 0 / 3%)')}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: 'oklch(0.82 0.02 259)' }}>
                  {receipt.vendor_name ?? 'Unknown vendor'}
                </p>
                <p className="text-xs mt-0.5 nums" style={{ color: 'oklch(0.55 0.04 262)' }}>
                  {receipt.transaction_date} · ${receipt.total_amount?.toFixed(2) ?? '—'}
                  {receipt.category ? ` · ${receipt.category}` : ''}
                </p>
              </div>
              <button
                onClick={() => handleMatch(receipt)}
                className="rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-150 shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #27C5F5, #5EB5FF)',
                  color: 'oklch(0.09 0.04 270)',
                  boxShadow: '0 0 12px rgba(39,197,245,0.25)',
                }}
              >
                Match
              </button>
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
