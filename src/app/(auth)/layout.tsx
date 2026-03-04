import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">BookKeeping</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered bookkeeping</p>
        </div>
        {children}
      </div>
    </div>
  )
}
