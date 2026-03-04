# Data Model: AI-Powered Bookkeeping App

**Feature**: `002-ai-bookkeeping-app` | **Date**: 2026-03-03

## Entity Overview

```text
auth.users (Supabase managed)
    │
    ├── profiles (1:1)
    ├── receipts (1:N)
    ├── bank_statements (1:N)
    │       └── bank_transactions (1:N per statement)
    └── reconciliation_matches
            ├── bank_transaction_id (1:1 → bank_transactions)
            └── receipt_id (1:1 → receipts)
```

---

## Tables

### `profiles`

Extends `auth.users` with app-level user metadata.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE | Same as Supabase auth UID |
| `email` | `text` | NOT NULL | Denormalised from auth for display |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**RLS**: All operations require `auth.uid() = id`.
**Trigger**: `handle_new_user()` — inserts a row into `profiles` on `auth.users` INSERT.

---

### `receipts`

One row per uploaded receipt or invoice file.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | RLS anchor |
| `status` | `receipt_status` (enum) | NOT NULL, DEFAULT `'pending'` | See enum below |
| `storage_path` | `text` | NOT NULL | Supabase Storage object path |
| `file_name` | `text` | NOT NULL | Original file name (display only) |
| `file_size` | `integer` | NOT NULL | Bytes; validated ≤ 10,485,760 (10 MB) |
| `file_mime_type` | `text` | NOT NULL | `image/jpeg`, `image/png`, `application/pdf` |
| `vendor_name` | `text` | | Extracted: merchant/vendor name |
| `transaction_date` | `date` | | Extracted: purchase date |
| `total_amount` | `numeric(12,2)` | CHECK `total_amount >= 0` | Extracted: total including tax |
| `subtotal_amount` | `numeric(12,2)` | CHECK `subtotal_amount >= 0` | Extracted: before tax |
| `gst_hst_amount` | `numeric(12,2)` | CHECK `gst_hst_amount >= 0` | Extracted: GST/HST |
| `pst_amount` | `numeric(12,2)` | CHECK `pst_amount >= 0` | Extracted: PST |
| `payment_method` | `text` | | Extracted: `Visa`, `Mastercard`, `Debit`, `Cash`, etc. |
| `card_last4` | `char(4)` | CHECK `card_last4 ~ '^[0-9]{4}$'` | Extracted: last 4 digits of card |
| `category` | `text` | | Extracted/user-set: `Meals`, `Travel`, `Office Supplies`, etc. |
| `expense_type` | `expense_type` (enum) | | `business` or `personal` |
| `location` | `text` | | Extracted: store address or city |
| `receipt_number` | `text` | | Extracted: printed receipt/invoice number |
| `notes` | `text` | | User-entered notes |
| `extraction_error` | `text` | | Error message if status = `failed` |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Auto-updated by trigger |

**Enums**:
- `receipt_status`: `pending | processing | complete | failed`
- `expense_type`: `business | personal`

**Indexes**:
- `idx_receipts_user_status` ON `(user_id, status)` — filter unmatched receipts
- `idx_receipts_user_date` ON `(user_id, transaction_date)` — date range queries

**RLS** (all operations): `auth.uid() = user_id`

**Validation rules**:
- `file_size` ≤ 10,485,760 (10 MB) — enforced client-side before upload AND as CHECK constraint
- Only `pending` → `processing` → `complete` | `failed` state transitions allowed
- All extracted numeric fields are nullable (extraction may be partial)

**State transitions**:
```text
pending → processing  (Edge Function picks up the job)
processing → complete (Gemini extraction succeeded)
processing → failed   (Gemini call errored or image illegible)
failed → processing   (user retries)
```

---

### `bank_statements`

One row per uploaded bank statement file (metadata only).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | RLS anchor |
| `file_name` | `text` | NOT NULL | Original file name |
| `file_size` | `integer` | NOT NULL | Bytes; validated ≤ 20,971,520 (20 MB) |
| `file_mime_type` | `text` | NOT NULL | `application/pdf`, `image/jpeg`, `image/png`, `text/csv` |
| `storage_path` | `text` | NOT NULL | Supabase Storage object path |
| `card_last4` | `char(4)` | CHECK `card_last4 ~ '^[0-9]{4}$'` | Prompted from user or extracted |
| `status` | `statement_status` (enum) | NOT NULL, DEFAULT `'pending'` | See enum below |
| `transaction_count` | `integer` | DEFAULT 0 | Incremented during import for real-time progress |
| `import_error` | `text` | | Error message if status = `failed` |
| `csv_column_mapping` | `jsonb` | | Stored mapping for CSV files (date_col, desc_col, amount_col, etc.) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Enums**:
- `statement_status`: `pending | awaiting_mapping | processing | complete | failed`

**Notes**:
- CSV files pause at `awaiting_mapping` until user confirms column mapping
- PDF/image files go directly `pending → processing`

**RLS**: `auth.uid() = user_id`

---

### `bank_transactions`

