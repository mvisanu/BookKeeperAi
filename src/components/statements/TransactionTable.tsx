'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { BankTransaction } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

interface TransactionTableProps {
  transactions: BankTransaction[]
  loading?: boolean
  onDelete: (id: string) => void
  onUpdate: (tx: BankTransaction) => void
}

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
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">No transactions match your filters.</p>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Card</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id} className={tx.is_duplicate ? 'opacity-50' : undefined}>
              <TableCell className="whitespace-nowrap text-sm">{tx.transaction_date}</TableCell>
              <TableCell className="max-w-[240px] truncate text-sm">{tx.description}</TableCell>
              <TableCell
                className={`text-right text-sm font-mono ${
                  tx.amount < 0 ? 'text-destructive' : 'text-green-600'
                }`}
              >
                {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
              </TableCell>
              <TableCell>
                {editingId === tx.id ? (
                  <Input
                    className="h-7 w-32 text-sm"
                    autoFocus
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    onBlur={() => saveEdit(tx)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(tx)}
                  />
                ) : (
                  <span
                    className="cursor-pointer text-sm underline-offset-2 hover:underline"
                    onClick={() => startEdit(tx)}
                  >
                    {tx.category ?? <span className="text-muted-foreground">Add…</span>}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm">{tx.card_last4 ? `••${tx.card_last4}` : '—'}</TableCell>
              <TableCell>
                {tx.is_duplicate && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-400">
                    Duplicate
                  </Badge>
                )}
                {tx.is_matched && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    Matched
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(tx.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
