'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BankTransaction } from '@/types'
import type { TransactionFilterValues } from '@/components/statements/TransactionFilters'
import StatementUploadZone from '@/components/statements/StatementUploadZone'
import TransactionFilters from '@/components/statements/TransactionFilters'
import TransactionTable from '@/components/statements/TransactionTable'

export default function StatementsPage() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<TransactionFilterValues>({
    card_last4: '',
    date_from: '',
    date_to: '',
    amount_min: '',
    amount_max: '',
  })

  const fetchTransactions = useCallback(async (f: TransactionFilterValues) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (f.card_last4) params.set('card_last4', f.card_last4)
    if (f.date_from) params.set('date_from', f.date_from)
    if (f.date_to) params.set('date_to', f.date_to)
    if (f.amount_min) params.set('amount_min', f.amount_min)
    if (f.amount_max) params.set('amount_max', f.amount_max)
    const res = await fetch(`/api/transactions?${params.toString()}`)
    if (res.ok) {
      const data = await res.json()
      setTransactions(data.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTransactions(filters)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (f: TransactionFilterValues) => {
    setFilters(f)
    fetchTransactions(f)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Bank Statements</h2>
        <p className="text-muted-foreground mt-1">
          Import bank statements and view extracted transactions.
        </p>
      </div>
      <StatementUploadZone />
      <TransactionFilters onChange={handleFilterChange} />
      <TransactionTable
        transactions={transactions}
        loading={loading}
        onDelete={(id) => setTransactions((prev) => prev.filter((tx) => tx.id !== id))}
        onUpdate={(tx) =>
          setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)))
        }
      />
    </div>
  )
}
