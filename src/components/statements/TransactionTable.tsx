'use client'

import { useState } from 'react'
import { Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { BankTransaction } from '@/types'

interface TransactionTableProps {
  transactions: BankTransaction[]
  loading?: boolean
  onDelete: (id: string) => void
  onUpdate: (tx: BankTransaction) => void
}

const TH = ({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) => (
  <th
    className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
    style={{ color: 'oklch(0.45 0.04 262)', textAlign: align }}
  >
    {children}
  </th>
)

export default function TransactionTable({
  transactions,
  loading,
  onDelete,
  onUpdate,
}: TransactionTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCategory, setEditCategory] = useState('')

  const startEdit = (tx: BankTransaction) => {
    setEditingId(tx.id)
    setEditCategory(tx.category ?? '')
  }

  const saveEdit = async (tx: BankTransaction) => {
    const res = await fetch(`/api/transactions/${tx.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: editCategory }),
    })
    if (res.ok) {
      const updated = await res.json()
      onUpdate(updated)
    } else {
      toast.error('Failed to save category')
    }
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      onDelete(id)
    } else {
      toast.error('Failed to delete transaction')
    }
  }

  if (loading) {
    return (
      <div className="card-premium rounded-xl overflow-hidden">
        <div className="space-y-0">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="px-5 py-4 animate-pulse"
              style={{ borderBottom: i < 4 ? '1px solid oklch(1 0 0 / 5%)' : 'none' }}
            >
              <div className="h-4 rounded-md w-3/4" style={{ background: 'oklch(1 0 0 / 6%)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl py-16 text-center"
        style={{ background: 'oklch(1 0 0 / 2%)', border: '1px dashed oklch(1 0 0 / 10%)' }}
      >
        <p className="text-sm" style={{ color: 'oklch(0.45 0.04 262)' }}>
          No transactions match your filters.
        </p>
      </div>
    )
  }

  return (
    <div className="card-premium rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
              <TH>Date</TH>
              <TH>Description</TH>
              <TH align="right">Amount</TH>
              <TH>Category</TH>
              <TH>Card</TH>
              <TH>Status</TH>
              <TH align="right">Actions</TH>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <tr
                key={tx.id}
                className="transition-colors"
                style={{
                  borderBottom: i < transactions.length - 1 ? '1px solid oklch(1 0 0 / 5%)' : 'none',
                  opacity: tx.is_duplicate ? 0.5 : 1,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'oklch(1 0 0 / 3%)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <td className="px-5 py-3 text-sm nums whitespace-nowrap" style={{ color: 'oklch(0.65 0.04 262)' }}>
                  {tx.transaction_date}
                </td>
                <td className="px-5 py-3 text-sm" style={{ maxWidth: '240px' }}>
                  <span className="block truncate" style={{ color: 'oklch(0.82 0.02 259)' }}>
                    {tx.description}
                  </span>
                </td>
                <td className="px-5 py-3 text-right nums font-semibold">
                  <span style={{ color: tx.amount < 0 ? '#FF4757' : '#10D9A1' }}>
                    {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {editingId === tx.id ? (
                    <input
                      autoFocus
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      onBlur={() => saveEdit(tx)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(tx)}
                      className="rounded-md text-sm px-2 py-1"
                      style={{
                        width: '8rem',
                        background: 'oklch(1 0 0 / 5%)',
                        border: '1px solid rgba(39,197,245,0.4)',
                        color: 'oklch(0.82 0.02 259)',
                        outline: 'none',
                      }}
                    />
                  ) : tx.category ? (
                    <span
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium cursor-pointer"
                      style={{ background: 'rgba(39,197,245,0.08)', color: '#27C5F5' }}
                      onClick={() => startEdit(tx)}
                    >
                      {tx.category}
                    </span>
                  ) : (
                    <button
                      className="inline-flex items-center gap-1 text-xs rounded-md px-2 py-0.5 transition-colors"
                      style={{ color: 'oklch(0.42 0.04 262)' }}
                      onClick={() => startEdit(tx)}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#27C5F5' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'oklch(0.42 0.04 262)' }}
                    >
                      <Pencil className="h-3 w-3" />
                      Add…
                    </button>
                  )}
                </td>
                <td className="px-5 py-3 text-sm nums" style={{ color: 'oklch(0.65 0.04 262)' }}>
                  {tx.card_last4 ? `••${tx.card_last4}` : <span style={{ color: 'oklch(0.38 0.04 262)' }}>—</span>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1.5">
                    {tx.is_duplicate && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: 'rgba(245,166,35,0.12)', color: '#F5A623' }}
                      >
                        <span className="h-1 w-1 rounded-full" style={{ background: '#F5A623' }} />
                        Duplicate
                      </span>
                    )}
                    {tx.is_matched && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: 'rgba(16,217,161,0.12)', color: '#10D9A1' }}
                      >
                        <span className="h-1 w-1 rounded-full" style={{ background: '#10D9A1' }} />
                        Matched
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="rounded-md p-1.5 transition-colors"
                      style={{ color: 'oklch(0.48 0.04 262)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,71,87,0.1)'
                        e.currentTarget.style.color = '#FF4757'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = ''
                        e.currentTarget.style.color = 'oklch(0.48 0.04 262)'
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
