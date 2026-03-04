-- ============================================================
-- Migration: 20260303000002_storage
-- Description: Create storage buckets and RLS policies
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Receipts bucket (private, 10 MB max)
-- ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ────────────────────────────────────────────────────────────
-- Bank statements bucket (private, 20 MB max)
-- ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bank-statements',
  'bank-statements',
  false,
  20971520,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'text/csv']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ────────────────────────────────────────────────────────────
-- RLS policies for receipts bucket
-- Path convention: {user_id}/{receipt_id}/{filename}
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "receipts storage: upload own" ON storage.objects;
CREATE POLICY "receipts storage: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "receipts storage: read own" ON storage.objects;
CREATE POLICY "receipts storage: read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "receipts storage: delete own" ON storage.objects;
CREATE POLICY "receipts storage: delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ────────────────────────────────────────────────────────────
-- RLS policies for bank-statements bucket
-- Path convention: {user_id}/{statement_id}/{filename}
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "bank-statements storage: upload own" ON storage.objects;
CREATE POLICY "bank-statements storage: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bank-statements'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "bank-statements storage: read own" ON storage.objects;
CREATE POLICY "bank-statements storage: read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'bank-statements'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "bank-statements storage: delete own" ON storage.objects;
CREATE POLICY "bank-statements storage: delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bank-statements'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
