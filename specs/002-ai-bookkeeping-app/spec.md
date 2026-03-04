# Feature Specification: AI-Powered Bookkeeping App

**Feature Branch**: `002-ai-bookkeeping-app`
**Created**: 2026-03-03
**Status**: Draft
**Input**: User description: "Build a full-stack bookkeeping web application where users upload bank statements and receipts, AI extracts structured transaction data from both, and the system automatically reconciles (matches) bank transactions with their corresponding receipts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Registration and Secure Access (Priority: P1)

A new user creates an account with their email and password, signs in, and gains access to their private bookkeeping workspace. The system ensures each user's financial data is completely isolated from other users.

**Why this priority**: Authentication is a prerequisite for all other functionality. Without secure, isolated accounts, no other feature can operate safely.

**Independent Test**: Can be fully tested by registering an account, signing in, and verifying that the dashboard is accessible only to the authenticated user — delivering a secure, private workspace.

**Acceptance Scenarios**:

1. **Given** a visitor without an account, **When** they register with a valid email and password, **Then** their account is created and they are redirected to their personal dashboard.
2. **Given** a registered user, **When** they sign in with correct credentials, **Then** they access their dashboard and see only their own data.
3. **Given** a user who forgot their password, **When** they request a reset and follow the emailed link, **Then** they can set a new password and regain access.
4. **Given** two separate users each with uploaded receipts, **When** either user views their data, **Then** they see only their own receipts and transactions — never another user's.

---

### User Story 2 - Upload and Extract Receipt Data (Priority: P1)

A business owner uploads one or more receipt or invoice files (photos or PDFs). The system automatically extracts structured data from each file — including the vendor name, date, total amount, tax breakdown, and payment method — and presents the extracted data for review and correction.

**Why this priority**: Receipt capture is the core value proposition and the starting point of the reconciliation workflow. Without it, there is nothing to match against bank transactions.

**Independent Test**: Can be fully tested by uploading a receipt photo and verifying that extracted fields (vendor, date, total) appear in the receipts list — delivering immediate value as a digital receipt organizer even before bank statements are involved.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they upload a JPG, PNG, or PDF receipt via drag-and-drop or file picker, **Then** the file is accepted and a processing indicator appears for that file.
2. **Given** a receipt being processed, **When** extraction completes successfully, **Then** the extracted data (vendor, date, total amount, tax amounts, payment method, card last 4 digits, category, expense type) appears in the receipts list without requiring a page refresh.
3. **Given** a successfully extracted receipt, **When** the user clicks a row to edit it, **Then** they can correct any field and save the changes.
4. **Given** a receipt where extraction fails (e.g., illegible image), **When** the failure occurs, **Then** the item is marked as failed, the user sees a clear error indicator, and can retry or manually enter data.
5. **Given** a user with multiple receipts, **When** they view the receipts list, **Then** they can see all their receipts and delete any individual receipt.

---

### User Story 3 - Upload and Import Bank Statements (Priority: P2)

A user uploads their bank statement — as a PDF, scanned image, or CSV export — and the system extracts all transactions with their dates, descriptions, amounts, and categories. Transactions are stored and viewable in a filterable list.

**Why this priority**: Bank statement import is the second pillar of reconciliation. It is blocked by authentication (P1) and unlocks the matching workflow.

**Independent Test**: Can be fully tested by uploading a bank statement PDF and verifying that all transactions appear in the transaction list with correct dates and amounts — delivering value as a transaction log even before matching.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they upload a PDF or image bank statement, **Then** the system extracts all transactions and imports them, displaying real-time progress (e.g., "Imported 47 transactions...").
2. **Given** a user uploading a CSV bank statement, **When** the file is selected, **Then** a column mapping preview appears showing how CSV headers map to required fields (date, description, amount).
3. **Given** the column mapping preview, **When** the detected confidence is high, **Then** the user can confirm with one click; **When** confidence is low, **Then** the user must manually select the correct columns before proceeding.
4. **Given** a successfully imported bank statement, **When** the user views the transactions list, **Then** they can filter by card (last 4 digits), date range, and amount range.
5. **Given** a transaction in the list, **When** the user edits its category or notes inline, **Then** the change is saved immediately.
6. **Given** a user re-uploading the same statement, **When** duplicate transactions are detected (same date, amount, and description), **Then** the system warns the user and skips the duplicates rather than importing them again.

