# API Routes Contract

**Feature**: `002-ai-bookkeeping-app` | **Date**: 2026-03-03

All routes are Next.js App Router Route Handlers under `src/app/api/`.
All routes require an authenticated session (Supabase session cookie). 401 is returned if unauthenticated.
All request/response bodies are `application/json` unless noted.
All error responses follow the shape: `{ error: string, code?: string }`.

---

## Authentication

### `POST /api/auth/sign-up`
Create a new user account.

**Request**:
```ts
{ email: string; password: string }
```

**Response `201`**:
```ts
{ message: "Check your email to confirm your account" }
```

**Response `409`**: Email already registered.

---

### `POST /api/auth/sign-in`
Sign in with email + password. Sets Supabase session cookies.

**Request**:
```ts
{ email: string; password: string }
```

**Response `200`**:
```ts
{ user: { id: string; email: string } }
```

**Response `401`**: Invalid credentials.

---

### `POST /api/auth/sign-out`
Clear session cookies.

**Response `204`**: No content.

---

### `POST /api/auth/reset-password`
Send password reset email.

**Request**:
```ts
{ email: string }
```

**Response `200`**:
```ts
{ message: "Password reset email sent" }
```

---

## Receipts

### `GET /api/receipts`
List all receipts for the authenticated user.

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| `status` | `pending \| processing \| complete \| failed` | Optional filter |
| `page` | `number` | Default 1 |
| `limit` | `number` | Default 50, max 200 |

**Response `200`**:
```ts
{
  data: Receipt[];
  total: number;
  page: number;
}
```

Where `Receipt`:
```ts
{
  id: string;
  status: "pending" | "processing" | "complete" | "failed";
  file_name: string;
  file_size: number;
  vendor_name: string | null;
  transaction_date: string | null;  // ISO date "YYYY-MM-DD"
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
  notes: string | null;
  extraction_error: string | null;
  created_at: string;  // ISO datetime
  updated_at: string;
  is_matched: boolean;  // true if a reconciliation_match row exists
}
```

---

### `POST /api/receipts`
Initiate a receipt upload. Client first uploads file to Supabase Storage, then calls this route to create the DB record.

**Request**:
```ts
{
  storage_path: string;   // Supabase Storage path e.g. "{user_id}/{receipt_id}/receipt.jpg"
  file_name: string;
  file_size: number;      // bytes
  file_mime_type: string; // "image/jpeg" | "image/png" | "application/pdf"
}
```

**Validation**: `file_size` must be ≤ 10,485,760. Returns `422` with `{ error: "File exceeds 10 MB limit" }` if violated.

**Response `201`**:
```ts
{ id: string; status: "pending" }
```

Side effect: Triggers `process-receipt` Edge Function via Supabase DB Webhook.

---

### `GET /api/receipts/[id]`
Get a single receipt by ID.

**Response `200`**: `Receipt` (same shape as list item).
**Response `404`**: Not found or not owned by user.

---

### `PATCH /api/receipts/[id]`
Update editable fields on a receipt.

**Request** (all fields optional):
```ts
{
  vendor_name?: string;
  transaction_date?: string;   // "YYYY-MM-DD"
  total_amount?: number;
  subtotal_amount?: number;
  gst_hst_amount?: number;
  pst_amount?: number;
  payment_method?: string;
  card_last4?: string;
  category?: string;
  expense_type?: "business" | "personal";
  location?: string;
  receipt_number?: string;
  notes?: string;
}
```

**Response `200`**: Updated `Receipt`.
**Response `404`**: Not found.

---

### `DELETE /api/receipts/[id]`
Delete a receipt and its Supabase Storage file. If a match exists, unlinks it first.

**Response `204`**: No content.
**Response `404`**: Not found.

---

### `POST /api/receipts/[id]/retry`
Retry AI extraction for a failed receipt.

**Precondition**: receipt status must be `failed`.

**Response `200`**:
```ts
{ status: "processing" }
```

**Response `409`**: Receipt is not in `failed` state.

---

## Bank Statements

### `GET /api/statements`
List all imported bank statements.

**Response `200`**:
```ts
{
  data: BankStatement[];
  total: number;
}
```

Where `BankStatement`:
```ts
{
  id: string;
  file_name: string;
  file_size: number;
  file_mime_type: string;
  card_last4: string | null;
  status: "pending" | "awaiting_mapping" | "processing" | "complete" | "failed";
  transaction_count: number;
  import_error: string | null;
  csv_column_mapping: CsvColumnMapping | null;
  created_at: string;
  updated_at: string;
}
```

---

### `POST /api/statements`
Initiate a bank statement upload.

**Request**:
```ts
{
  storage_path: string;
  file_name: string;
  file_size: number;         // bytes; max 20,971,520
  file_mime_type: string;    // "application/pdf" | "image/jpeg" | "image/png" | "text/csv"
  card_last4?: string;       // required for CSV (extracted for PDF/image by Gemini)
}
```

**Validation**: `file_size` ≤ 20,971,520. Returns `422` if exceeded.

