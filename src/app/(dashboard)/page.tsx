'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { CheckCircle2, CircleDot, LayoutList, Receipt, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface DashboardData {
  stats: { matched: number; unmatched: number; totalTracked: number; totalTaxPaid: number }
  spendingTrend: { month: string; amount: number }[]
  categoryBreakdown: { category: string; amount: number }[]
  top5Vendors: { vendor: string; amount: number }[]
  recentActivity: { id: string; transaction_date: string; description: string; amount: number; category: string | null }[]
}

const CHART_COLORS = ['#27C5F5', '#2DBEEB', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe', '#f0f9ff']

function fmt(amount: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(amount)
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((r) => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#27C5F5]" />
      </div>
    )
  }

  const stats = data?.stats ?? { matched: 0, unmatched: 0, totalTracked: 0, totalTaxPaid: 0 }

  return (
    <div className="p-6 space-y-6">
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

      {/* Charts row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* 6-Month Spending Trend */}
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

        {/* This Month by Category */}
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

      {/* Top 5 Vendors + Recent Activity */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Top 5 Vendors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top 5 Vendors (All Time)</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.top5Vendors?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No vendor data yet</p>
            ) : (
              <div className="space-y-3">
                {data?.top5Vendors.map((v, i) => {
                  const max = data.top5Vendors[0].amount
                  const pct = Math.round((v.amount / max) * 100)
                  return (
                    <div key={v.vendor} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                          <span className="truncate max-w-[180px]">{v.vendor}</span>
                        </span>
                        <span className="font-medium tabular-nums">{fmt(v.amount)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i] }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.recentActivity?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent transactions</p>
            ) : (
              <div className="space-y-2">
                {data?.recentActivity.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-accent/50 transition-colors">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.transaction_date), 'MMM d, yyyy')}
                        {tx.category ? ` · ${tx.category}` : ''}
                      </p>
                    </div>
                    <span className={`text-sm font-medium tabular-nums shrink-0 ${tx.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {tx.amount < 0 ? '-' : '+'}{fmt(Math.abs(tx.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
