'use client'

import { useCallback, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Progress } from '@/components/ui/progress'

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
}
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

interface UploadingFile {
  name: string
  progress: number
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

    setUploading((prev) => [...prev, { name: file.name, progress: 0 }])

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

      toast.success(`${file.name} uploaded — processing started`)
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
          toast.error(`${file.name} exceeds the 10 MB limit — please upload a smaller file`)
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
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragActive ? 'border-primary bg-accent' : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop receipts here' : 'Drag & drop receipts or click to browse'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG or PDF · max 10 MB each</p>
      </div>
      {uploading.map((f) => (
        <div key={f.name} className="flex items-center gap-3 rounded-md border p-3">
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{f.name}</p>
            <Progress value={f.progress || 20} className="mt-1 h-1.5" />
          </div>
          <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}
