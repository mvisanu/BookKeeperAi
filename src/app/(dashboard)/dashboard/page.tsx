'use client'

import { useEffect, useState, useMemo } from 'react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  CheckCircle2, CircleDot, LayoutList, Receipt, Loader2,
  ArrowUpDown, ArrowUp, ArrowDown, CreditCard, Activity,
  TrendingUp,
} from 'lucide-react'
import { format } from 'date-fns'

interface Vendor { vendor: string; amount: number; transactions: number; lastDate: string }
interface ActivityRow { id: string; transaction_date: string; vendor: string; amount: number; category: string | null; matched: boolean; hasReceipt: boolean; receiptStatus: string | null }
interface Health {
  overallScore: number; overallLabel: string
  matchRate: number
  processingSuccessRate: number; processedReceipts: number; totalReceipts: number; failedReceipts: number
  categorizationRate: number
}
interface DashboardData {
  stats: { matched: number; unmatched: number; totalTracked: number; totalTaxPaid: number; totalReceipts: number; totalTransactions: number }
  health: Health
  spendingTrend: { month: string; amount: number }[]
  categoryBreakdown: { category: string; amount: number }[]
  topVendors: Vendor[]
  recentActivity: ActivityRow[]
}

type VendorSortKey = 'vendor' | 'amount' | 'transactions' | 'lastDate'
type SortDir = 'asc' | 'desc'

function fmt(amount: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(amount)
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1.5 opacity-30" />
  return dir === 'asc'
    ? <ArrowUp className="h-3 w-3 ml-1.5" style={{ color: '#27C5F5' }} />
    : <ArrowDown className="h-3 w-3 ml-1.5" style={{ color: '#27C5F5' }} />
}

function HealthBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(1 0 0 / 8%)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color, boxShadow: `0 0 8px ${color}60` }}
        />
      </div>
      <span className="text-xs font-semibold nums w-8 text-right" style={{ color }}>{value}%</span>
    </div>
  )
}

function healthColor(score: number) {
  if (score >= 90) return '#10D9A1'
  if (score >= 75) return '#27C5F5'
  if (score >= 55) return '#F5A623'
  if (score >= 35) return '#F97316'
  return '#FF4757'
}

function StatusPill({ matched, hasReceipt, receiptStatus }: { matched: boolean; hasReceipt: boolean; receiptStatus: string | null }) {
  if (matched) return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'rgba(16,217,161,0.12)', color: '#10D9A1' }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#10D9A1', boxShadow: '0 0 4px #10D9A1' }} />
      Matched
    </span>
  )
  if (hasReceipt && receiptStatus === 'complete') return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'rgba(39,197,245,0.12)', color: '#27C5F5' }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#27C5F5' }} />
      Receipt
    </span>
  )
  if (hasReceipt && receiptStatus === 'processing') return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'rgba(245,166,35,0.12)', color: '#F5A623' }}>
      <span className="h-1.5 w-1.5 rounded-full status-pulse" style={{ background: '#F5A623' }} />
      Processing
    </span>
  )
  if (hasReceipt && receiptStatus === 'failed') return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'rgba(255,71,87,0.12)', color: '#FF4757' }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#FF4757' }} />
      Failed
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'oklch(1 0 0 / 6%)', color: 'oklch(0.55 0.04 262)' }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'oklch(0.45 0.04 262)' }} />
      Unmatched
    </span>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  subLabel: string
  icon: React.ReactNode
  iconClass: string
  valueColor?: string
}

