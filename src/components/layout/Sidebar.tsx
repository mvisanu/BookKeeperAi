'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Receipt, FileText, RefreshCw, LogOut, LayoutDashboard, CreditCard, GitMerge, Settings, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/receipts', label: 'Receipts', icon: Receipt },
  { href: '/statements', label: 'Bank Statements', icon: FileText },
  { href: '/transactions', label: 'Transactions', icon: CreditCard },
  { href: '/matching', label: 'Matching', icon: GitMerge },
  { href: '/reconciliation', label: 'Reconciliation', icon: RefreshCw },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  userEmail: string
}

function SidebarContent({ userEmail, onNavClick }: { userEmail: string; onNavClick?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <div className="p-6">
        <h1 className="text-lg font-bold tracking-tight">BookKeeperAI</h1>
        <p className="text-xs font-medium mt-0.5" style={{ color: '#2DBEEB' }}>Expense Management</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavClick}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
                ? 'text-[#27C5F5] shadow-[0_0_12px_2px_rgba(39,197,245,0.35)] bg-[rgba(39,197,245,0.1)]'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t p-4">
        <p className="mb-2 truncate text-xs text-muted-foreground">{userEmail}</p>
        <form action={signOut}>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" type="submit">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b bg-background px-4 md:hidden">
        <button onClick={() => setOpen(true)} className="mr-3 rounded-md p-1.5 hover:bg-accent">
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-bold">BookKeeperAI</span>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r bg-background transition-transform duration-200 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded-md p-1.5 hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent userEmail={userEmail} onNavClick={() => setOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 flex-col border-r bg-background md:flex">
        <SidebarContent userEmail={userEmail} />
      </aside>
    </>
  )
}
