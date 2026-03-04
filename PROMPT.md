# Claude Code Prompt: AI-Powered Bookkeeping App
## Expense Tracker & Bank Reconciliation System

---

## Project Overview

Build a full-stack bookkeeping web application where users upload bank statements and receipts, Google Gemini 2.0 Flash extracts structured transaction data from both, and the system automatically reconciles (matches) bank transactions with their corresponding receipts.

**Stack:** Next.js (App Router) + Supabase (Auth, Database, Storage, Edge Functions) + Google Gemini 2.0 Flash API + Tailwind CSS

---

## System Architecture

```
User
 ├── /receipt              → Upload receipts/invoices → Gemini extraction → Receipts Table
 ├── /bank-statement       → Upload statements/CSVs  → Gemini extraction → Bank Transactions Table
 ├── /auth                 → Supabase Auth (email/password)
 └── /match-transactions   → Reconciliation engine   → Matched pairs view

                    ┌──────────────────────────────────┐
                    │            Supabase               │
                    │  ┌────────────────────────────┐  │
                    │  │   Bank Transactions Table  │  │
                    │  └────────────────────────────┘  │
                    │  ┌────────────────────────────┐  │
                    │  │   Storage (files)          │  │
                    │  └────────────────────────────┘  │
                    │  ┌────────────────────────────┐  │
                    │  │   Receipts Table           │  │
                    │  └────────────────────────────┘  │
                    │  ┌────────────────────────────┐  │
                    │  │   User Table (Auth)        │  │
                    │  └────────────────────────────┘  │
                    └──────────────────────────────────┘
                                    ↓
                          /match-transactions
                                  ↓
                                User
```

---

## Core Features

### 1. Receipt / Invoice Management
- Upload multiple files (JPG, PNG, PDF) via drag-and-drop or file picker
- AI extraction using Google Gemini 2.0 Flash
- Store extracted data in Supabase DB with link to original file in Supabase Storage
- User can view, edit, and delete receipts

### 2. Bank Statement Management
- Upload formats: PDF (scanned statements), Images, CSV files
- AI extraction using Google Gemini 2.0 Flash
- CSV: Auto-detect column mapping using intelligent header analysis via Gemini
- Store files in Supabase Storage: `/users/{userId}/statements/{year}/{month}/`
- All transactions stored in single table, identified by card (last 4 digits)
- User can view, filter (by card / date / amount), and categorize transactions

### 3. Transaction Matching
- Algorithm: Match bank transactions to receipts by exact amount + date within ± 3 days
- Display: Bank Transactions | Receipts in one unified table view
- Visual indicators: Matched (green), Unmatched (yellow) for transactions without a corresponding receipt
- One-to-one relationship: 1 bank transaction = 1 receipt

### 4. User Authentication
- Supabase Auth with email/password
- Sign up, sign in, password reset flows
- Row-Level Security (RLS) on all tables for complete data isolation between users

---

## AI Extraction Details

### Receipt Extraction (Gemini 2.0 Flash)

Extract the following fields from receipt images and PDFs:

| Field | Type | Notes |
|---|---|---|
| invoice_date | date | From receipt |
| vendor | text | Merchant/store name |
| category | text | e.g. Travel, Meals, Office |
| expense_type | text | e.g. Business, Personal |
| description | text | Line item summary |
| total_amount | decimal | Final charged amount |
| subtotal | decimal | Pre-tax total |
| total_tax | decimal | Combined tax |
| gst_hst | decimal | Canadian GST/HST |
| pst | decimal | Canadian PST |
| payment_method | text | e.g. "Visa ****4242" |
| card_last4 | text | Last 4 digits |
| location | text | Store address/city |
| notes | text | Any other relevant info |
| receipt_id | text | Printed receipt/invoice number |
| processed_date | timestamp | Auto-generated on insert |
| status | enum | pending → processing → processed / failed |

**Gemini Prompt — Receipt Extraction:**
```
Extract all data from this receipt or invoice image.
Return ONLY a JSON object with no preamble, explanation, or markdown fences.
Use null for any field that cannot be found.

{
  "invoice_date": "YYYY-MM-DD",
  "vendor": "",
  "category": "",
  "expense_type": "",
  "description": "",
  "total_amount": 0.00,
  "subtotal": 0.00,
  "total_tax": 0.00,
  "gst_hst": 0.00,
  "pst": 0.00,
  "payment_method": "",
  "card_last4": "",
  "location": "",
  "notes": "",
  "receipt_id": ""
}
```

