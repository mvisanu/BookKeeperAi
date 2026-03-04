'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { CsvColumnDetectionResult } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const MappingFormSchema = z
  .object({
    date_col: z.string().min(1, 'Required'),
    description_col: z.string().min(1, 'Required'),
    amount_col: z.string().optional(),
    debit_col: z.string().optional(),
    credit_col: z.string().optional(),
    card_last4: z.string().regex(/^\d{4}$/, 'Must be 4 digits'),
    use_debit_credit: z.boolean(),
  })
  .refine(
    (d) =>
      d.use_debit_credit
        ? d.debit_col && d.credit_col
        : !!d.amount_col,
    'Please select the required column(s)'
  )

type MappingFormValues = z.infer<typeof MappingFormSchema>

interface CsvMappingModalProps {
  statementId: string
  detection: CsvColumnDetectionResult
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmed: () => void
}

export default function CsvMappingModal({
  statementId,
  detection,
  open,
  onOpenChange,
  onConfirmed,
}: CsvMappingModalProps) {
  const isHighConfidence = detection.confidence >= 0.85
  const [useDebitCredit, setUseDebitCredit] = useState(
    !!detection.detected_debit_col && !!detection.detected_credit_col
  )

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MappingFormValues>({
    resolver: zodResolver(MappingFormSchema),
    defaultValues: {
      date_col: detection.detected_date_col,
      description_col: detection.detected_description_col,
      amount_col: detection.detected_amount_col ?? undefined,
      debit_col: detection.detected_debit_col ?? undefined,
      credit_col: detection.detected_credit_col ?? undefined,
      card_last4: '',
      use_debit_credit: useDebitCredit,
    },
  })

  const onSubmit = async (values: MappingFormValues) => {
    const body = {
      date_col: values.date_col,
      description_col: values.description_col,
      ...(values.use_debit_credit
        ? { debit_col: values.debit_col, credit_col: values.credit_col }
        : { amount_col: values.amount_col }),
      card_last4: values.card_last4,
    }

    const res = await fetch(`/api/statements/${statementId}/confirm-mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? 'Failed to confirm mapping')
      return
    }

    const data = await res.json()
    const count = data.transaction_count ?? 0
    toast.success(`Import complete — ${count} transaction${count === 1 ? '' : 's'} imported`)
    onConfirmed()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Confirm CSV Column Mapping</DialogTitle>
          <DialogDescription>
            {isHighConfidence
              ? `Detected columns with ${Math.round(detection.confidence * 100)}% confidence. Review and confirm.`
              : 'Could not auto-detect columns. Please select the correct columns below.'}
          </DialogDescription>
        </DialogHeader>

        {detection.sample_rows.length > 0 && (
          <div className="rounded-md border overflow-auto max-h-40">
            <Table>
              <TableHeader>
                <TableRow>
                  {detection.available_columns.map((col) => (
                    <TableHead key={col} className="whitespace-nowrap text-xs">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {detection.sample_rows.slice(0, 3).map((row, i) => (
                  <TableRow key={i}>
                    {detection.available_columns.map((col) => (
                      <TableCell key={col} className="text-xs whitespace-nowrap">
                        {String(row[col] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Date Column</Label>
              <Select
                defaultValue={detection.detected_date_col}
                onValueChange={(v) => setValue('date_col', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {detection.available_columns.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.date_col && <p className="text-xs text-destructive">{errors.date_col.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Description Column</Label>
              <Select
                defaultValue={detection.detected_description_col}
                onValueChange={(v) => setValue('description_col', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {detection.available_columns.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDebitCredit}
                  onChange={(e) => {
                    setUseDebitCredit(e.target.checked)
                    setValue('use_debit_credit', e.target.checked)
                  }}
                />
                Use separate debit / credit columns
              </label>
            </div>

            {useDebitCredit ? (
              <>
                <div className="space-y-1">
                  <Label>Debit Column</Label>
                  <Select
                    defaultValue={detection.detected_debit_col ?? undefined}
                    onValueChange={(v) => setValue('debit_col', v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {detection.available_columns.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Credit Column</Label>
                  <Select
                    defaultValue={detection.detected_credit_col ?? undefined}
                    onValueChange={(v) => setValue('credit_col', v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {detection.available_columns.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Label>Amount Column</Label>
                <Select
                  defaultValue={detection.detected_amount_col ?? undefined}
                  onValueChange={(v) => setValue('amount_col', v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {detection.available_columns.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label>Card Last 4 Digits</Label>
              <Input
                {...register('card_last4')}
                placeholder="1234"
                maxLength={4}
                className="w-32"
              />
              {errors.card_last4 && <p className="text-xs text-destructive">{errors.card_last4.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (!isHighConfidence && false)}>
              {isSubmitting ? 'Importing…' : 'Confirm & Import'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
