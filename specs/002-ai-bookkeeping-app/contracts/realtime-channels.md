# Realtime Channels Contract

**Feature**: `002-ai-bookkeeping-app` | **Date**: 2026-03-03

The client subscribes to Supabase Realtime channels to receive live updates from Edge Function background processing without page refresh (FR-007, FR-018).

All subscriptions use the Supabase browser client with the authenticated user's session. RLS automatically filters rows to the current user.

---

## Channel: `receipts-status`

**Purpose**: Notify the UI when a receipt's extraction status changes (pending → processing → complete | failed).

**Subscription**:
```ts
supabase
  .channel('receipts-status')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'receipts',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => handleReceiptUpdate(payload.new)
  )
  .subscribe()
```

**Payload `payload.new`** (partial `Receipt`):
```ts
{
  id: string;
  status: "pending" | "processing" | "complete" | "failed";
  vendor_name: string | null;
  transaction_date: string | null;
  total_amount: number | null;
  subtotal_amount: number | null;
  gst_hst_amount: number | null;
  pst_amount: number | null;
  payment_method: string | null;
  card_last4: string | null;
  category: string | null;
  expense_type: "business" | "personal" | null;
  location: string | null;
  receipt_number: string | null;
  extraction_error: string | null;
  updated_at: string;
}
```

**UI behaviour**:
- On `status = "processing"`: show spinner on the receipt row.
- On `status = "complete"`: replace spinner with extracted data, show success toast.
- On `status = "failed"`: show error indicator with retry button.

---

## Channel: `statement-progress`

**Purpose**: Show real-time import progress for bank statement processing (transaction count ticker).

**Subscription**:
```ts
supabase
  .channel('statement-progress')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'bank_statements',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => handleStatementUpdate(payload.new)
  )
  .subscribe()
```

**Payload `payload.new`** (partial `BankStatement`):
```ts
{
  id: string;
  status: "pending" | "awaiting_mapping" | "processing" | "complete" | "failed";
  transaction_count: number;   // live ticker — updated every 25 inserts
  import_error: string | null;
  updated_at: string;
}
```

**UI behaviour**:
- On `status = "processing"` with incrementing `transaction_count`: display "Importing… {n} transactions".
- On `status = "complete"`: show "Imported {transaction_count} transactions" and refresh transaction list.
- On `status = "failed"`: show error message from `import_error`.

---

## Cleanup

All channel subscriptions MUST be removed on component unmount:

```ts
useEffect(() => {
  const channel = supabase.channel('receipts-status').on(...)subscribe()
  return () => { supabase.removeChannel(channel) }
}, [])
```

---

## Supabase Realtime Configuration

Ensure the following tables have Realtime enabled in the Supabase dashboard (or via migration):

```sql
-- Enable realtime for status columns only (reduce bandwidth)
ALTER PUBLICATION supabase_realtime ADD TABLE receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE bank_statements;
```
