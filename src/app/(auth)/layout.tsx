import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'oklch(0.09 0.04 270)' }}
    >
      {/* Subtle background glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(39,197,245,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(39,197,245,0.2), rgba(39,197,245,0.05))',
                border: '1px solid rgba(39,197,245,0.25)',
                boxShadow: '0 0 20px rgba(39,197,245,0.15)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 4h12M3 9h8M3 14h10" stroke="#27C5F5" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: 'oklch(0.93 0.02 259)' }}>
              BookKeeper<span style={{ background: 'linear-gradient(90deg, #27C5F5, #5EB5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span>
            </span>
          </div>
          <p className="text-xs" style={{ color: 'oklch(0.45 0.04 262)' }}>
            AI-powered bookkeeping for Canadian small businesses
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}
