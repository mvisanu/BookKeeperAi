'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Receipt, FileText, RefreshCw, LogOut, LayoutDashboard,
  CreditCard, GitMerge, Settings, Menu, X, Wallet, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth/actions'

const NAV_ITEMS = [
  { href: '/dashboard',      label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/receipts',       label: 'Receipts',         icon: Receipt },
  { href: '/statements',     label: 'Bank Statements',  icon: FileText },
  { href: '/transactions',   label: 'Transactions',     icon: CreditCard },
  { href: '/matching',       label: 'Matching',         icon: GitMerge },
  { href: '/reconciliation', label: 'Reconciliation',   icon: RefreshCw },
]

const BOTTOM_ITEMS = [
  { href: '/billing',  label: 'Billing',  icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  userEmail: string
}

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: typeof LayoutDashboard }) {
  const pathname = usePathname()
  const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
        isActive
          ? 'text-[#27C5F5]'
          : 'text-[oklch(0.55_0.04_262)] hover:text-[oklch(0.82_0.02_259)] hover:bg-white/[0.04]'
      )}
    >
      {/* Active left border */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full"
          style={{ background: '#27C5F5', boxShadow: '0 0 8px rgba(39,197,245,0.8)' }}
        />
      )}

      {/* Active background */}
      {isActive && (
        <span className="absolute inset-0 rounded-md" style={{ background: 'rgba(39,197,245,0.08)' }} />
      )}

      <Icon className={cn('relative h-4 w-4 shrink-0 transition-colors', isActive ? 'text-[#27C5F5]' : '')} />
      <span className="relative">{label}</span>

      {isActive && (
        <ChevronRight className="relative ml-auto h-3.5 w-3.5 opacity-40" />
      )}
    </Link>
  )
}

function SidebarContent({ userEmail, onNavClick }: { userEmail: string; onNavClick?: () => void }) {
  const initials = userEmail.slice(0, 2).toUpperCase()

  return (
    <div className="flex h-full flex-col" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
      {/* Logo */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
            style={{
              background: 'linear-gradient(135deg, #27C5F5 0%, #5EB5FF 100%)',
              boxShadow: '0 0 16px rgba(39,197,245,0.4)',
            }}
          >
            <Receipt className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight" style={{ color: 'oklch(0.93 0.02 259)' }}>
              BookKeeper<span className="text-gradient">AI</span>
            </p>
            <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: 'oklch(0.55 0.04 262)' }}>
              Expense Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px" style={{ background: 'oklch(1 0 0 / 5%)' }} />

      {/* Main nav */}
      <nav className="flex-1 space-y-0.5 px-3 pt-4" onClick={onNavClick}>
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.42 0.04 262)' }}>
          Workspace
        </p>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        <p className="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.42 0.04 262)' }}>
          Account
        </p>
        {BOTTOM_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Bottom user section */}
      <div className="px-3 pb-4">
        <div className="h-px mb-4" style={{ background: 'oklch(1 0 0 / 5%)' }} />

        {/* User info */}
        <div className="mb-2 flex items-center gap-3 rounded-md px-3 py-2.5" style={{ background: 'oklch(1 0 0 / 3%)' }}>
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #27C5F5 0%, #5EB5FF 100%)' }}
          >
            {initials}
          </div>
          <p className="min-w-0 flex-1 truncate text-xs font-medium" style={{ color: 'oklch(0.63 0.04 262)' }}>
            {userEmail}
          </p>
        </div>

        {/* Sign out */}
        <form action={signOut}>
          <button
            type="submit"
            className="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 hover:bg-white/[0.04]"
            style={{ color: 'oklch(0.45 0.04 262)' }}
          >
            <LogOut className="h-4 w-4 transition-colors group-hover:text-[#FF4757]" />
            <span className="group-hover:text-[oklch(0.7_0.02_259)] transition-colors">Sign out</span>
          </button>
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
      <div
        className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b px-4 md:hidden"
        style={{ background: 'oklch(0.07 0.035 270)', borderColor: 'oklch(1 0 0 / 6%)' }}
      >
        <button
          onClick={() => setOpen(true)}
          className="mr-3 rounded-md p-1.5 transition-colors hover:bg-white/10"
        >
          <Menu className="h-5 w-5" style={{ color: 'oklch(0.63 0.04 262)' }} />
        </button>
        <span className="text-sm font-bold" style={{ color: 'oklch(0.93 0.02 259)' }}>
          BookKeeper<span className="text-gradient">AI</span>
        </span>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 border-r transition-transform duration-200 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'oklch(0.07 0.035 270)', borderColor: 'oklch(1 0 0 / 6%)' }}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded-md p-1.5 transition-colors hover:bg-white/10"
        >
          <X className="h-4 w-4" style={{ color: 'oklch(0.55 0.04 262)' }} />
        </button>
        <SidebarContent userEmail={userEmail} onNavClick={() => setOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden h-full w-60 flex-col border-r md:flex"
        style={{ background: 'oklch(0.07 0.035 270)', borderColor: 'oklch(1 0 0 / 6%)' }}
      >
        <SidebarContent userEmail={userEmail} />
      </aside>
    </>
  )
}