---

### Bank Statement Extraction (Gemini 2.0 Flash)

Extract 6 core fields from statement images and PDFs:

| Field | Source |
|---|---|
| transaction_date | Extracted by AI |
| description | Extracted by AI |
| amount | Extracted by AI (negative = debit) |
| category | Auto-detected by AI from description |
| card_last4 | Extracted from statement header |
| notes | User-editable, blank on import |
| source_file_url | System-added (Supabase Storage URL) |

**Gemini Prompt — Bank Statement Extraction:**
```
Extract all transactions from this bank statement document.
Return ONLY a JSON object with no preamble or markdown fences.

{
  "card_last4": "4242",
  "statement_period": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "transactions": [
    {
      "transaction_date": "YYYY-MM-DD",
      "description": "original description text",
      "amount": -00.00,
      "category": "inferred category"
    }
  ]
}

Amount sign convention: negative = money leaving account (debit/purchase), positive = money coming in (credit/refund).
Category must be one of: Food & Dining, Travel, Shopping, Entertainment, Utilities, Healthcare, Office Supplies, Fuel, Other.
```

---

### CSV Column Mapping (Gemini 2.0 Flash)

Before importing a CSV bank statement, send the headers + first 3 data rows to Gemini to intelligently map columns.

**Gemini Prompt — CSV Column Mapping:**
```
Analyze these CSV headers and sample rows from a bank statement export.
Map each column to one of the required fields: date, description, amount.
Return ONLY a JSON object with no preamble or markdown fences.

Headers: [array of header strings]
Sample rows: [first 3 rows as arrays]

{
  "mapping": {
    "date": "column header name that contains the transaction date",
    "description": "column header name that contains the description",
    "amount": "column header name that contains the amount",
    "credit": "column header name for credits if separate from amount, else null",
    "debit": "column header name for debits if separate from amount, else null"
  },
  "date_format": "detected date format e.g. MM/DD/YYYY",
  "amount_convention": "signed | unsigned_split | unsigned_debit_only",
  "confidence": 0.95
}
```

Handle header variations including: "Trans Date", "Transaction Date", "Date Posted", "Settlement Date", "Posting Date", "Tran Date".
Validate data types before import — reject rows where amount is non-numeric or date is unparseable.

---

## Database Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Receipts Table
CREATE TABLE receipts (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_date           DATE,
  processed_date         TIMESTAMP DEFAULT NOW(),
  status                 TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  receipt_id             TEXT,
  vendor                 TEXT,
  category               TEXT,
  expense_type           TEXT,
  description            TEXT,
  total_amount           DECIMAL(10,2),
  subtotal               DECIMAL(10,2),
  total_tax              DECIMAL(10,2),
  gst_hst                DECIMAL(10,2),
  pst                    DECIMAL(10,2),
  payment_method         TEXT,
  card_last4             TEXT,
  location               TEXT,
  notes                  TEXT,
  file_url               TEXT,
  matched_transaction_id UUID,
  created_at             TIMESTAMP DEFAULT NOW(),
  updated_at             TIMESTAMP DEFAULT NOW()
);

-- Bank Transactions Table
CREATE TABLE bank_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_date    DATE NOT NULL,
  description         TEXT,
  amount              DECIMAL(10,2) NOT NULL,
  category            TEXT,
  notes               TEXT,
  source_file_url     TEXT,
  card_last4          TEXT,
  matched_receipt_id  UUID,
  match_confidence    DECIMAL(3,2) CHECK (match_confidence BETWEEN 0.0 AND 1.0),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- Cross-table foreign keys (added after both tables exist)
ALTER TABLE receipts
  ADD CONSTRAINT fk_receipts_transaction
  FOREIGN KEY (matched_transaction_id)
  REFERENCES bank_transactions(id) ON DELETE SET NULL;

ALTER TABLE bank_transactions
  ADD CONSTRAINT fk_transactions_receipt
  FOREIGN KEY (matched_receipt_id)
  REFERENCES receipts(id) ON DELETE SET NULL;

-- Row Level Security
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own receipts"
  ON receipts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own transactions"
  ON bank_transactions FOR ALL USING (auth.uid() = user_id);

-- updated_at auto-trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER receipts_updated_at BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Supabase Storage Structure

```
Storage Buckets:
├── receipts/
│   └── users/{userId}/receipts/{year}/{month}/{uuid}-{filename}
│
└── statements/
    └── users/{userId}/statements/{year}/{month}/{uuid}-{filename}
```

