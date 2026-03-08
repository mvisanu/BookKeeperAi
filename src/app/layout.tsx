import type { Metadata } from 'next'
import { Manrope, DM_Mono } from 'next/font/google'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BookKeeperAI — AI-powered bookkeeping',
  description: 'Upload receipts and bank statements; AI extracts and reconciles transactions.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${manrope.variable} ${dmMono.variable}`}>
      <body className="antialiased">
        <TooltipProvider>
          {children}
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: 'oklch(0.14 0.04 268)',
                border: '1px solid oklch(1 0 0 / 8%)',
                color: 'oklch(0.93 0.02 259)',
              },
            }}
          />
        </TooltipProvider>
      </body>
    </html>
  )
}
