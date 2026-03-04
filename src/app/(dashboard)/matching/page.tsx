import ReconciliationView from '@/components/reconciliation/ReconciliationView'

export default function MatchingPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Matching</h2>
        <p className="text-muted-foreground mt-1">
          Auto-match bank transactions with receipts or manually link them.
        </p>
      </div>
      <ReconciliationView />
    </div>
  )
}