function StatCard({ label, value, subLabel, icon, iconClass, valueColor }: StatCardProps) {
  return (
    <div
      className="card-premium rounded-xl p-4 flex flex-col gap-3 cursor-default"
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.5 0.04 262)' }}>
          {label}
        </p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold nums leading-none" style={{ color: valueColor ?? 'oklch(0.93 0.02 259)' }}>
          {value}
        </p>
        <p className="mt-1 text-[11px]" style={{ color: 'oklch(0.48 0.04 262)' }}>{subLabel}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [vendorSort, setVendorSort] = useState<{ key: VendorSortKey; dir: SortDir }>({ key: 'amount', dir: 'desc' })

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((r) => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const sortedVendors = useMemo(() => {
    if (!data?.topVendors) return []
    return [...data.topVendors].sort((a, b) => {
      const { key, dir } = vendorSort
      let cmp = 0
      if (key === 'vendor') cmp = a.vendor.localeCompare(b.vendor)
      else if (key === 'amount') cmp = a.amount - b.amount
      else if (key === 'transactions') cmp = a.transactions - b.transactions
      else if (key === 'lastDate') cmp = a.lastDate.localeCompare(b.lastDate)
      return dir === 'asc' ? cmp : -cmp
    })
  }, [data?.topVendors, vendorSort])

  function toggleSort(key: VendorSortKey) {
    setVendorSort((prev) => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: '#27C5F5' }} />
          <p className="text-sm" style={{ color: 'oklch(0.48 0.04 262)' }}>Loading dashboard…</p>
        </div>
      </div>
    )
  }

  const stats = data?.stats ?? { matched: 0, unmatched: 0, totalTracked: 0, totalTaxPaid: 0, totalReceipts: 0, totalTransactions: 0 }
  const health = data?.health ?? { overallScore: 0, overallLabel: 'No Data', matchRate: 0, processingSuccessRate: 0, processedReceipts: 0, totalReceipts: 0, failedReceipts: 0, categorizationRate: 0 }

  const borderStyle = { borderColor: 'oklch(1 0 0 / 7%)' }
  const mutedText = { color: 'oklch(0.48 0.04 262)' }
  const sectionTitle = { color: 'oklch(0.75 0.02 259)' }

  return (
    <div className="mesh-bg min-h-full p-4 md:p-6 space-y-6 animate-page-enter">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'oklch(0.93 0.02 259)' }}>
          Dashboard
        </h2>
        <p className="text-sm mt-0.5" style={mutedText}>Overview of your bookkeeping activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 stagger">
        <StatCard
          label="Matched"
          value={stats.matched}
          subLabel="reconciled items"
          icon={<CheckCircle2 className="h-4 w-4" style={{ color: '#10D9A1' }} />}
          iconClass="icon-glow-green"
          valueColor="#10D9A1"
        />
        <StatCard
          label="Unmatched"
          value={stats.unmatched}
          subLabel="need receipt"
          icon={<CircleDot className="h-4 w-4" style={{ color: '#F5A623' }} />}
          iconClass="icon-glow-amber"
          valueColor="#F5A623"
        />
        <StatCard
          label="Total Tracked"
          value={stats.totalTracked}
          subLabel="all transactions"
          icon={<LayoutList className="h-4 w-4" style={{ color: '#27C5F5' }} />}
          iconClass="icon-glow-cyan"
        />
        <StatCard
          label="Tax Paid"
          value={stats.totalTaxPaid > 0 ? fmt(stats.totalTaxPaid) : '$0.00'}
          subLabel="GST/HST + PST"
          icon={<TrendingUp className="h-4 w-4" style={{ color: '#a78bfa' }} />}
          iconClass="icon-glow-violet"
        />
        <StatCard
          label="Receipts"
          value={stats.totalReceipts}
          subLabel="uploaded total"
          icon={<Receipt className="h-4 w-4" style={{ color: '#27C5F5' }} />}
          iconClass="icon-glow-cyan"
        />
        <StatCard
          label="Transactions"
          value={stats.totalTransactions}
          subLabel="from bank statements"
          icon={<CreditCard className="h-4 w-4" style={{ color: '#10D9A1' }} />}
          iconClass="icon-glow-green"
        />
      </div>

      {/* Data Health */}
      <div className="card-premium rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" style={{ color: '#27C5F5' }} />
            <h3 className="text-sm font-semibold" style={sectionTitle}>Data Health</h3>
          </div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `${healthColor(health.overallScore)}18`, color: healthColor(health.overallScore) }}
          >
            {health.overallLabel}
          </span>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Overall Health', value: health.overallScore, color: healthColor(health.overallScore), sub: `Score ${health.overallScore}/100` },
            { label: 'Match Rate', value: health.matchRate, color: '#27C5F5', sub: `${stats.matched} of ${stats.totalTransactions} matched` },
            { label: 'Processing Success', value: health.processingSuccessRate, color: health.processingSuccessRate >= 90 ? '#10D9A1' : '#F5A623', sub: `${health.processedReceipts} of ${health.totalReceipts} receipts` },
            { label: 'Categorization', value: health.categorizationRate, color: '#27C5F5', sub: `${health.categorizationRate}% categorized` },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={mutedText}>{label}</p>
              <HealthBar value={value} color={color} />
              <p className="text-[11px]" style={{ color: 'oklch(0.42 0.04 262)' }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="card-premium rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4" style={sectionTitle}>6-Month Spending</h3>
          {(data?.spendingTrend?.length ?? 0) === 0 ? (
            <div className="flex items-center justify-center h-52">
              <p className="text-sm" style={mutedText}>No transaction data yet</p>
            </div>
          ) : (
            <ChartContainer config={{ amount: { label: 'Spending', color: '#27C5F5' } }} className="h-52 w-full">
              <AreaChart data={data?.spendingTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#27C5F5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#27C5F5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'oklch(0.48 0.04 262)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'oklch(0.48 0.04 262)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(Number(v))} />} />
                <Area type="monotone" dataKey="amount" stroke="#27C5F5" strokeWidth={2} fill="url(#spendGrad)" dot={{ fill: '#27C5F5', r: 2.5, strokeWidth: 0 }} activeDot={{ r: 4, fill: '#27C5F5', stroke: '#0C1025', strokeWidth: 2 }} />
              </AreaChart>
            </ChartContainer>
          )}
        </div>

        <div className="card-premium rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4" style={sectionTitle}>This Month by Category</h3>
          {(data?.categoryBreakdown?.length ?? 0) === 0 ? (
            <div className="flex items-center justify-center h-52">
              <p className="text-sm" style={mutedText}>No transactions this month</p>
            </div>
          ) : (
            <ChartContainer config={{ amount: { label: 'Amount', color: '#10D9A1' } }} className="h-52 w-full">
              <BarChart data={data?.categoryBreakdown} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'oklch(0.48 0.04 262)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: 'oklch(0.48 0.04 262)' }} tickLine={false} axisLine={false} width={90} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(Number(v))} />} />
                <Bar dataKey="amount" fill="#10D9A1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>

      {/* Top Vendors */}
      <div className="card-premium rounded-xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={sectionTitle}>Top Vendors</h3>
          <span className="text-[11px]" style={mutedText}>All time</span>
        </div>
        <div className="h-px" style={borderStyle} />
        {sortedVendors.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm" style={mutedText}>No vendor data yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
                  {([
                    { key: 'vendor', label: 'Vendor' },
                    { key: 'amount', label: 'Amount' },
                    { key: 'transactions', label: 'Txns' },
                    { key: 'lastDate', label: 'Last Transaction' },
                  ] as { key: VendorSortKey; label: string }[]).map(({ key, label }) => (
                    <th
                      key={key}
                      className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors whitespace-nowrap"
                      style={{ color: 'oklch(0.45 0.04 262)' }}
                      onClick={() => toggleSort(key)}
                    >
                      <span className="inline-flex items-center hover:text-[oklch(0.65_0.04_262)]">
                        {label}
                        <SortIcon active={vendorSort.key === key} dir={vendorSort.dir} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedVendors.map((v, i) => (
                  <tr
                    key={v.vendor}
                    className="transition-colors"
                    style={{
                      borderBottom: i < sortedVendors.length - 1 ? '1px solid oklch(1 0 0 / 5%)' : 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'oklch(1 0 0 / 3%)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-5 py-3 font-medium max-w-[200px] truncate" style={{ color: 'oklch(0.82 0.02 259)' }}>{v.vendor}</td>
                    <td className="px-5 py-3 nums font-semibold" style={{ color: '#27C5F5' }}>{fmt(v.amount)}</td>
                    <td className="px-5 py-3 nums text-center" style={{ color: 'oklch(0.65 0.04 262)' }}>{v.transactions}</td>
                    <td className="px-5 py-3 whitespace-nowrap" style={mutedText}>{format(new Date(v.lastDate), 'MMM d, yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="card-premium rounded-xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={sectionTitle}>Recent Activity</h3>
          <span className="text-[11px]" style={mutedText}>Latest transactions</span>
        </div>
        <div className="h-px" style={borderStyle} />
        {(data?.recentActivity?.length ?? 0) === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm" style={mutedText}>No recent transactions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
                  {['Vendor', 'Receipt', 'Status', 'Category', 'Amount'].map((h, i) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'oklch(0.45 0.04 262)', textAlign: i === 4 ? 'right' : 'left' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.recentActivity.map((tx, i) => (
                  <tr
                    key={tx.id}
                    className="transition-colors"
                    style={{ borderBottom: i < (data.recentActivity.length - 1) ? '1px solid oklch(1 0 0 / 5%)' : 'none' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'oklch(1 0 0 / 3%)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium max-w-[160px] truncate" style={{ color: 'oklch(0.82 0.02 259)' }}>{tx.vendor}</p>
                      <p className="text-[11px] mt-0.5" style={mutedText}>{format(new Date(tx.transaction_date), 'MMM d, yyyy')}</p>
                    </td>
                    <td className="px-5 py-3">
                      {tx.hasReceipt
                        ? <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#10D9A1' }}>
                            <CheckCircle2 className="h-3.5 w-3.5" />Yes
                          </span>
                        : <span style={mutedText} className="text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill matched={tx.matched} hasReceipt={tx.hasReceipt} receiptStatus={tx.receiptStatus} />
                    </td>
                    <td className="px-5 py-3">
                      {tx.category
                        ? <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(39,197,245,0.08)', color: '#27C5F5' }}>{tx.category}</span>
                        : <span style={mutedText} className="text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right nums font-semibold" style={{ color: tx.amount < 0 ? '#FF4757' : '#10D9A1' }}>
                      {tx.amount < 0 ? '-' : '+'}{fmt(Math.abs(tx.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
