'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Sparkles, Loader2 } from 'lucide-react'
import type { BankTransaction } from '@/types'
import type { TransactionFilterValues } from '@/components/statements/TransactionFilters'
import TransactionFilters from '@/components/statements/TransactionFilters'
import TransactionTable from '@/components/statements/TransactionTable'
import { Button } from '@/components/ui/button'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [categorizing, setCategorizing] = useState(false)
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

  const handleAutoCategorize = async () => {
    setCategorizing(true)
    const toastId = 'auto-categorize'
    toast.loading('Categorizing transactions with AI…', { id: toastId })

    try {
      const res = await fetch('/api/transactions/categorize', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Categorization failed', { id: toastId })
        return
      }

      if (data.categorized === 0) {
        toast.success('All transactions are already categorized', { id: toastId })
      } else {
        toast.success(`Categorized ${data.categorized} of ${data.total} transactions`, { id: toastId })
      }

      // Refresh the table
      await fetchTransactions(filters)
    } catch {
      toast.error('Categorization failed', { id: toastId })
    } finally {
      setCategorizing(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground mt-1">
            View and manage all imported bank transactions.
          </p>
        </div>
        <Button
          onClick={handleAutoCategorize}
          disabled={categorizing}
          className="shrink-0 gap-2"
          style={{ backgroundColor: '#27C5F5', color: '#fff' }}
        >
          {categorizing ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Categorizing…</>
          ) : (
            <><Sparkles className="h-4 w-4" />Auto-Categorize</>
          )}
        </Button>
      </div>
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