Storage RLS policies: users can only read and write files under their own `userId` path.

---

## User Workflows

### Workflow 1: Upload Receipts

1. User navigates to the **Receipts** page
2. Clicks "Upload" button or drags and drops files onto the upload zone
3. Selects one or more receipt files (JPG, PNG, PDF — max 10MB each)
4. Client validates file types and sizes before upload begins
5. Each file is uploaded to Supabase Storage: `/users/{userId}/receipts/{year}/{month}/`
6. A new receipt row is inserted into the `receipts` table with `status: pending` and the `file_url`
7. Supabase Edge Function `process-receipt` is triggered with `receipt_id` and `file_url`
8. Edge Function downloads the file, converts to base64, sends to Gemini 2.0 Flash API
9. Gemini returns extracted JSON — Edge Function updates the receipt row with all extracted fields, sets `status: processed`
10. If Gemini call fails, `status` is set to `failed` and the error message is stored in `notes`
11. Frontend subscribes to Supabase Realtime on the `receipts` table — shows live progress indicator per file
12. On completion, extracted data appears in the receipts table. User can click any row to edit fields inline
13. User saves edits — PATCH request updates the receipt row in the database

---

### Workflow 2: Upload Bank Statements

1. User navigates to the **Bank Statements** page
2. Clicks "Upload Statement" or drags and drops files onto the upload zone
3. Selects one or more statement files — supported formats: PDF, JPG, PNG, or CSV (max 20MB each)
4. Client performs format detection and routes to the correct processing path:
   - **PDF / Image** → skip to Step 6
   - **CSV** → proceed to Step 5 for column mapping
5. **CSV Column Mapping (CSV files only):**
   a. Client reads the CSV headers and first 3 data rows in-browser using a CSV parser
   b. Sends headers + sample rows to `/api/map-csv-columns` which calls Gemini for intelligent column detection
   c. A **Column Mapping Preview modal** appears showing detected mappings (e.g. "Trans Date" → Date, "Withdrawal" → Amount)
   d. User confirms or manually adjusts each mapping using dropdown selectors
   e. If mapping confidence is below 0.70, all fields default to manual selection and the user must confirm before proceeding
   f. User clicks "Confirm & Import" to close modal and proceed to Step 6
6. File is uploaded to Supabase Storage: `/users/{userId}/statements/{year}/{month}/`
7. A processing job record is created with `status: pending`, and Supabase Edge Function `process-statement` is triggered with `file_url`, `file_type`, and (if CSV) the confirmed `column_mapping` object
8. **Edge Function processing by file type:**
   - **PDF / Image:** Download file → convert to base64 → send to Gemini with bank statement extraction prompt → parse returned transactions array
   - **CSV:** Download file → parse rows using confirmed column mapping → normalize date formats and amount sign convention → skip header row and blank rows
9. `card_last4` is extracted from the statement header by Gemini (PDF/image) or from a "Card last 4 digits" input field shown in the upload modal (CSV, since CSV exports often omit this)
10. All extracted transactions are bulk-inserted into `bank_transactions` with `source_file_url`, `card_last4`, and `user_id`
11. Frontend subscribes to Supabase Realtime — shows live progress: "Imported 47 transactions..."
12. On completion, user is automatically redirected to the **Transactions** view filtered to the newly imported batch
13. User can:
    - Filter transactions by card (last 4 digits), date range, or amount range
    - Edit `category` or `notes` inline per row
    - Delete individual transactions or the entire import batch via a batch selector
    - Click "Match Transactions" from this view to jump directly to reconciliation

---

### Workflow 3: Transaction Matching (Reconciliation)

1. User navigates to the **Match Transactions** page
2. Page loads a unified split-table view: Bank Transactions (left) | Receipts (right)
3. User clicks **"Run Auto-Match"**
4. System fetches all unmatched bank transactions and unmatched receipts for the user
5. Server-side matching algorithm runs:
   - For each bank transaction, find receipts where:
     - `ABS(receipt.total_amount - transaction.amount) < 0.01` (exact amount)
     - `ABS(receipt.invoice_date - transaction.transaction_date) <= 3` (within ± 3 days)
   - Score candidates — highest confidence match wins
   - One-to-one constraint: once a receipt is matched it is removed from the candidate pool