---

### User Story 4 - Automatic Transaction Reconciliation (Priority: P2)

A user runs automatic matching between their bank transactions and receipts. The system pairs transactions with receipts based on matching amounts and nearby dates, displaying the results with clear visual indicators for matched, unmatched, and pending items.

**Why this priority**: Reconciliation is the primary productivity outcome. It depends on both receipts (P1) and bank statements (P2) being imported first.

**Independent Test**: Can be fully tested by importing at least one matching receipt and bank transaction, running auto-match, and verifying the matched pair appears highlighted — delivering the core accounting value of verified expense records.

**Acceptance Scenarios**:

1. **Given** a user with imported transactions and receipts, **When** they run auto-match, **Then** the system pairs each bank transaction with a receipt where the amounts match exactly (within $0.01) and dates are within 3 days of each other.
2. **Given** the matching results, **When** displayed, **Then** matched pairs are visually highlighted (green), unmatched bank transactions are flagged (yellow), and unmatched receipts are indicated separately (grey).
3. **Given** a matched pair, **When** the user clicks the unlink button, **Then** both the bank transaction and receipt return to unmatched status and are available for re-matching.
4. **Given** an unmatched bank transaction, **When** the user clicks it, **Then** a panel shows ranked candidate receipts; the user can select one to manually create a match.
5. **Given** completed reconciliation, **When** the user clicks export, **Then** a CSV file is downloaded containing all matched and unmatched items for accountant review.

---

### Edge Cases

- What happens when a receipt image is too blurry or low-resolution for data extraction?
- How does the system handle a bank statement where the card number is not visible in the document?
- What happens when two bank transactions have the same amount and date (e.g., two purchases at the same store)?
- How does the system handle a CSV where the amount column uses parentheses for negative values (e.g., `(42.00)` for debits)?
- What happens if the user uploads the same receipt file twice?
- How does the system behave when a file exceeds the maximum allowed size?
- What happens if the AI extraction service is temporarily unavailable during upload?

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Access Control**

- **FR-001**: Users MUST be able to register an account with an email address and password.
- **FR-002**: Users MUST be able to sign in, sign out, and reset their forgotten password via email.
- **FR-003**: Each user's receipts, transactions, and uploaded files MUST be fully isolated — no user may view or modify another user's data.

**Receipt Management**

- **FR-004**: Users MUST be able to upload one or more receipt or invoice files (JPEG, PNG, PDF formats) using drag-and-drop or a file picker.
- **FR-005**: The system MUST reject files that exceed the maximum allowed size (10 MB per receipt file) before upload begins, with a clear message.
- **FR-006**: The system MUST automatically extract the following fields from uploaded receipt files: vendor name, transaction date, total amount, subtotal, tax amounts (including GST/HST and PST separately), payment method, card last 4 digits, expense category, expense type (business/personal), location, and any printed receipt/invoice number.
- **FR-007**: Users MUST see real-time processing status for each uploaded file (pending, processing, complete, failed) without requiring a page refresh.
- **FR-008**: Users MUST be able to view all their receipts in a list, edit any extracted field, and save changes.
- **FR-009**: Users MUST be able to delete individual receipts (removing the record and the original file).
- **FR-010**: If extraction fails, the system MUST mark the receipt as failed and allow the user to retry.

**Bank Statement Management**

