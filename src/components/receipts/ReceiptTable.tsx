'use client'

import { useEffect, useState, useCallback } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Receipt } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ReceiptStatusBadge from './ReceiptStatusBadge'
import ReceiptEditSheet from './ReceiptEditSheet'
import ReceiptDeleteConfirm from './ReceiptDeleteConfirm'

interface ReceiptTableProps {
  initialReceipts: Receipt[]
}

export default function ReceiptTable({ initialReceipts }: ReceiptTableProps) {
  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts)
  const [loading] = useState(false)
  const [editReceipt, setEditReceipt] = useState<Receipt | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteFileName, setDeleteFileName] = useState('')

  const handleRetry = useCallback(async (id: string) => {
    await fetch(`/api/receipts/${id}/retry`, { method: 'POST' })
  }, [])

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('receipts-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'receipts' },
        (payload) => {
          setReceipts((prev) =>
            prev.map((r) =>
              r.id === payload.new.id
                ? { ...r, ...(payload.new as Partial<Receipt>) }
                : r
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (receipts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">No receipts yet. Upload your first receipt above.</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">GST/HST</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((receipt) => (
              <TableRow key={receipt.id}>
                <TableCell>
                  <ReceiptStatusBadge
                    status={receipt.status}
                    onRetry={() => handleRetry(receipt.id)}
                  />
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-sm">
                  {receipt.file_name}
                </TableCell>
                <TableCell>{receipt.vendor_name ?? '—'}</TableCell>
                <TableCell>{receipt.transaction_date ?? '—'}</TableCell>
                <TableCell className="text-right">
                  {receipt.total_amount != null
                    ? `$${receipt.total_amount.toFixed(2)}`
                    : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {receipt.gst_hst_amount != null
                    ? `$${receipt.gst_hst_amount.toFixed(2)}`
                    : '—'}
                </TableCell>
                <TableCell>{receipt.category ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditReceipt(receipt)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeleteId(receipt.id)
                        setDeleteFileName(receipt.file_name)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ReceiptEditSheet
        receipt={editReceipt}
        open={!!editReceipt}
        onOpenChange={(o) => !o && setEditReceipt(null)}
        onSave={(updated) =>
          setReceipts((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
        }
      />

      <ReceiptDeleteConfirm
        receiptId={deleteId}
        fileName={deleteFileName}
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onDeleted={(id) => setReceipts((prev) => prev.filter((r) => r.id !== id))}
      />
    </>
  )
}
