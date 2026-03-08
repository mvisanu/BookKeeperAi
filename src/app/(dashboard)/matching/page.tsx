import ReconciliationView from '@/components/reconciliation/ReconciliationView'

export default function MatchingPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl animate-page-enter">
      <div>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'oklch(0.93 0.02 259)' }}>Matching</h2>
        <p className="text-sm mt-0.5" style={{ color: 'oklch(0.48 0.04 262)' }}>
          Auto-match bank transactions with receipts or manually link them.
        </p>
      </div>
      <ReconciliationView />
    </div>
  )
}
