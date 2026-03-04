'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export interface TransactionFilterValues {
  card_last4: string
  date_from: string
  date_to: string
  amount_min: string
  amount_max: string
}

interface TransactionFiltersProps {
  onChange: (filters: TransactionFilterValues) => void
}

export default function TransactionFilters({ onChange }: TransactionFiltersProps) {
  const [filters, setFilters] = useState<TransactionFilterValues>({
    card_last4: '',
    date_from: '',
    date_to: '',
    amount_min: '',
    amount_max: '',
  })

  const update = (key: keyof TransactionFilterValues, value: string) => {
    const updated = { ...filters, [key]: value }
    setFilters(updated)
    onChange(updated)
  }

  const reset = () => {
    const empty: TransactionFilterValues = {
      card_last4: '',
      date_from: '',
      date_to: '',
      amount_min: '',
      amount_max: '',
    }
    setFilters(empty)
    onChange(empty)
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
      <div className="space-y-1">
        <Label className="text-xs">Card last 4</Label>
        <Input
          className="w-24"
          maxLength={4}
          placeholder="1234"
          value={filters.card_last4}
          onChange={(e) => update('card_last4', e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">From</Label>
        <Input
          type="date"
          className="w-36"
          value={filters.date_from}
          onChange={(e) => update('date_from', e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">To</Label>
        <Input
          type="date"
          className="w-36"
          value={filters.date_to}
          onChange={(e) => update('date_to', e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Min amount</Label>
        <Input
          type="number"
          className="w-24"
          placeholder="0"
          value={filters.amount_min}
          onChange={(e) => update('amount_min', e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Max amount</Label>
        <Input
          type="number"
          className="w-24"
          placeholder="999"
          value={filters.amount_max}
          onChange={(e) => update('amount_max', e.target.value)}
        />
      </div>
      <Button variant="ghost" size="sm" onClick={reset}>
        Reset
      </Button>
    </div>
  )
}