- **FR-011**: Users MUST be able to upload bank statements in PDF, image (JPEG/PNG), and CSV formats.
- **FR-012**: The system MUST reject statement files that exceed the maximum allowed size (20 MB per file) before upload begins, with a clear message.
- **FR-013**: For PDF and image statements, the system MUST automatically extract all transactions with: transaction date, description, amount (negative for debits, positive for credits/refunds), and category.
- **FR-014**: For CSV statements, the system MUST intelligently detect column mappings (date, description, amount columns) and present a mapping confirmation screen before importing.
- **FR-015**: When CSV column-mapping confidence falls below a defined threshold, the user MUST be required to manually confirm or correct the mapping before import proceeds.
- **FR-016**: The system MUST extract or prompt for the card's last 4 digits to associate transactions with a specific card.
- **FR-017**: All transactions from a statement MUST be stored with a reference to the source file.
- **FR-018**: Users MUST see real-time import progress (e.g., transaction count) without requiring a page refresh.
- **FR-019**: When the same transaction (identical date, amount, and description) already exists, the system MUST skip the duplicate and warn the user rather than creating a duplicate record.
- **FR-020**: Users MUST be able to filter the transaction list by card (last 4 digits), date range, and amount range.
- **FR-021**: Users MUST be able to edit the category and notes for any individual transaction.
- **FR-022**: Users MUST be able to delete individual transactions or all transactions from a specific import batch.

**Transaction Reconciliation**

- **FR-023**: Users MUST be able to trigger automatic matching between their unmatched bank transactions and unmatched receipts.
- **FR-024**: The matching algorithm MUST pair a bank transaction with a receipt only when: the absolute amount difference is less than $0.01, AND the date difference is 3 days or fewer.
- **FR-025**: Each bank transaction MUST match to at most one receipt, and each receipt to at most one bank transaction (one-to-one constraint).
- **FR-026**: The reconciliation view MUST display matched pairs (green), unmatched bank transactions (yellow), and unmatched receipts (grey) in a unified view.
- **FR-027**: Users MUST be able to manually select a receipt to match with any unmatched bank transaction, overriding automatic matching.
- **FR-028**: Users MUST be able to unlink any matched pair, returning both records to unmatched status.
- **FR-029**: Users MUST be able to export the full reconciliation results (matched pairs and unmatched items) as a downloadable CSV file.

### Key Entities

- **Receipt**: A record of a business expense or invoice, capturing vendor, date, itemized amounts (total, subtotal, tax), payment method, card identifier, category, and a link to the original uploaded file.
- **Bank Transaction**: A record from a bank statement representing a financial event, including date, description, amount (signed), category, card identifier, and a reference to the source statement file.
- **Match**: A confirmed pairing between one bank transaction and one receipt, including a confidence score. Enforces one-to-one cardinality.
- **User Account**: An authenticated identity whose data (receipts, transactions, files) is fully isolated from all other users.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can upload a receipt and view extracted data within 30 seconds of upload completion for at least 95% of uploads under normal load.
- **SC-002**: AI extraction correctly identifies vendor, date, and total amount for at least 90% of standard receipt formats on the first attempt.
- **SC-003**: Users can upload a bank statement and view all imported transactions within 60 seconds for statements containing up to 200 transactions.
- **SC-004**: CSV column mapping is correctly auto-detected (without user correction) for at least 90% of common bank CSV export formats.
- **SC-005**: The automatic reconciliation engine correctly matches at least 85% of reconcilable transaction-receipt pairs when amounts and dates are unambiguous.
- **SC-006**: A user can complete the full monthly bookkeeping workflow — upload statement, upload receipts, run reconciliation, review and export results — in under 15 minutes for a typical month of 50–100 transactions.
- **SC-007**: Zero data leakage between user accounts — verified by attempting to access another user's records and receiving an access-denied response in 100% of cases.
- **SC-008**: Duplicate detection prevents re-importing the same transactions in 100% of cases where date, amount, and description are identical.

## Assumptions

- The primary users are small business owners or sole proprietors managing their own monthly bookkeeping, not large enterprises.
- The system targets Canadian users, which is reflected in the tax fields (GST/HST, PST); multi-jurisdiction international tax handling is out of scope.
- A typical monthly statement contains up to 200 transactions; bulk imports significantly larger than this are not a primary design target.
- Amount matching uses near-exact comparison (within $0.01) — fuzzy amount matching (e.g., partial payments, split receipts) is out of scope for the initial version.
- Multi-currency reconciliation is out of scope; all amounts are assumed to be in a single currency.
- The matching window of ±3 days accounts for typical delays between purchase date and bank posting date.
- CSV exports from banks will include at minimum a date column, a description column, and an amount column (possibly split into debit/credit columns).
- Users are expected to have organized their receipts and statements by the time they run reconciliation; the system does not need to handle partially uploaded datasets.
