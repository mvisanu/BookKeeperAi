'use client'

import { useCallback, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { FileImage, FileText, Upload, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
}
const MAX_SIZE_BYTES = 10 * 1024 * 1024

interface UploadingFile {
  name: string
  progress: number
  type: string
}

function FileTypeChip({ type }: { type: string }) {
  const isImg = type.startsWith('image/')
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: 'rgba(39,197,245,0.1)', color: '#27C5F5' }}
    >
      {isImg ? <FileImage className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
      {type === 'application/pdf' ? 'PDF' : type.split('/')[1].toUpperCase()}
    </span>
  )
}

export default function ReceiptUploadZone() {
  const [uploading, setUploading] = useState<UploadingFile[]>([])

  const uploadFile = useCallback(async (file: File) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('You must be signed in to upload receipts')
      return
    }

    const receiptId = crypto.randomUUID()
    const storagePath = `${user.id}/${receiptId}/${file.name}`

    setUploading((prev) => [...prev, { name: file.name, progress: 0, type: file.type }])

    try {
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(storagePath, file)

      if (uploadError) throw uploadError

      setUploading((prev) =>
        prev.map((f) => (f.name === file.name ? { ...f, progress: 80 } : f))
      )

      const response = await fetch('/api/receipts', {
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

      toast.success(`${file.name} uploaded — AI extraction started`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      toast.error(message)
    } finally {
      setUploading((prev) => prev.filter((f) => f.name !== file.name))
    }
  }, [])

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      rejectedFiles.forEach(({ file, errors }) => {
        if (errors.some((e) => e.code === 'file-too-large')) {
          toast.error(`${file.name} exceeds the 10 MB limit`)
        } else {
          toast.error(`${file.name} is not a supported file type`)
        }
      })
      acceptedFiles.forEach((file) => uploadFile(file))
    },
    [uploadFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE_BYTES,
    multiple: true,
  })

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className="relative cursor-pointer rounded-xl p-8 transition-all duration-200 select-none"
        style={{
          background: isDragActive
            ? 'rgba(39,197,245,0.05)'
            : 'oklch(1 0 0 / 2%)',
          border: isDragActive
            ? '1.5px solid rgba(39,197,245,0.5)'
            : '1.5px dashed oklch(1 0 0 / 12%)',
          boxShadow: isDragActive ? '0 0 24px rgba(39,197,245,0.12) inset' : 'none',
        }}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3 text-center">
          {/* Icon */}
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200"
            style={{
              background: isDragActive ? 'rgba(39,197,245,0.2)' : 'rgba(39,197,245,0.08)',
              boxShadow: isDragActive ? '0 0 20px rgba(39,197,245,0.3)' : 'none',
            }}
          >
            <Upload
              className="h-5 w-5 transition-all duration-200"
              style={{ color: isDragActive ? '#27C5F5' : 'oklch(0.55 0.04 262)' }}
            />
          </div>

          {/* Text */}
          <div>
            <p className="text-sm font-semibold" style={{ color: isDragActive ? '#27C5F5' : 'oklch(0.75 0.02 259)' }}>
              {isDragActive ? 'Drop files to upload' : 'Drag & drop receipts here'}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'oklch(0.45 0.04 262)' }}>
              or{' '}
              <span className="font-semibold" style={{ color: '#27C5F5' }}>browse files</span>
              {' '}— JPEG, PNG or PDF · max 10 MB
            </p>
          </div>

          {/* Accepted format chips */}
          <div className="flex items-center gap-2 mt-1">
            {['JPEG', 'PNG', 'PDF'].map((ext) => (
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
      </div>

      {/* Upload progress items */}
      {uploading.map((f) => (
        <div
          key={f.name}
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            background: 'oklch(1 0 0 / 3%)',
            border: '1px solid oklch(1 0 0 / 7%)',
          }}
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: '#27C5F5' }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="truncate text-sm font-medium" style={{ color: 'oklch(0.82 0.02 259)' }}>{f.name}</p>
              <FileTypeChip type={f.type} />
            </div>
            {/* Progress bar */}
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'oklch(1 0 0 / 8%)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${f.progress || 20}%`,
                  background: 'linear-gradient(90deg, #27C5F5, #5EB5FF)',
                  boxShadow: '0 0 8px rgba(39,197,245,0.5)',
                }}
              />
            </div>
          </div>
          <button
            onClick={() => setUploading((prev) => prev.filter((u) => u.name !== f.name))}
            className="rounded p-0.5 transition-colors hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5 shrink-0" style={{ color: 'oklch(0.48 0.04 262)' }} />
          </button>
        </div>
      ))}
    </div>
  )
}
