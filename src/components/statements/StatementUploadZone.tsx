'use client'

import { useCallback, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { CsvColumnDetectionResult } from '@/types'
import { Progress } from '@/components/ui/progress'
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
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragActive ? 'border-primary bg-accent' : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isDragActive ? 'Drop statement here' : 'Drag & drop a bank statement or click to browse'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">PDF, JPEG, PNG or CSV · max 20 MB</p>
        </div>
        {uploading && <Progress value={progress} className="h-1.5" />}
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
