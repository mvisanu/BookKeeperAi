'use client'

import { useState } from 'react'

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

const inputStyle = {
  background: 'oklch(1 0 0 / 4%)',
  border: '1px solid oklch(1 0 0 / 8%)',
  color: 'oklch(0.82 0.02 259)',
  borderRadius: '0.5rem',
  padding: '0.375rem 0.625rem',
  fontSize: '0.8125rem',
  outline: 'none',
  width: '100%',
}

const labelStyle = {
  color: 'oklch(0.45 0.04 262)',
  fontSize: '0.6875rem',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
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
    <div
      className="flex flex-wrap items-end gap-4 rounded-xl px-4 py-3"
      style={{
        background: 'oklch(1 0 0 / 2%)',
        border: '1px solid oklch(1 0 0 / 7%)',
      }}
    >
      <div className="space-y-1.5">
        <label style={labelStyle}>Card last 4</label>
        <input
          style={{ ...inputStyle, width: '6rem' }}
          maxLength={4}
          placeholder="1234"
          value={filters.card_last4}
          onChange={(e) => update('card_last4', e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label style={labelStyle}>From</label>
        <input
          type="date"
          style={{ ...inputStyle, width: '9rem' }}
          value={filters.date_from}
          onChange={(e) => update('date_from', e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label style={labelStyle}>To</label>
        <input
          type="date"
          style={{ ...inputStyle, width: '9rem' }}
          value={filters.date_to}
          onChange={(e) => update('date_to', e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label style={labelStyle}>Min amount</label>
        <input
          type="number"
          style={{ ...inputStyle, width: '6rem' }}
          placeholder="0"
          value={filters.amount_min}
          onChange={(e) => update('amount_min', e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label style={labelStyle}>Max amount</label>
        <input
          type="number"
          style={{ ...inputStyle, width: '6rem' }}
          placeholder="999"
          value={filters.amount_max}
          onChange={(e) => update('amount_max', e.target.value)}
        />
      </div>
      <button
        onClick={reset}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
        style={{ background: 'oklch(1 0 0 / 5%)', color: 'oklch(0.55 0.04 262)', border: '1px solid oklch(1 0 0 / 8%)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#27C5F5'
          e.currentTarget.style.background = 'rgba(39,197,245,0.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'oklch(0.55 0.04 262)'
          e.currentTarget.style.background = 'oklch(1 0 0 / 5%)'
        }}
      >
        Reset
      </button>
    </div>
  )
}