One row per transaction extracted from a bank statement.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | RLS anchor (denormalised for query performance) |
| `statement_id` | `uuid` | NOT NULL, FK → `bank_statements(id)` ON DELETE CASCADE | Source statement |
| `transaction_date` | `date` | NOT NULL | Transaction date |
| `description` | `text` | NOT NULL | Bank statement description / memo |
| `amount` | `numeric(12,2)` | NOT NULL | Negative = debit, positive = credit/refund |
| `category` | `text` | | User-editable category |
| `notes` | `text` | | User-entered notes |
| `card_last4` | `char(4)` | | Inherited from parent statement |
| `is_duplicate` | `boolean` | NOT NULL, DEFAULT `false` | Flagged by duplicate detection |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Indexes**:
- `idx_bank_tx_user_statement` ON `(user_id, statement_id)` — batch delete
- `idx_bank_tx_user_date` ON `(user_id, transaction_date)` — date range filter
- `idx_bank_tx_user_card` ON `(user_id, card_last4)` — card filter
- `idx_bank_tx_user_amount` ON `(user_id, amount)` — amount range filter
- `idx_bank_tx_dedup` ON `(user_id, transaction_date, amount, description)` — duplicate detection (functional, trim description)

**Duplicate detection rule (FR-019)**:
A transaction is a duplicate if `(user_id, transaction_date, amount, trim(lower(description)))` matches an existing row. Duplicates are skipped and reported — not inserted.

**RLS**: `auth.uid() = user_id`

---

### `reconciliation_matches`

One row per confirmed match between a bank transaction and a receipt.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | RLS anchor |
| `bank_transaction_id` | `uuid` | NOT NULL, UNIQUE, FK → `bank_transactions(id)` ON DELETE CASCADE | One-to-one constraint |
| `receipt_id` | `uuid` | NOT NULL, UNIQUE, FK → `receipts(id)` ON DELETE CASCADE | One-to-one constraint |
| `match_type` | `match_type` (enum) | NOT NULL | `auto` or `manual` |
| `confidence_score` | `numeric(4,3)` | CHECK `0 <= confidence_score <= 1` | `1.000` = exact amount + same date; lower for date offsets |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Enums**:
- `match_type`: `auto | manual`

**Constraints**:
- `UNIQUE (bank_transaction_id)` — a transaction matches at most one receipt (FR-025)
- `UNIQUE (receipt_id)` — a receipt matches at most one transaction (FR-025)

**RLS**: `auth.uid() = user_id`

---

## Supabase Storage Buckets

| Bucket | Access | Max File Size | Allowed MIME Types |
|--------|--------|---------------|--------------------|
| `receipts` | Private (RLS) | 10 MB | `image/jpeg`, `image/png`, `application/pdf` |
| `bank-statements` | Private (RLS) | 20 MB | `application/pdf`, `image/jpeg`, `image/png`, `text/csv` |

**Storage path convention**:
- Receipts: `{user_id}/{receipt_id}/{file_name}`
- Statements: `{user_id}/{statement_id}/{file_name}`

Storage policies enforce `auth.uid() = (storage.foldername(name))[1]::uuid` so users can only access their own folder.

---

## Reconciliation Algorithm

**Input**: All `bank_transactions` where `user_id = ?` AND no row in `reconciliation_matches` references them.
**Input**: All `receipts` where `user_id = ?` AND status = `complete` AND no row in `reconciliation_matches` references them.

**Match criteria (FR-024)**:
1. `ABS(bank_transaction.amount) = receipt.total_amount` within $0.01 tolerance
2. `ABS(bank_transaction.transaction_date - receipt.transaction_date) <= 3 days`

**Algorithm (greedy, sorted)**:
1. Sort unmatched transactions by `(transaction_date, ABS(amount))`.
2. For each transaction, find candidate receipts satisfying both criteria.
3. Score each candidate: `confidence = 1.0 - (date_diff_days / 3) * 0.1` (exact date = 1.0, 3-day offset = 0.7).
4. Select the highest-confidence candidate; if tied, prefer the most recently created receipt.
5. Insert a `reconciliation_matches` row with `match_type = 'auto'`.
6. Mark both sides as consumed (via the UNIQUE constraints).

**One-to-one enforcement**: DB-level UNIQUE constraints on `bank_transaction_id` and `receipt_id` prevent double-matching even under concurrent requests.

---

## Validation Rules Summary

| Entity | Field | Rule |
|--------|-------|------|
| receipt | `file_size` | ≤ 10 MB (client-side + CHECK) |
| receipt | `card_last4` | 4 digits or NULL |
| receipt | `total_amount`, `subtotal_amount`, `gst_hst_amount`, `pst_amount` | ≥ 0 or NULL |
| bank_statement | `file_size` | ≤ 20 MB (client-side + CHECK) |
| bank_statement | `card_last4` | 4 digits or NULL |
| bank_transaction | `amount` | Any signed numeric (negative = debit) |
| reconciliation_match | `confidence_score` | 0.000 – 1.000 |
| reconciliation_match | `bank_transaction_id`, `receipt_id` | Each UNIQUE globally per user |

---

## Migrations

```text
supabase/migrations/
└── 20260303000001_initial_schema.sql   # All tables, enums, RLS, indexes, triggers, storage buckets
```

All migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE POLICY IF NOT EXISTS`).
