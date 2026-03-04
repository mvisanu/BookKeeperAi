'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Receipt, FileText, RefreshCw, LogOut, LayoutDashboard, CreditCard, GitMerge, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
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

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      <div className="p-6">
        <h1 className="text-lg font-bold tracking-tight">BookKeeperAI</h1>
        <p className="text-xs font-medium mt-0.5" style={{ color: '#2DBEEB' }}>Expense Management</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              href === '/' ? pathname === '/' : pathname.startsWith(href)
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
    </aside>
  )
}