**Response `201`**:
```ts
{
  id: string;
  status: "pending" | "awaiting_mapping";  // "awaiting_mapping" for CSV files
  csv_column_mapping?: CsvColumnDetectionResult;  // included for CSV when status = "awaiting_mapping"
}
```

Where `CsvColumnDetectionResult`:
```ts
{
  detected_date_col: string;
  detected_description_col: string;
  detected_amount_col: string | null;
  detected_debit_col: string | null;    // when debit/credit split detected
  detected_credit_col: string | null;
  confidence: number;   // 0–1; < 0.8 means user MUST confirm
  sample_rows: Record<string, string>[];  // first 3 rows for preview
  available_columns: string[];
}
```

---

### `POST /api/statements/[id]/confirm-mapping`
Confirm or correct CSV column mapping before import proceeds.

**Request**:
```ts
{
  date_col: string;
  description_col: string;
  amount_col?: string;       // signed amount column
  debit_col?: string;        // debit column (alternative to amount_col)
  credit_col?: string;       // credit column (alternative to amount_col)
  card_last4: string;
}
```

**Validation**: Either `amount_col` OR both `debit_col` + `credit_col` must be provided.

**Response `200`**:
```ts
{ status: "processing" }
```

---

### `DELETE /api/statements/[id]`
Delete a bank statement and all its transactions. Storage file is removed.

**Response `204`**: No content.

---

## Transactions

### `GET /api/transactions`
List bank transactions with filtering.

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| `card_last4` | `string` | Filter by card |
| `date_from` | `string` | ISO date, inclusive |
| `date_to` | `string` | ISO date, inclusive |
| `amount_min` | `number` | |
| `amount_max` | `number` | |
| `statement_id` | `string` | Filter by source statement |
| `unmatched_only` | `boolean` | Exclude matched transactions |
| `page` | `number` | Default 1 |
| `limit` | `number` | Default 100, max 500 |

**Response `200`**:
```ts
{
  data: BankTransaction[];
  total: number;
}
```

Where `BankTransaction`:
```ts
{
  id: string;
  statement_id: string;
  transaction_date: string;   // "YYYY-MM-DD"
  description: string;
  amount: number;             // negative = debit
  category: string | null;
  notes: string | null;
  card_last4: string | null;
  is_duplicate: boolean;
  is_matched: boolean;
  created_at: string;
  updated_at: string;
}
```

---

### `PATCH /api/transactions/[id]`
Update category and/or notes for a transaction.

**Request**:
```ts
{
  category?: string;
  notes?: string;
}
```

**Response `200`**: Updated `BankTransaction`.

---

### `DELETE /api/transactions/[id]`
Delete a single transaction.

**Response `204`**: No content.

---

## Reconciliation

### `POST /api/reconciliation/auto-match`
Run the automatic matching algorithm for all unmatched items.

**Request**: Empty body `{}`.

**Response `200`**:
```ts
{
  matched_count: number;
  unmatched_transactions: number;
  unmatched_receipts: number;
  matches: ReconciliationMatch[];
}
```

Where `ReconciliationMatch`:
```ts
{
  id: string;
  bank_transaction_id: string;
  receipt_id: string;
  match_type: "auto" | "manual";
  confidence_score: number;   // 0–1
  created_at: string;
}
```

---

### `POST /api/reconciliation/manual-match`
Manually link a bank transaction to a receipt.

**Request**:
```ts
{
  bank_transaction_id: string;
  receipt_id: string;
}
```

**Validation**: Both must be unmatched. Returns `409` with reason if either is already matched.

**Response `201`**: `ReconciliationMatch` with `match_type: "manual"` and `confidence_score: 1.0`.

---

### `DELETE /api/reconciliation/matches/[id]`
Unlink a match, returning both transaction and receipt to unmatched status.

**Response `204`**: No content.

---

### `GET /api/reconciliation/export`
Download reconciliation results as CSV.

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| `include` | `matched \| unmatched \| all` | Default `all` |

**Response**: `text/csv` file download.

CSV columns:
```
Type,MatchID,TransactionDate,TransactionDescription,TransactionAmount,CardLast4,ReceiptDate,Vendor,ReceiptTotal,Category,ExpenseType,MatchType,ConfidenceScore
```

Unmatched rows have empty receipt columns (or empty transaction columns for unmatched receipts).

---

## Common Error Codes

| HTTP | `code` | Meaning |
|------|--------|---------|
| `400` | `VALIDATION_ERROR` | Request body failed Zod schema |
| `401` | `UNAUTHENTICATED` | No valid session |
| `403` | `FORBIDDEN` | Resource exists but user doesn't own it |
| `404` | `NOT_FOUND` | Resource not found |
| `409` | `CONFLICT` | State conflict (e.g., already matched, wrong status) |
| `413` | `FILE_TOO_LARGE` | File exceeds size limit |
| `422` | `UNPROCESSABLE` | Semantic validation failed |
| `500` | `INTERNAL_ERROR` | Unexpected server error |
| `503` | `AI_UNAVAILABLE` | Gemini API temporarily unavailable |
