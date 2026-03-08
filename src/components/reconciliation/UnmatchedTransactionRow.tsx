'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import type { BankTransaction } from '@/types'
import CandidateReceiptsDrawer from './CandidateReceiptsDrawer'

interface UnmatchedTransactionRowProps {
  transaction: BankTransaction
  onMatched: () => void
}

export default function UnmatchedTransactionRow({
  transaction,
  onMatched,
}: UnmatchedTransactionRowProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <div
        className="flex items-center justify-between rounded-xl p-3 transition-colors"
        style={{
          background: 'rgba(245,166,35,0.04)',
          border: '1px solid rgba(245,166,35,0.15)',
        }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: 'oklch(0.82 0.02 259)' }}>{transaction.description}</p>
          <p className="text-xs mt-0.5 nums" style={{ color: 'oklch(0.55 0.04 262)' }}>
            {transaction.transaction_date} · ${Math.abs(transaction.amount).toFixed(2)}
            {transaction.card_last4 ? ` · ••${transaction.card_last4}` : ''}
          </p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 transition-colors"
          style={{
            background: 'oklch(1 0 0 / 5%)',
            border: '1px solid oklch(1 0 0 / 8%)',
            color: 'oklch(0.65 0.04 262)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(39,197,245,0.08)'
            e.currentTarget.style.color = '#27C5F5'
            e.currentTarget.style.borderColor = 'rgba(39,197,245,0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'oklch(1 0 0 / 5%)'
            e.currentTarget.style.color = 'oklch(0.65 0.04 262)'
            e.currentTarget.style.borderColor = 'oklch(1 0 0 / 8%)'
          }}
        >
          <Search className="h-3 w-3" />
          Find Match
        </button>
      </div>

      <CandidateReceiptsDrawer
        transaction={transaction}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onMatched={onMatched}
      />
    </>
  )
}
