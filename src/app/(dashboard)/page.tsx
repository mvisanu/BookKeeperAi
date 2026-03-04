'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { CheckCircle2, CircleDot, LayoutList, Receipt, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { format } from 'date-fns'

interface Vendor { vendor: string; amount: number; transactions: number; lastDate: string }
interface Activity { id: string; transaction_date: string; vendor: string; amount: number; category: string | null; matched: boolean; hasReceipt: boolean; receiptStatus: string | null }
interface DashboardData {
  stats: { matched: number; unmatched: number; totalTracked: number; totalTaxPaid: number }
  spendingTrend: { month: string; amount: number }[]
  categoryBreakdown: { category: string; amount: number }[]
  topVendors: Vendor[]
  recentActivity: Activity[]
}

type VendorSortKey = 'vendor' | 'amount' | 'transactions' | 'lastDate'
type SortDir = 'asc' | 'desc'

function fmt(amount: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(amount)
}

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
  return dir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-[#27C5F5]" /> : <ArrowDown className="h-3 w-3 ml-1 text-[#27C5F5]" />
}

function StatusBadge({ matched, hasReceipt, receiptStatus }: { matched: boolean; hasReceipt: boolean; receiptStatus: string | null }) {
  if (matched) return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">Matched</span>
  if (hasReceipt && receiptStatus === 'complete') return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">Receipt</span>
  if (hasReceipt && receiptStatus === 'processing') return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">Processing</span>
  if (hasReceipt && receiptStatus === 'failed') return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">Failed</span>
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">Unmatched</span>
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
    setVendorSort((prev) => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'desc' }
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#27C5F5]" />
      </div>
    )
  }

  const stats = data?.stats ?? { matched: 0, unmatched: 0, totalTracked: 0, totalTaxPaid: 0 }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of your bookkeeping activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Matched</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-[#27C5F5]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.matched}</div>
            <p className="text-xs text-muted-foreground mt-1">Transactions matched to receipts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Unmatched</CardTitle>
            <CircleDot className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unmatched}</div>
            <p className="text-xs text-muted-foreground mt-1">Transactions needing a receipt</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tracked</CardTitle>
            <LayoutList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTracked}</div>
            <p className="text-xs text-muted-foreground mt-1">All imported transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tax Paid</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(stats.totalTaxPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">GST/HST + PST from receipts</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">6-Month Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.spendingTrend?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No transaction data yet</p>
            ) : (
              <ChartContainer config={{ amount: { label: 'Spending', color: '#27C5F5' } }} className="h-52 w-full">
                <AreaChart data={data?.spendingTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#27C5F5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#27C5F5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(Number(v))} />} />
                  <Area type="monotone" dataKey="amount" stroke="#27C5F5" strokeWidth={2} fill="url(#spendGrad)" dot={{ fill: '#27C5F5', r: 3 }} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">This Month by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.categoryBreakdown?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No transactions this month</p>
            ) : (
              <ChartContainer config={{ amount: { label: 'Amount', color: '#2DBEEB' } }} className="h-52 w-full">
                <BarChart data={data?.categoryBreakdown} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(Number(v))} />} />
                  <Bar dataKey="amount" fill="#2DBEEB" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Vendors — sortable table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Vendors (All Time)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedVendors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No vendor data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {([
                      { key: 'vendor', label: 'Vendor' },
                      { key: 'amount', label: 'Amount' },
                      { key: 'transactions', label: 'Transactions' },
                      { key: 'lastDate', label: 'Last Transaction' },
                    ] as { key: VendorSortKey; label: string }[]).map(({ key, label }) => (
                      <th
                        key={key}
                        className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                        onClick={() => toggleSort(key)}
                      >
                        <span className="inline-flex items-center">
                          {label}
                          <SortIcon col={key} active={vendorSort.key === key} dir={vendorSort.dir} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedVendors.map((v, i) => (
                    <tr key={v.vendor} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{v.vendor}</td>
                      <td className="px-4 py-3 tabular-nums">{fmt(v.amount)}</td>
                      <td className="px-4 py-3 tabular-nums text-center">{v.transactions}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{format(new Date(v.lastDate), 'MMM d, yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(data?.recentActivity?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No recent transactions</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vendor</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Receipt</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Process</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentActivity.map((tx, i) => (
                    <tr key={tx.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium max-w-[160px] truncate">{tx.vendor}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(tx.transaction_date), 'MMM d, yyyy')}</p>
                      </td>
                      <td className="px-4 py-3">
                        {tx.hasReceipt
                          ? <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" />Yes</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge matched={tx.matched} hasReceipt={tx.hasReceipt} receiptStatus={tx.receiptStatus} />
                      </td>
                      <td className="px-4 py-3">
                        {tx.category
                          ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(39,197,245,0.1)] text-[#27C5F5]">{tx.category}</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-medium ${tx.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {tx.amount < 0 ? '-' : '+'}{fmt(Math.abs(tx.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
