# Tasks: AI-Powered Bookkeeping App

**Input**: Design documents from `/specs/002-ai-bookkeeping-app/`
**Branch**: `002-ai-bookkeeping-app`
**Tech Stack**: Next.js 15 (App Router) + TypeScript + Supabase + Gemini 2.5 Flash + Shadcn/UI + Tailwind CSS

**Tests**: E2E (Playwright) + unit tests (Vitest) included in Polish phase. Tests are NOT included per-story (no TDD explicitly requested in spec).

**Organization**: Tasks grouped by user story so each story is independently implementable and testable.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[US#]**: Maps to User Story from spec.md
- All file paths are relative to the Next.js app root (`BookKeepingApp/BookKeepingApp/`)

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Scaffold the project and configure all tooling before any feature work begins.

- [X] T001 Scaffold Next.js 15 App Router project with TypeScript and Tailwind CSS by running `npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"` in `BookKeepingApp/BookKeepingApp/`
- [X] T002 Initialize Shadcn/UI by running `npx shadcn@latest init` — selects default style, slate base colour, CSS variables; generates `components.json` and updates `src/app/globals.css`
- [X] T003 [P] Configure ESLint with Next.js + TypeScript strict rules in `eslint.config.mjs`; add `"lint": "next lint"` and `"lint:fix": "next lint --fix"` to `package.json`
- [X] T004 [P] Configure Prettier in `.prettierrc` (`{ "semi": false, "singleQuote": true, "printWidth": 100 }`) and add `"format": "prettier --write src/"` to `package.json`
- [X] T005 [P] Configure Vitest with React Testing Library: install `vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom` and create `vitest.config.ts` and `vitest.setup.ts`; add `"test": "vitest"` and `"test:coverage": "vitest run --coverage"` scripts
- [X] T006 [P] Configure Playwright: install `@playwright/test` and run `npx playwright install`; create `playwright.config.ts` pointing to `http://localhost:3000`; add `"test:e2e": "playwright test"` script
- [X] T007 Initialize Supabase local project by running `supabase init` in `BookKeepingApp/BookKeepingApp/` — creates `supabase/` directory with `config.toml`
- [X] T008 [P] Create `.env.local.example` at project root with all required variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `NEXT_PUBLIC_APP_URL`; add `.env.local` to `.gitignore`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, Supabase configuration, and shared utilities that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T009 Write Supabase migration `supabase/migrations/20260303000001_initial_schema.sql` — creates all custom enums (`receipt_status`, `statement_status`, `expense_type`, `match_type`), tables (`profiles`, `receipts`, `bank_statements`, `bank_transactions`, `reconciliation_matches`), all indexes, RLS policies (`auth.uid() = user_id` on all tables), `handle_new_user()` trigger on `auth.users`, and `updated_at` triggers; enable Realtime for `receipts` and `bank_statements` via `ALTER PUBLICATION supabase_realtime`; all per `data-model.md`
- [X] T010 Create Supabase Storage bucket configuration in a second migration `supabase/migrations/20260303000002_storage.sql` — creates private `receipts` bucket (10 MB limit, jpeg/png/pdf) and private `bank-statements` bucket (20 MB limit, jpeg/png/pdf/csv); adds Storage RLS policies so `auth.uid()` must match the first path segment `{user_id}/`
- [ ] T011 Apply all migrations to local Supabase: run `supabase start` then `supabase db reset`; verify all tables, RLS policies, and buckets exist in Supabase Studio at `http://localhost:54323`
- [X] T012 [P] Generate TypeScript types from local DB by running `supabase gen types typescript --local > src/types/supabase.ts`
- [X] T013 [P] Define application-level Zod schemas and TypeScript types in `src/types/index.ts` — schemas for `Receipt`, `BankStatement`, `BankTransaction`, `ReconciliationMatch`, `CsvColumnMapping`, `CsvColumnDetectionResult`; all field types per `data-model.md` and `contracts/api-routes.md`
- [X] T014 [P] Create Supabase browser client singleton in `src/lib/supabase/client.ts` using `createBrowserClient` from `@supabase/ssr`; import typed DB from `src/types/supabase.ts`
- [X] T015 [P] Create Supabase server client factory in `src/lib/supabase/server.ts` using `createServerClient` from `@supabase/ssr` with cookie read/write helpers (for use in Server Components and Route Handlers)
- [X] T016 Create Next.js middleware in `src/middleware.ts` using `createServerClient` — refreshes session on every request; redirects unauthenticated requests to `/sign-in` for all `(dashboard)` paths; redirects authenticated users away from auth pages to `/`
- [X] T017 [P] Create Edge Function shared Supabase admin client in `supabase/functions/_shared/supabase.ts` using `jsr:@supabase/supabase-js@2` with `SUPABASE_SERVICE_ROLE_KEY`
- [X] T018 [P] Create Edge Function shared Gemini client in `supabase/functions/_shared/gemini.ts` using `npm:@google/genai` — instantiates `GoogleGenAI` with `GEMINI_API_KEY`; exports `GEMINI_MODEL = 'gemini-2.5-flash'`
- [X] T019 [P] Create Edge Function exponential-backoff retry helper in `supabase/functions/_shared/retry.ts` — retries on HTTP 429 up to 3 times with delays 1 s / 2 s / 4 s
- [X] T020 [P] Create Gemini client and all extraction helpers in `src/lib/gemini.ts` — exports `extractReceiptData(base64: string, mimeType: string)`, `extractStatementTransactions(base64: string, mimeType: string)`, and `detectCsvColumnMapping(headers: string[], sampleRows: Record<string, string>[])` using `@google/genai` with `responseMimeType: 'application/json'` + `responseJsonSchema`; model `gemini-2.5-flash`
- [X] T021 [P] Implement pure reconciliation matching algorithm in `src/lib/matching.ts` — exports `runAutoMatch(transactions: BankTransaction[], receipts: Receipt[]): ReconciliationMatch[]`; matches when `Math.abs(tx.amount) - receipt.total_amount < 0.01` AND `dateDiffDays <= 3`; greedy sorted approach per `data-model.md`; confidence score formula: `1.0 - (dateDiff / 3) * 0.1`
- [X] T022 [P] Create typed API response helpers in `src/lib/api/response.ts` — exports `apiSuccess(data, status?)`, `apiError(message, code, status?)` returning `NextResponse` with consistent JSON shapes per `contracts/api-routes.md`
- [X] T023 [P] Add all Shadcn/UI base components needed across stories: run `npx shadcn@latest add button input label form card table badge toast dialog drawer sheet select separator skeleton progress scroll-area popover tooltip`

**Checkpoint**: Database schema live locally, shared utilities ready, all Shadcn components installed — user story implementation can begin.

---

## Phase 3: User Story 1 — User Registration and Secure Access (Priority: P1) 🎯 MVP

**Goal**: Users can register, sign in, reset password, and access a private dashboard. All routes are protected.

**Independent Test**: Register a new account → sign in → verify dashboard loads → sign in as a different user → verify data is isolated (different dashboard, no shared data visible).

- [X] T024 [US1] Create server actions for all auth operations in `src/lib/auth/actions.ts` — `signUp(email, password)`, `signIn(email, password)`, `signOut()`, `resetPassword(email)`, `updatePassword(newPassword)` — all using Supabase server client; return typed `{ error? }` objects; include redirect logic after success
- [X] T025 [US1] Create auth layout in `src/app/(auth)/layout.tsx` — centered single-column card layout with app logo/name; no sidebar or nav
- [X] T026 [US1] Create sign-up page `src/app/(auth)/sign-up/page.tsx` — form with email + password fields using `react-hook-form` + Zod validation; calls `signUp` action; shows "Check your email" message on success; links to sign-in
- [X] T027 [US1] Create sign-in page `src/app/(auth)/sign-in/page.tsx` — form with email + password; calls `signIn` action; shows error on invalid credentials; links to sign-up and forgot password
- [X] T028 [US1] Create reset-password page `src/app/(auth)/reset-password/page.tsx` — two states: (1) email input form calling `resetPassword`, (2) new password form (when `?type=recovery` token in URL) calling `updatePassword`
- [X] T029 [US1] Create Supabase auth callback route handler `src/app/auth/callback/route.ts` — exchanges `code` for session using `supabase.auth.exchangeCodeForSession(code)`; handles email confirmations and password reset redirects; redirects to `/` on success
- [X] T030 [US1] Create Sidebar navigation component `src/components/layout/Sidebar.tsx` — vertical nav with links: Receipts (`/receipts`), Bank Statements (`/statements`), Reconciliation (`/reconciliation`); shows current user email; sign-out button that calls `signOut` action
- [X] T031 [US1] Create protected dashboard layout `src/app/(dashboard)/layout.tsx` — wraps content with `Sidebar`; fetches session server-side; redirects to `/sign-in` if no session (defence-in-depth beyond middleware)
- [X] T032 [US1] Create dashboard home/redirect page `src/app/(dashboard)/page.tsx` — redirects to `/receipts` (or shows a simple welcome card with links to the three main sections)
- [X] T033 [US1] Verify middleware protection: confirm that visiting `http://localhost:3000/receipts` without a session redirects to `/sign-in`; confirm signing in redirects back to the intended page

**Checkpoint**: Full auth flow works. Register → email confirm → sign-in → dashboard → sign-out cycle verified manually.

---

## Phase 4: User Story 2 — Upload and Extract Receipt Data (Priority: P1)

**Goal**: Users upload receipt images/PDFs; AI extracts structured data in the background; status updates appear in real-time without page refresh; users can edit and delete receipts.

**Independent Test**: Upload a receipt JPG → processing indicator appears → extracted vendor/date/total populate the row automatically → edit a field and save → delete the receipt.

- [X] T034 [US2] Build `process-receipt` Edge Function in `supabase/functions/process-receipt/index.ts` — accepts `{ receipt_id, storage_path, mime_type }` via POST; responds `202 Accepted` immediately; uses `EdgeRuntime.waitUntil()` to: (1) download file bytes from `receipts` Storage bucket via admin client, (2) base64-encode, (3) call `extractReceiptData` via Gemini using the schema from `contracts/edge-functions.md`, (4) validate with Zod, (5) `UPDATE receipts SET status='complete', vendor_name=..., ...` or `SET status='failed', extraction_error=...`; retry Gemini 429s via shared retry helper
- [X] T035 [P] [US2] Create receipt list + create API route `src/app/api/receipts/route.ts` — `GET` returns paginated receipts for current user with `is_matched` derived field (check `reconciliation_matches`); `POST` validates body with Zod (file_size ≤ 10 MB), inserts receipt row with `status='pending'`, then calls `process-receipt` Edge Function via HTTP POST with service role auth; returns `201 { id, status }`
- [X] T036 [P] [US2] Create receipt detail routes `src/app/api/receipts/[id]/route.ts` — `GET` returns single receipt (403 if wrong user); `PATCH` validates and updates allowed fields only; `DELETE` deletes Storage file first then DB row (cascades unlink any match); all scoped to `auth.uid()`
- [X] T037 [US2] Create receipt retry route `src/app/api/receipts/[id]/retry/route.ts` — `POST` checks status is `failed` (409 if not), sets status back to `processing`, calls `process-receipt` Edge Function
- [X] T038 [US2] Create `ReceiptUploadZone` component `src/components/receipts/ReceiptUploadZone.tsx` — drag-and-drop + file picker; accepts JPEG/PNG/PDF; validates file size ≤ 10 MB client-side before upload (shows "File exceeds 10 MB limit" toast on failure); uploads directly to Supabase Storage `receipts` bucket using browser client; calls `POST /api/receipts` with `storage_path`, `file_name`, `file_size`, `file_mime_type`; supports multiple files queued sequentially
- [X] T039 [US2] Create `ReceiptStatusBadge` component `src/components/receipts/ReceiptStatusBadge.tsx` — renders Shadcn `Badge` with appropriate colour and label per status: pending (grey/outline), processing (blue + spinner), complete (green), failed (red + retry button)
- [X] T040 [US2] Create `ReceiptTable` component `src/components/receipts/ReceiptTable.tsx` — displays all user receipts using Shadcn `Table`; columns: status badge, file name, vendor, date, total amount, GST/HST, PST, category, actions (edit/delete); subscribes to Supabase Realtime `receipts` table `UPDATE` events per `contracts/realtime-channels.md` to update rows in-place without page reload; shows `Skeleton` rows while loading
- [X] T041 [US2] Create `ReceiptEditSheet` component `src/components/receipts/ReceiptEditSheet.tsx` — Shadcn `Sheet` (side drawer) with all editable receipt fields using `react-hook-form`; pre-fills with current values; calls `PATCH /api/receipts/[id]` on save; shows field-level validation errors; closes on success with success toast
- [X] T042 [US2] Create `ReceiptDeleteConfirm` component `src/components/receipts/ReceiptDeleteConfirm.tsx` — Shadcn `Dialog` confirmation; calls `DELETE /api/receipts/[id]`; removes row from table on success
- [X] T043 [US2] Create receipts page `src/app/(dashboard)/receipts/page.tsx` — Server Component that fetches initial receipts list; renders `ReceiptUploadZone` at top and `ReceiptTable` below with client-side Realtime updates; shows empty state with upload prompt when no receipts exist

**Checkpoint**: Full receipt workflow testable end-to-end: upload → processing indicator → extracted data → edit → delete.

---

## Phase 5: User Story 3 — Upload and Import Bank Statements (Priority: P2)

**Goal**: Users upload bank statements (PDF/image/CSV); transactions are extracted and imported with real-time progress; users can filter, edit, and delete transactions.

**Independent Test**: Upload a bank statement PDF → "Importing... N transactions" progress ticker → all transactions appear in list → filter by date range → edit category on a transaction → delete one transaction.

- [X] T044 [US3] Build `process-statement` Edge Function `supabase/functions/process-statement/index.ts` — accepts `{ statement_id, storage_path, mime_type, csv_mapping? }` via POST; responds `202 Accepted` immediately; PDF/image path: calls Gemini with statement extraction prompt returning `{ card_last4, transactions[] }`; CSV path: downloads file, parses with `papaparse` (import via `npm:papaparse`), applies `csv_mapping`; both paths: normalise amounts (handle parenthetical negatives, debit/credit split), dedup against existing transactions via `(user_id, transaction_date, amount, trim(lower(description)))`, bulk-insert non-duplicates, update `transaction_count` every 25 rows for live progress, set `status='complete'` on finish or `status='failed'` on error; set `card_last4` on statement row from Gemini extraction if not already provided
- [X] T045 [P] [US3] Create CSV column mapping API route `src/app/api/map-csv-columns/route.ts` — `POST` accepts `{ storage_path }` of uploaded CSV file; reads from Storage via server Supabase client; uses Papa Parse to extract headers + first 5 rows; calls `detectCsvColumnMapping()` from `src/lib/gemini.ts` (Gemini detects column roles); returns `CsvColumnDetectionResult` with `confidence` score; per `CLAUDE.md` architecture
- [X] T046 [P] [US3] Create statement list + create API route `src/app/api/statements/route.ts` — `GET` returns all statements for current user; `POST` validates body (file_size ≤ 20 MB), inserts `bank_statements` row; for CSV: calls `/api/map-csv-columns` internally and returns `{ id, status: 'awaiting_mapping', csv_column_mapping: ... }`; for PDF/image: sets `status='pending'`, calls `process-statement` Edge Function, returns `{ id, status: 'processing' }`
- [X] T047 [P] [US3] Create statement confirm-mapping route `src/app/api/statements/[id]/confirm-mapping/route.ts` — `POST` validates mapping body, updates `bank_statements.csv_column_mapping`, sets `status='processing'`, calls `process-statement` Edge Function with mapping; create `src/app/api/statements/[id]/route.ts` with `DELETE` that removes Storage file + DB row (cascades to `bank_transactions`)
- [X] T048 [P] [US3] Create transaction API routes — `src/app/api/transactions/route.ts` `GET` with query filters (card_last4, date_from, date_to, amount_min, amount_max, statement_id, unmatched_only, page, limit) per `contracts/api-routes.md`; `src/app/api/transactions/[id]/route.ts` `PATCH` (category + notes) and `DELETE`
- [X] T049 [US3] Create `StatementUploadZone` component `src/components/statements/StatementUploadZone.tsx` — accepts PDF/image/CSV; validates 20 MB client-side; uploads to `bank-statements` Storage bucket; calls `POST /api/statements`; for CSV response with `awaiting_mapping`: opens `CsvMappingModal`; for PDF/image: shows processing state immediately
- [X] T050 [US3] Create `CsvMappingModal` component `src/components/statements/CsvMappingModal.tsx` — Shadcn `Dialog`; displays detected column mapping + first 3 sample rows in a preview table; `Select` dropdowns for each required column (date, description, amount or debit/credit); if `confidence >= 0.85` shows auto-detected values with "Confirm" button; if `confidence < 0.85` forces user to select before enabling "Import"; calls `POST /api/statements/[id]/confirm-mapping` on submit
- [X] T051 [US3] Create `ImportProgressToast` component `src/components/statements/ImportProgressToast.tsx` — subscribes to Supabase Realtime `bank_statements` table `UPDATE` events per `contracts/realtime-channels.md`; shows live "Importing… {transaction_count} transactions" toast while `status = 'processing'`; shows success/fail toast on terminal status
- [X] T052 [US3] Create `TransactionFilters` component `src/components/statements/TransactionFilters.tsx` — filter bar with card last4 `Select`, date range pickers, and amount range `Input` fields; emits filter change event to parent; uses Shadcn `Popover` + `Select`
- [X] T053 [US3] Create `TransactionTable` component `src/components/statements/TransactionTable.tsx` — paginated table of bank transactions; inline-editable category and notes cells (click to edit, blur to save via `PATCH /api/transactions/[id]`); shows `is_matched` indicator; `is_duplicate` rows shown with warning badge; delete action per row
- [X] T054 [US3] Create bank statements page `src/app/(dashboard)/statements/page.tsx` — Server Component that fetches initial statements list; renders `StatementUploadZone`, import history cards, and `TransactionFilters` + `TransactionTable` below; shows empty state when no statements imported

**Checkpoint**: Full statement import cycle testable: upload PDF/CSV → mapping flow (CSV) → progress ticker → transactions list → filter → edit → delete.

---

## Phase 6: User Story 4 — Automatic Transaction Reconciliation (Priority: P2)

**Goal**: Users run auto-match, review matched/unmatched items colour-coded, manually override matches, unlink pairs, and export results as CSV.

**Independent Test**: Import matching transaction and receipt → run auto-match → verify matched pair appears green → unlink the pair → verify both return to unmatched → manually re-match them → export CSV and verify row is present.

- [X] T055 [P] [US4] Create auto-match API route `src/app/api/run-matching/route.ts` — `POST` fetches all unmatched transactions and complete unmatched receipts for current user; calls `runAutoMatch()` from `src/lib/matching.ts`; bulk-inserts `reconciliation_matches` rows; returns `{ matched_count, unmatched_transactions, unmatched_receipts, matches }` per `CLAUDE.md` architecture
- [X] T056 [P] [US4] Create manual-match route `src/app/api/reconciliation/manual-match/route.ts` — `POST` validates `{ bank_transaction_id, receipt_id }`; checks both are unmatched (409 if either already matched); inserts `reconciliation_matches` row with `match_type='manual'`, `confidence_score=1.0`
- [X] T057 [P] [US4] Create unlink route `src/app/api/reconciliation/matches/[id]/route.ts` — `DELETE` verifies ownership via `user_id` on match row; deletes from `reconciliation_matches`; returns `204`
- [X] T058 [P] [US4] Create CSV export route `src/app/api/reconciliation/export/route.ts` — `GET` with optional `include` query param; queries all matches + unmatched transactions + unmatched receipts for user; formats as CSV per column spec in `contracts/api-routes.md`; returns `text/csv` with `Content-Disposition: attachment; filename="reconciliation.csv"`
- [X] T059 [US4] Create `ReconciliationSummaryBar` component `src/components/reconciliation/ReconciliationSummaryBar.tsx` — shows count chips (matched green, unmatched transactions yellow, unmatched receipts grey); "Run Auto-Match" button that calls `POST /api/run-matching` with loading state; "Export CSV" button that calls `GET /api/reconciliation/export`
- [X] T060 [US4] Create `MatchedPairRow` component `src/components/reconciliation/MatchedPairRow.tsx` — green-tinted row showing transaction date/description/amount alongside matched receipt vendor/date/total and confidence score badge; "Unlink" button calls `DELETE /api/reconciliation/matches/[id]`
- [X] T061 [US4] Create `UnmatchedTransactionRow` component `src/components/reconciliation/UnmatchedTransactionRow.tsx` — yellow-tinted row showing transaction details; "Find Match" button opens `CandidateReceiptsDrawer`
- [X] T062 [US4] Create `UnmatchedReceiptRow` component `src/components/reconciliation/UnmatchedReceiptRow.tsx` — grey-tinted row showing receipt vendor/date/total with no match
- [X] T063 [US4] Create `CandidateReceiptsDrawer` component `src/components/reconciliation/CandidateReceiptsDrawer.tsx` — Shadcn `Drawer` opened when user clicks "Find Match" on an unmatched transaction; queries unmatched receipts and sorts them by amount+date proximity; shows ranked candidates with similarity indicators; "Match" button on each candidate calls `POST /api/reconciliation/manual-match`
- [X] T064 [US4] Create `ReconciliationView` component `src/components/reconciliation/ReconciliationView.tsx` — renders `ReconciliationSummaryBar` then three sections: matched pairs (`MatchedPairRow` list), unmatched transactions (`UnmatchedTransactionRow` list), unmatched receipts (`UnmatchedReceiptRow` list); fetches all three data sets from Supabase on mount; refreshes after any match/unlink action
- [X] T065 [US4] Create reconciliation page `src/app/(dashboard)/reconciliation/page.tsx` — Server Component with initial data fetch; renders `ReconciliationView`; shows empty state when no transactions or receipts have been imported

**Checkpoint**: Complete reconciliation workflow: auto-match → review colour-coded results → unlink → manual match → export CSV.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Testing, error handling, edge states, and deployment readiness.

- [X] T066 [P] Write Vitest unit tests for matching algorithm `tests/unit/lib/matching.test.ts` — covers: exact amount match, amount within $0.01 tolerance, 3-day date window, >3-day date gap (no match), one-to-one exclusivity, empty inputs, all-unmatched result, confidence score calculation
- [X] T067 [P] Write Vitest unit tests for Gemini response parser in `src/lib/gemini.ts` — mock `@google/genai` responses; test malformed JSON handling (retry once, then fail gracefully); test null field extraction; test date format normalisation
- [X] T068 [P] Write Playwright E2E test for auth flow `tests/e2e/auth.spec.ts` — register new user, confirm email (mock), sign in, access dashboard, sign out, verify redirect to sign-in
- [X] T069 [P] Write Playwright E2E test for receipt upload `tests/e2e/receipts.spec.ts` — upload fixture JPEG receipt, wait for `status=complete` via Realtime, verify extracted fields appear, edit vendor name, save, delete receipt
- [X] T070 [P] Write Playwright E2E test for bank statement import `tests/e2e/statements.spec.ts` — upload fixture CSV, verify mapping modal appears, confirm mapping, wait for `status=complete`, verify transaction count in list, filter by date range
- [X] T071 [P] Write Playwright E2E test for reconciliation `tests/e2e/reconciliation.spec.ts` — pre-load matching transaction + receipt fixture, run auto-match, verify green matched pair, unlink, verify both return to unmatched, manually re-match, export CSV and verify download
- [X] T072 Add global loading skeleton `src/app/loading.tsx` and route-level `loading.tsx` files in `src/app/(dashboard)/receipts/`, `statements/`, `reconciliation/` using Shadcn `Skeleton` components
- [X] T073 [P] Add global error boundary `src/app/error.tsx` (client component with "Try Again" button) and `src/app/not-found.tsx` (404 page with link to dashboard)
- [X] T074 Add empty-state illustrations/copy for all three main pages when no data exists: receipts (upload prompt), statements (upload prompt), reconciliation (import data first prompt)
- [ ] T075 Set Supabase Edge Function secrets and deploy: run `supabase secrets set GEMINI_API_KEY=<key>` then `supabase functions deploy process-receipt` and `supabase functions deploy process-statement` against the cloud project
- [X] T076 Run `npm run build` — fix all TypeScript compile errors and ESLint violations until build exits clean
- [X] T077 Run `npm run test:coverage` — verify `src/lib/matching.ts` and `src/lib/gemini.ts` reach ≥ 80 % coverage; add targeted tests if below threshold
- [ ] T078 Run `npm run test:e2e` against local Supabase + Next.js dev server — verify all Playwright scenarios pass; fix any flaky assertions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 Auth)**: Depends on Phase 2 — no other story dependencies
- **Phase 4 (US2 Receipts)**: Depends on Phase 2 — no dependency on US1 (auth middleware handles protection)
- **Phase 5 (US3 Statements)**: Depends on Phase 2 — no dependency on US1/US2
- **Phase 6 (US4 Reconciliation)**: Depends on Phase 2 — reads `receipts` + `bank_transactions` tables but no code dependency on US2/US3 phases
- **Phase 7 (Polish)**: Depends on all previous phases complete

