import { createClient } from '@/lib/supabase/server'
import { Receipt, FileText, RefreshCw, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

async function getDashboardStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [receipts, statements, unmatched] = await Promise.all([
    supabase
      .from('receipts')
      .select('status')
      .eq('user_id', user.id),
    supabase
      .from('bank_statements')
      .select('status')
      .eq('user_id', user.id),
    supabase
      .from('bank_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_duplicate', false)
      .not('id', 'in', `(select bank_transaction_id from reconciliation_matches)`),
  ])

  const receiptRows = receipts.data ?? []
  const statementRows = statements.data ?? []

  return {
    receipts: {
      total: receiptRows.length,
      complete: receiptRows.filter((r) => r.status === 'complete').length,
      pending: receiptRows.filter((r) => r.status === 'pending' || r.status === 'processing').length,
      failed: receiptRows.filter((r) => r.status === 'failed').length,
    },
    statements: {
      total: statementRows.length,
      complete: statementRows.filter((s) => s.status === 'complete').length,
      processing: statementRows.filter((s) => s.status === 'pending' || s.status === 'processing' || s.status === 'awaiting_mapping').length,
    },
    unmatchedTransactions: unmatched.count ?? 0,
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  if (!stats) return null

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your bookkeeping activity</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/receipts">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.receipts.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.receipts.complete} processed · {stats.receipts.pending} pending
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/statements">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Bank Statements</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.statements.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.statements.complete} imported · {stats.statements.processing} in progress
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reconciliation">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unmatched Transactions</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unmatchedTransactions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.unmatchedTransactions === 0 ? 'All transactions matched' : 'Need reconciliation'}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className={stats.receipts.failed > 0 ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed Extractions</CardTitle>
            <AlertCircle className={`h-4 w-4 ${stats.receipts.failed > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.receipts.failed > 0 ? 'text-destructive' : ''}`}>
              {stats.receipts.failed}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.receipts.failed === 0 ? 'No errors' : 'Receipts that failed AI extraction'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link href="/receipts">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer p-6">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Upload Receipts</p>
                <p className="text-xs text-muted-foreground">Add new receipts for AI extraction</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/statements">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer p-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Import Bank Statement</p>
                <p className="text-xs text-muted-foreground">Upload CSV or PDF bank statements</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/reconciliation">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer p-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Run Reconciliation</p>
                <p className="text-xs text-muted-foreground">Match receipts to transactions</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
