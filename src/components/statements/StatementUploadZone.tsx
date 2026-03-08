'use client'

import { useCallback, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { CsvColumnDetectionResult } from '@/types'
import CsvMappingModal from './CsvMappingModal'
import ImportProgressToast from './ImportProgressToast'

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'text/csv': ['.csv'],
}
const MAX_SIZE_BYTES = 20 * 1024 * 1024

export default function StatementUploadZone() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [csvModal, setCsvModal] = useState<{
    statementId: string
    detection: CsvColumnDetectionResult
  } | null>(null)
  const [processingIds, setProcessingIds] = useState<string[]>([])

  const uploadFile = useCallback(async (file: File) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('You must be signed in')
      return
    }

    const statementId = crypto.randomUUID()
    const storagePath = `${user.id}/${statementId}/${file.name}`

    setUploading(true)
    setProgress(20)

    try {
      const { error: uploadError } = await supabase.storage
        .from('bank-statements')
        .upload(storagePath, file)

      if (uploadError) throw uploadError

      setProgress(60)

      const response = await fetch('/api/statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          file_mime_type: file.type,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error ?? 'Upload failed')
      }

      const result = await response.json()
      setProgress(100)

      if (result.status === 'awaiting_mapping') {
        setCsvModal({ statementId: result.id, detection: result.csv_column_mapping ?? { available_columns: [], sample_rows: [], confidence: 0, detected_date_col: '', detected_description_col: '', detected_amount_col: null, detected_debit_col: null, detected_credit_col: null } })
      } else {
        setProcessingIds((prev) => [...prev, result.id])
        toast.success(`${file.name} uploaded — processing started`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      toast.error(message)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [])

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      rejectedFiles.forEach(({ file, errors }) => {
        if (errors.some((e) => e.code === 'file-too-large')) {
          toast.error(`${file.name} exceeds the 20 MB limit`)
        } else {
          toast.error(`${file.name} is not a supported file type`)
        }
      })
      if (acceptedFiles.length > 0) uploadFile(acceptedFiles[0])
    },
    [uploadFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE_BYTES,
    multiple: false,
  })

  return (
    <>
      <div className="space-y-3">
        <div
          {...getRootProps()}
          className="relative cursor-pointer rounded-xl p-8 transition-all duration-200 select-none"
          style={{
            background: isDragActive ? 'rgba(39,197,245,0.05)' : 'oklch(1 0 0 / 2%)',
            border: isDragActive ? '1.5px solid rgba(39,197,245,0.5)' : '1.5px dashed oklch(1 0 0 / 12%)',
            boxShadow: isDragActive ? '0 0 24px rgba(39,197,245,0.12) inset' : 'none',
          }}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200"
              style={{
                background: isDragActive ? 'rgba(39,197,245,0.2)' : 'rgba(39,197,245,0.08)',
                boxShadow: isDragActive ? '0 0 20px rgba(39,197,245,0.3)' : 'none',
              }}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#27C5F5' }} />
              ) : (
                <Upload
                  className="h-5 w-5 transition-all duration-200"
                  style={{ color: isDragActive ? '#27C5F5' : 'oklch(0.55 0.04 262)' }}
                />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: isDragActive ? '#27C5F5' : 'oklch(0.75 0.02 259)' }}>
                {uploading ? 'Uploading…' : isDragActive ? 'Drop statement to upload' : 'Drag & drop a bank statement here'}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'oklch(0.45 0.04 262)' }}>
                or{' '}
                <span className="font-semibold" style={{ color: '#27C5F5' }}>browse files</span>
                {' '}— PDF, JPEG, PNG or CSV · max 20 MB
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {['PDF', 'JPEG', 'PNG', 'CSV'].map((ext) => (
                <span
                  key={ext}
                  className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: 'oklch(1 0 0 / 5%)', color: 'oklch(0.48 0.04 262)' }}
                >
                  {ext}
                </span>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-xl overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #27C5F5, #5EB5FF)',
                  boxShadow: '0 0 8px rgba(39,197,245,0.8)',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {csvModal && (
        <CsvMappingModal
          statementId={csvModal.statementId}
          detection={csvModal.detection}
          open={true}
          onOpenChange={(o) => !o && setCsvModal(null)}
          onConfirmed={() => {
            setProcessingIds((prev) => [...prev, csvModal.statementId])
            setCsvModal(null)
          }}
        />
      )}

      {processingIds.map((id) => (
        <ImportProgressToast key={id} statementId={id} />
      ))}
    </>
  )
}