### User Story Dependencies

| Story | Depends On | Notes |
|-------|-----------|-------|
| US1 Auth | Phase 2 | Self-contained; middleware protects all dashboard routes |
| US2 Receipts | Phase 2 | Auth protection is via middleware — no hard code dep on US1 tasks |
| US3 Statements | Phase 2 | Independent; shares Storage patterns with US2 but different tables |
| US4 Reconciliation | Phase 2 | Reads from both `receipts` and `bank_transactions` — needs real data to be useful, but no code dependency on US2/US3 tasks |

### Within Each Story

- API routes before components (components consume the routes)
- Edge Function before its triggering API route
- Shared lib utilities (`src/lib/gemini.ts`, `src/lib/matching.ts`) before anything that calls them (handled in Phase 2)

---

## Parallel Opportunities

### Phase 1 — run T003, T004, T005, T006 together:
```
T003: Configure ESLint         → eslint.config.mjs
T004: Configure Prettier       → .prettierrc
T005: Configure Vitest         → vitest.config.ts
T006: Configure Playwright     → playwright.config.ts
```

### Phase 2 — run T012–T023 together (after T011):
```
T012: Generate Supabase types  → src/types/supabase.ts
T013: Define Zod schemas       → src/types/index.ts
T014: Supabase browser client  → src/lib/supabase/client.ts
T015: Supabase server client   → src/lib/supabase/server.ts
T017: Edge Function admin client → supabase/functions/_shared/supabase.ts
T018: Edge Function Gemini client → supabase/functions/_shared/gemini.ts
T019: Retry utility            → supabase/functions/_shared/retry.ts
T020: Gemini helpers           → src/lib/gemini.ts
T021: Matching algorithm       → src/lib/matching.ts
T022: API response helpers     → src/lib/api/response.ts
T023: Install Shadcn components (CLI)
```

