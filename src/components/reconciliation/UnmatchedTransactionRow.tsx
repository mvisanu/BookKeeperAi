'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import type { BankTransaction } from '@/types'
import { Button } from '@/components/ui/button'
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
      <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-3">
        <div>
          <p className="text-sm font-medium">{transaction.description}</p>
          <p className="text-xs text-muted-foreground">
            {transaction.transaction_date} · ${Math.abs(transaction.amount).toFixed(2)}
            {transaction.card_last4 ? ` · ••${transaction.card_last4}` : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setDrawerOpen(true)}
        >
          <Search className="h-3 w-3" />
          Find Match
        </Button>
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
