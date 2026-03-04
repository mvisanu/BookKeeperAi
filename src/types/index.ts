import { z } from 'zod'

// ────────────────────────────────────────────────────────────
// Receipts
// ────────────────────────────────────────────────────────────

export const ReceiptSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'complete', 'failed']),
  file_name: z.string(),
  file_size: z.number().int().positive(),
  file_mime_type: z.string(),
  storage_path: z.string(),
  vendor_name: z.string().nullable(),
  transaction_date: z.string().nullable(), // YYYY-MM-DD
  total_amount: z.number().nonnegative().nullable(),
  subtotal_amount: z.number().nonnegative().nullable(),
  gst_hst_amount: z.number().nonnegative().nullable(),
  pst_amount: z.number().nonnegative().nullable(),
  payment_method: z.string().nullable(),
  card_last4: z.string().regex(/^\d{4}$/).nullable(),
  category: z.string().nullable(),
  expense_type: z.enum(['business', 'personal']).nullable(),
  location: z.string().nullable(),
  receipt_number: z.string().nullable(),
  notes: z.string().nullable(),
  extraction_error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  is_matched: z.boolean(),
})

export type Receipt = z.infer<typeof ReceiptSchema>

export const CreateReceiptSchema = z.object({
  storage_path: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.number().int().positive().max(10485760),
  file_mime_type: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
})

export type CreateReceiptInput = z.infer<typeof CreateReceiptSchema>

export const UpdateReceiptSchema = z.object({
  vendor_name: z.string().optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  total_amount: z.number().nonnegative().optional(),
  subtotal_amount: z.number().nonnegative().optional(),
  gst_hst_amount: z.number().nonnegative().optional(),
  pst_amount: z.number().nonnegative().optional(),
  payment_method: z.string().optional(),
  card_last4: z.string().regex(/^\d{4}$/).optional(),
  category: z.string().optional(),
  expense_type: z.enum(['business', 'personal']).optional(),
  location: z.string().optional(),
  receipt_number: z.string().optional(),
  notes: z.string().optional(),
})

export type UpdateReceiptInput = z.infer<typeof UpdateReceiptSchema>

// ────────────────────────────────────────────────────────────
// Bank Statements
// ────────────────────────────────────────────────────────────

export const CsvColumnMappingSchema = z.object({
  date_col: z.string(),
  description_col: z.string(),
  amount_col: z.string().optional(),
  debit_col: z.string().optional(),
  credit_col: z.string().optional(),
  card_last4: z.string().regex(/^\d{4}$/),
})

export type CsvColumnMapping = z.infer<typeof CsvColumnMappingSchema>

export const CsvColumnDetectionResultSchema = z.object({
  detected_date_col: z.string(),
  detected_description_col: z.string(),
  detected_amount_col: z.string().nullable(),
  detected_debit_col: z.string().nullable(),
  detected_credit_col: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  sample_rows: z.array(z.record(z.string(), z.string())),
  available_columns: z.array(z.string()),
})

export type CsvColumnDetectionResult = z.infer<typeof CsvColumnDetectionResultSchema>

export const BankStatementSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  file_name: z.string(),
  file_size: z.number().int().positive(),
  file_mime_type: z.string(),
  storage_path: z.string(),
  card_last4: z.string().nullable(),
  status: z.enum(['pending', 'awaiting_mapping', 'processing', 'complete', 'failed']),
  transaction_count: z.number().int().nonnegative(),
  import_error: z.string().nullable(),
  csv_column_mapping: CsvColumnMappingSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type BankStatement = z.infer<typeof BankStatementSchema>

export const CreateStatementSchema = z.object({
  storage_path: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.number().int().positive().max(20971520),
  file_mime_type: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'text/csv']),
  card_last4: z.string().regex(/^\d{4}$/).optional(),
})

export type CreateStatementInput = z.infer<typeof CreateStatementSchema>

// ────────────────────────────────────────────────────────────
// Bank Transactions
// ────────────────────────────────────────────────────────────

export const BankTransactionSchema = z.object({
  id: z.string().uuid(),
  statement_id: z.string().uuid(),
  user_id: z.string().uuid(),
  transaction_date: z.string(), // YYYY-MM-DD
  description: z.string(),
  amount: z.number(),
  category: z.string().nullable(),
  notes: z.string().nullable(),
  card_last4: z.string().nullable(),
  is_duplicate: z.boolean(),
  is_matched: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type BankTransaction = z.infer<typeof BankTransactionSchema>

export const UpdateTransactionSchema = z.object({
  category: z.string().optional(),
  notes: z.string().optional(),
})

export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>

// ────────────────────────────────────────────────────────────
// Reconciliation Matches
// ────────────────────────────────────────────────────────────

export const ReconciliationMatchSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  bank_transaction_id: z.string().uuid(),
  receipt_id: z.string().uuid(),
  match_type: z.enum(['auto', 'manual']),
  confidence_score: z.number().min(0).max(1),
  created_at: z.string(),
  updated_at: z.string(),
})

export type ReconciliationMatch = z.infer<typeof ReconciliationMatchSchema>

export const ManualMatchSchema = z.object({
  bank_transaction_id: z.string().uuid(),
  receipt_id: z.string().uuid(),
})

export type ManualMatchInput = z.infer<typeof ManualMatchSchema>

// ────────────────────────────────────────────────────────────
// Gemini Extraction Result Schemas
// ────────────────────────────────────────────────────────────

export const ReceiptExtractionSchema = z.object({
  vendor_name: z.string().nullable(),
  transaction_date: z.string().nullable(),
  total_amount: z.number().nullable(),
  subtotal_amount: z.number().nullable(),
  gst_hst_amount: z.number().nullable(),
  pst_amount: z.number().nullable(),
  payment_method: z.string().nullable(),
  card_last4: z.string().nullable(),
  category: z.string().nullable(),
  expense_type: z.enum(['business', 'personal']).nullable(),
  location: z.string().nullable(),
  receipt_number: z.string().nullable(),
})

export type ReceiptExtraction = z.infer<typeof ReceiptExtractionSchema>

export const StatementTransactionSchema = z.object({
  transaction_date: z.string(),
  description: z.string(),
  amount: z.number(),
  category: z.string().nullable(),
})

export const StatementExtractionSchema = z.object({
  card_last4: z.string().nullable(),
  transactions: z.array(StatementTransactionSchema),
})

export type StatementExtraction = z.infer<typeof StatementExtractionSchema>