### Phase 4 (US2) — T035 + T036 in parallel:
```
T035: Receipts list/create route  → src/app/api/receipts/route.ts
T036: Receipt detail routes       → src/app/api/receipts/[id]/route.ts
```

### Phase 5 (US3) — T045, T046, T047, T048 in parallel:
```
T045: CSV mapping route           → src/app/api/map-csv-columns/route.ts
T046: Statement list/create route → src/app/api/statements/route.ts
T047: Statement detail + confirm  → src/app/api/statements/[id]/...
T048: Transaction routes          → src/app/api/transactions/...
```

### Phase 6 (US4) — T055, T056, T057, T058 in parallel:
```
T055: Auto-match route            → src/app/api/run-matching/route.ts
T056: Manual-match route          → src/app/api/reconciliation/manual-match/...
T057: Unlink route                → src/app/api/reconciliation/matches/[id]/...
T058: Export route                → src/app/api/reconciliation/export/...
```

### Phase 7 — T066–T074 all parallelisable

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 — both P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 Auth → **validate: can register + sign in**
4. Complete Phase 4: US2 Receipts → **validate: upload receipt, AI extracts data**
5. **STOP AND DEMO**: Working auth + receipt organiser with AI extraction

### Incremental Delivery

1. **Phase 1 + 2** → Foundation ready
2. **Phase 3 (US1)** → Secure auth → demo-able
3. **Phase 4 (US2)** → Receipt AI extraction → MVP shipped
4. **Phase 5 (US3)** → Bank statement import → adds statement import value
5. **Phase 6 (US4)** → Reconciliation → full product value delivered
6. **Phase 7** → Tests + polish → production-ready