6. Matched pairs are written to DB:
   - `bank_transactions.matched_receipt_id` = receipt UUID
   - `receipts.matched_transaction_id` = transaction UUID
   - `bank_transactions.match_confidence` = computed score (0.0–1.0)
7. Table refreshes with color-coded status indicators:
   - **Green row** = matched (paired transaction and receipt shown side-by-side)
   - **Yellow row** = unmatched bank transaction (no corresponding receipt)
   - **Grey row** = unmatched receipt (no corresponding bank transaction)
8. User can manually override any match by clicking an unmatched row to open a side drawer showing ranked candidate receipts
9. User can unlink any matched pair by clicking the unlink icon, which resets both records to `unmatched`
10. Export button generates a reconciliation CSV for accountant review

---

## File Structure

```
bookkeeping-app/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Sidebar nav + auth guard
│   │   ├── receipts/page.tsx
│   │   ├── bank-statements/page.tsx
│   │   └── match-transactions/page.tsx
│   └── api/
│       ├── map-csv-columns/route.ts      # Gemini CSV mapping endpoint
│       └── run-matching/route.ts         # Reconciliation algorithm
├── components/
│   ├── upload/
│   │   ├── DropZone.tsx
│   │   ├── CsvMappingModal.tsx
│   │   └── UploadProgress.tsx
│   ├── tables/
│   │   ├── ReceiptsTable.tsx
│   │   ├── TransactionsTable.tsx
│   │   └── MatchedPairsTable.tsx
│   └── ui/                               # shadcn/ui components
├── lib/
│   ├── gemini.ts                         # Google Gemini API client + prompts
│   ├── supabase/
│   │   ├── client.ts                     # Browser Supabase client
│   │   └── server.ts                     # Server Supabase client
│   └── matching.ts                       # Reconciliation algorithm
├── supabase/
│   ├── functions/
│   │   ├── process-receipt/index.ts      # Edge Function: receipt AI extraction
│   │   └── process-statement/index.ts   # Edge Function: statement AI extraction
│   └── migrations/
│       └── 001_initial_schema.sql
└── .env.local
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google Gemini
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
MAX_FILE_SIZE_MB=20
```

---

## Gemini API Integration

```typescript
// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export async function extractFromFile(
  base64Data: string,
  mimeType: string,
  prompt: string
): Promise<Record<string, unknown>> {
  const result = await geminiFlash.generateContent([
    { inlineData: { data: base64Data, mimeType } },
    prompt,
  ]);
  const text = result.response.text();
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export async function mapCsvColumns(
  headers: string[],
  sampleRows: string[][]
): Promise<Record<string, unknown>> {
  const result = await geminiFlash.generateContent([
    `Headers: ${JSON.stringify(headers)}\nSample rows: ${JSON.stringify(sampleRows)}\n\n[column mapping prompt]`
  ]);
  const text = result.response.text();
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
```

---

## Implementation Order

1. Initialize Next.js project with Tailwind CSS and shadcn/ui
2. Set up Supabase project — run migration SQL, configure Storage buckets, enable RLS policies
3. Implement Supabase Auth: sign up, sign in, password reset, middleware route protection
4. Build `lib/gemini.ts` and test extraction locally with a real receipt image + bank statement PDF
5. Create Supabase Edge Function `process-receipt` — wire to Gemini, test with `supabase functions serve`
6. Build `/receipts` page: DropZone → Storage upload → DB insert → Realtime status polling → inline-editable table
7. Create Supabase Edge Function `process-statement` — handle PDF/image and CSV branches
8. Build `/api/map-csv-columns` route + `CsvMappingModal` component with confidence-gated confirmation
9. Build `/bank-statements` page: upload flow → CSV mapping modal → Realtime progress → filterable transaction table
10. Build `lib/matching.ts` reconciliation algorithm
11. Build `/match-transactions` page: split-table view, auto-match button, manual override drawer, export CSV
12. End-to-end test: upload a real PDF bank statement + 5 receipt images → verify green matched pairs appear

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Gemini returns malformed JSON | Retry once; on second failure set `status: failed`, store raw text in `notes` |
| File exceeds size limit | Client rejects before upload with clear user-facing error |
| Gemini API unavailable | Return 503, surface a retry button in the UI |
| CSV mapping confidence below 0.70 | Force manual column selection before import is allowed to proceed |
| Duplicate transaction on import | Detect by `(user_id, transaction_date, amount, description)` composite uniqueness — warn user, skip duplicates |
| RLS violation | Return 403 — never expose rows belonging to other users |