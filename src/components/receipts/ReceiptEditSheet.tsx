'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { Receipt } from '@/types'
import { UpdateReceiptSchema, type UpdateReceiptInput } from '@/types'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ReceiptEditSheetProps {
  receipt: Receipt | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updated: Receipt) => void
}

export default function ReceiptEditSheet({
  receipt,
  open,
  onOpenChange,
  onSave,
}: ReceiptEditSheetProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateReceiptInput>({
    resolver: zodResolver(UpdateReceiptSchema),
    values: receipt
      ? {
          vendor_name: receipt.vendor_name ?? undefined,
          transaction_date: receipt.transaction_date ?? undefined,
          total_amount: receipt.total_amount ?? undefined,
          subtotal_amount: receipt.subtotal_amount ?? undefined,
          gst_hst_amount: receipt.gst_hst_amount ?? undefined,
          pst_amount: receipt.pst_amount ?? undefined,
          payment_method: receipt.payment_method ?? undefined,
          card_last4: receipt.card_last4 ?? undefined,
          category: receipt.category ?? undefined,
          expense_type: receipt.expense_type ?? undefined,
          location: receipt.location ?? undefined,
          receipt_number: receipt.receipt_number ?? undefined,
          notes: receipt.notes ?? undefined,
        }
      : undefined,
  })

  const onSubmit = async (values: UpdateReceiptInput) => {
    if (!receipt) return
    const response = await fetch(`/api/receipts/${receipt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!response.ok) {
      const err = await response.json()
      toast.error(err.error ?? 'Failed to save receipt')
      return
    }
    const updated = await response.json()
    toast.success('Receipt saved')
    onSave(updated)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] overflow-auto">
        <SheetHeader>
          <SheetTitle>Edit Receipt</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Vendor</Label>
              <Input {...register('vendor_name')} placeholder="Vendor name" />
              {errors.vendor_name && (
                <p className="text-xs text-destructive">{errors.vendor_name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" {...register('transaction_date')} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Input {...register('category')} placeholder="e.g. Meals" />
            </div>
            <div className="space-y-1">
              <Label>Total</Label>
              <Input
                type="number"
                step="0.01"
                {...register('total_amount', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label>Subtotal</Label>
              <Input
                type="number"
                step="0.01"
                {...register('subtotal_amount', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label>GST/HST</Label>
              <Input
                type="number"
                step="0.01"
                {...register('gst_hst_amount', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label>PST</Label>
              <Input
                type="number"
                step="0.01"
                {...register('pst_amount', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label>Payment Method</Label>
              <Input {...register('payment_method')} placeholder="Visa, Debit, etc." />
            </div>
            <div className="space-y-1">
              <Label>Card Last 4</Label>
              <Input {...register('card_last4')} placeholder="1234" maxLength={4} />
              {errors.card_last4 && (
                <p className="text-xs text-destructive">{errors.card_last4.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Expense Type</Label>
              <Select
                defaultValue={receipt?.expense_type ?? undefined}
                onValueChange={(v) => setValue('expense_type', v as 'business' | 'personal')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Receipt Number</Label>
              <Input {...register('receipt_number')} placeholder="#12345" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Location</Label>
              <Input {...register('location')} placeholder="Store address or city" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Notes</Label>
              <Input {...register('notes')} placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