### Parallel Team Strategy

With two developers after Phase 2 is complete:
- **Dev A**: US1 Auth (Phase 3) → US4 Reconciliation backend (T055–T058)
- **Dev B**: US2 Receipts (Phase 4) → US3 Statements (Phase 5)
- Merge and integrate at Phase 6 UI tasks

---

## Task Count Summary

| Phase | Tasks | Parallel Tasks |
|-------|-------|----------------|
| Phase 1: Setup | 8 (T001–T008) | 5 |
| Phase 2: Foundational | 15 (T009–T023) | 12 |
| Phase 3: US1 Auth | 10 (T024–T033) | 0 |
| Phase 4: US2 Receipts | 10 (T034–T043) | 2 |
| Phase 5: US3 Statements | 11 (T044–T054) | 4 |
| Phase 6: US4 Reconciliation | 11 (T055–T065) | 4 |
| Phase 7: Polish | 13 (T066–T078) | 7 |
| **Total** | **78** | **34** |

---

## Notes

- `[P]` tasks target different files with no shared state — safe to run concurrently
- Each user story is independently completable and demonstrates standalone value
- Commit after each task or logical group using Conventional Commits (`feat(receipts): add upload zone`)
- Stop at any phase checkpoint to validate the story independently before continuing
- `src/lib/gemini.ts` is the **single** Gemini API entry point for the Next.js app (per `CLAUDE.md`) — do not duplicate Gemini calls in route handlers
- Edge Functions use Deno runtime — use `jsr:` and `npm:` specifiers, not bare npm imports
- Never commit `GEMINI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY`; always use `.env.local` (gitignored)
