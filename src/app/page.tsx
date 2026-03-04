'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus_Jakarta_Sans, Lora } from 'next/font/google'
import {
  Receipt,
  Zap,
  Shield,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  FileText,
  RefreshCw,
  Sparkles,
  Star,
  Menu,
  X,
  Play,
  Bell,
  Search,
  Upload,
  Settings,
  CreditCard,
  Tag,
  Landmark,
  LogOut,
  LayoutDashboard,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['300', '400', '500', '600', '700', '800'],
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

/* ─── useInView ─────────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* ─── useCounter ─────────────────────────────────────────────── */
function useCounter(end: number, dur = 1800, go = false) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!go) return
    let t0: number | null = null
    const tick = (ts: number) => {
      if (!t0) t0 = ts
      const p = Math.min((ts - t0) / dur, 1)
      setN(Math.floor((1 - Math.pow(1 - p, 3)) * end))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [end, dur, go])
  return n
}

/* ─── FAQ ─────────────────────────────────────────────────────── */
function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-100">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-5 text-left">
        <span className="text-[15px] font-semibold text-slate-800">{q}</span>
        <ChevronDown
          className="h-5 w-5 shrink-0 ml-4 text-teal-500 transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
        />
      </button>
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: open ? '300px' : '0' }}>
        <p className="pb-5 text-sm leading-relaxed text-slate-500">{a}</p>
      </div>
    </div>
  )
}

/* ─── App Mockup ──────────────────────────────────────────────── */
function AppMockup() {
  const txns = [
    { dot: '#ef4444', label: 'Office Supplies',  cat: 'Supplies',   amt: '-$127.50', neg: true },
    { dot: '#ef4444', label: 'Software License', cat: 'Technology', amt: '-$49.99',  neg: true },
    { dot: '#22c55e', label: 'Client Payment',   cat: 'Income',     amt: '$2,500.00',neg: false },
    { dot: '#ef4444', label: 'Utilities',         cat: 'Operations', amt: '-$185.00', neg: true },
    { dot: '#22c55e', label: 'Consulting Fee',   cat: 'Income',     amt: '$750.00',  neg: false },
  ]

  const sideItems = [
    { icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboard',      active: true },
    { icon: <Receipt className="h-4 w-4" />,         label: 'Receipts',       active: false },
    { icon: <CreditCard className="h-4 w-4" />,      label: 'Expenses',       active: false },
    { icon: <Tag className="h-4 w-4" />,             label: 'Categorization', active: false, arrow: true },
    { icon: <Landmark className="h-4 w-4" />,        label: 'Bank feed',      active: false },
  ]

  return (
    <div className="relative">
      {/* outer glow */}
      <div className="absolute -inset-6 rounded-3xl" style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(14,184,212,0.18) 0%, transparent 70%)' }} />

      <div
        className="relative rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(14,184,212,0.18),0_8px_32px_rgba(0,0,0,0.1)]"
        style={{ background: '#fff', border: '1px solid rgba(14,184,212,0.12)', width: '100%', maxWidth: '420px' }}
      >
        {/* top bar */}
        <div className="flex items-center border-b border-slate-100 px-4 py-3 gap-3">
          {/* logo */}
          <div className="flex items-center gap-2 w-36 shrink-0">
            <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0CB8D4,#0891b2)' }}>
              <Receipt className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-slate-800">BookKeepingApp</span>
          </div>
          {/* search */}
          <div className="flex-1 flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">Search</span>
          </div>
          {/* icons */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Bell className="h-4 w-4 text-slate-500" />
              <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-400 border border-white" />
            </div>
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#0CB8D4,#0891b2)' }}>
              U
            </div>
          </div>
        </div>

        <div className="flex">
          {/* sidebar */}
          <div className="w-36 shrink-0 border-r border-slate-100 py-3 flex flex-col">
            {sideItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between mx-2 mb-0.5 px-2.5 py-2 rounded-lg cursor-pointer"
                style={item.active ? { background: 'rgba(14,184,212,0.10)', color: '#0CB8D4' } : { color: '#64748b' }}
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
                {item.arrow && <ChevronRight className="h-3 w-3 opacity-50" />}
              </div>
            ))}
            <div className="mt-auto pt-4 border-t border-slate-100 mx-2">
              <div className="flex items-center gap-2 px-2.5 py-2 text-slate-400 cursor-pointer hover:text-slate-600">
                <Settings className="h-4 w-4" />
                <span className="text-xs">Settings</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-2 text-slate-400 cursor-pointer hover:text-slate-600">
                <LogOut className="h-4 w-4" />
                <span className="text-xs">Log out</span>
              </div>
            </div>
          </div>

          {/* main */}
          <div className="flex-1 min-w-0 p-4">
            {/* header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-800">Dashboard</span>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
                  <Upload className="h-3 w-3" /> Upload
                </button>
                <button className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#0CB8D4,#0891b2)' }}>
                  + New expense
                </button>
              </div>
            </div>

            {/* receipt scanning card */}
            <div className="relative mb-3 rounded-xl p-4 overflow-hidden" style={{ background: 'linear-gradient(135deg,#0CB8D4 0%,#0891b2 100%)' }}>
              <button className="absolute top-2 right-2 h-5 w-5 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
                <X className="h-3 w-3 text-white" />
              </button>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <Receipt className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white mb-0.5">Receipt Scanning</p>
                  <p className="text-xs text-white/80 leading-relaxed">Scan receipts into audit-ready financial reports instantly.</p>
                  <button className="mt-2 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold" style={{ color: '#0CB8D4' }}>
                    Scan receipts
                  </button>
                </div>
              </div>
            </div>

            {/* recent transactions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">Recent Transactions</span>
                <span className="text-xs font-medium" style={{ color: '#0CB8D4' }}>View all</span>
              </div>
              <div className="space-y-1">
                {txns.map((t) => (
                  <div key={t.label} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: t.dot }} />
                      <span className="text-xs text-slate-700 truncate">{t.label}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-xs text-slate-400">{t.cat}</span>
                      <span className={`text-xs font-semibold ${t.neg ? 'text-red-500' : 'text-green-500'}`}>{t.amt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Integration logos (SVG wordmarks) ──────────────────────── */
function IntegrationLogos() {
  const logos = ['QuickBooks', 'Xero', 'Wave', 'FreshBooks']
  return (
    <div className="flex items-center gap-6 flex-wrap">
      {logos.map((name) => (
        <div key={name} className="text-slate-400 text-sm font-semibold opacity-60 hover:opacity-90 transition-opacity">
          {name}
        </div>
      ))}
    </div>
  )
}

/* ─── Testimonial ─────────────────────────────────────────────── */
function Testimonial({ quote, name, role, rating }: { quote: string; name: string; role: string; rating: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-[15px] leading-relaxed text-slate-600 mb-5">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg,#0CB8D4,#0891b2)' }}
        >
          {name[0]}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{name}</p>
          <p className="text-xs text-slate-400">{role}</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Pricing card ────────────────────────────────────────────── */
function PricingCard({
  name, price, period, desc, features, highlight, cta,
}: {
  name: string; price: string; period?: string; desc: string
  features: string[]; highlight?: boolean; cta: string
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 ${
        highlight
          ? 'shadow-[0_8px_40px_rgba(14,184,212,0.25)] border-2'
          : 'border border-slate-200 bg-white hover:shadow-lg'
      }`}
      style={highlight ? {
        background: 'linear-gradient(160deg,#f0fafe 0%,#ffffff 100%)',
        borderColor: '#0CB8D4',
      } : {}}
    >
      {highlight && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="rounded-full px-4 py-1 text-xs font-bold text-white uppercase tracking-widest"
            style={{ background: 'linear-gradient(135deg,#0CB8D4,#0891b2)' }}>
            Most Popular
          </span>
        </div>
      )}
      <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-3">{name}</p>
      <div className="flex items-end gap-1 mb-2">
        <span className="text-5xl font-extrabold text-slate-900">{price}</span>
        {period && <span className="text-slate-400 mb-2 text-base">{period}</span>}
      </div>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">{desc}</p>
      <ul className="space-y-3 flex-1 mb-8">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/sign-up"
        className={`w-full rounded-xl py-3.5 text-center text-sm font-bold transition-all duration-200 ${
          highlight
            ? 'text-white shadow-lg hover:opacity-90'
            : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}
        style={highlight ? { background: 'linear-gradient(135deg,#0CB8D4,#0891b2)' } : {}}
      >
        {cta}
      </Link>
    </div>
  )
}

/* ─── Main ────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  const { ref: statsRef, inView: statsInView } = useInView(0.3)
  const c1 = useCounter(10000, 2000, statsInView)
  const c2 = useCounter(998, 1800, statsInView)
  const c3 = useCounter(14, 1500, statsInView)

  const { ref: featRef, inView: featInView } = useInView(0.1)

  const features = [
    { icon: <Receipt className="h-6 w-6" />, title: 'AI Receipt Extraction', desc: 'Photograph or upload any receipt. AI reads vendor, amount, taxes, and line items — no templates required.' },
    { icon: <FileText className="h-6 w-6" />, title: 'Bank Statement Parsing', desc: 'Import any CSV or PDF. Columns auto-mapped, transactions cleanly extracted from RBC, TD, BMO, and more.' },
    { icon: <Zap className="h-6 w-6" />, title: 'Smart Auto-Matching', desc: 'Receipts and transactions matched by amount, date, and vendor with configurable fuzzy tolerance.' },
    { icon: <RefreshCw className="h-6 w-6" />, title: 'One-Click Reconciliation', desc: 'See matched pairs side-by-side. Drag receipts to fix mismatches instantly.' },
    { icon: <BarChart3 className="h-6 w-6" />, title: 'Spending Intelligence', desc: 'Category breakdowns, top vendors, monthly trends — understand your business at a glance.' },
    { icon: <Shield className="h-6 w-6" />, title: 'Tax-Ready Reports', desc: 'Export GST/HST + PST summaries and categorized transactions directly to your accountant.' },
  ]

  const testimonials = [
    { quote: "I used to spend 6 hours every Sunday matching receipts to bank statements. Now it takes 20 minutes.", name: 'Sarah M.', role: 'Restaurant Owner, Toronto', rating: 5 },
    { quote: "The AI matched 847 transactions in my first import and got 94% right on day one. Remarkable.", name: 'David K.', role: 'Freelance Designer, Vancouver', rating: 5 },
    { quote: "My accountant loved getting clean, categorized exports. Cut our annual tax prep by a full day.", name: 'Jennifer L.', role: 'CFO, 12-person Agency', rating: 5 },
    { quote: "Receipt OCR handles terrible photos — crumpled, bad lighting — it still gets the right numbers.", name: 'Marco R.', role: 'General Contractor, Calgary', rating: 5 },
    { quote: "Switched from QuickBooks for the AI reconciliation alone. The import setup is 10x faster.", name: 'Priya S.', role: 'E-commerce Founder, Ottawa', rating: 5 },
    { quote: "The bookkeeping health score gives me instant confidence going into every tax season.", name: 'Thomas B.', role: 'Independent Consultant, Montreal', rating: 5 },
  ]

  const faqs = [
    { q: 'Which banks are supported?', a: 'Any bank that exports CSV or PDF. We auto-map columns from RBC, TD, Scotiabank, BMO, CIBC, and most credit unions. Our AI column-mapper handles custom formats too.' },
    { q: 'How accurate is the receipt OCR?', a: 'We achieve 96–99% accuracy on clear photos and PDFs, extracting vendor, date, subtotal, GST/HST, PST, and line items. Failed extractions can be manually corrected.' },
    { q: 'Is my financial data secure?', a: 'All data is encrypted at rest (AES-256) and in transit (TLS 1.3) on Canadian infrastructure. You own your data — export and delete at any time.' },
    { q: 'Can I handle multiple businesses?', a: 'Enterprise plans support multiple organizations with separate ledgers, users, and reporting. Starter and Professional support one organization.' },
    { q: 'Do you support multicurrency?', a: 'Foreign transaction support is on our roadmap for Q3 2026. Currently we work in CAD with GST/HST and PST calculations.' },
  ]

  return (
    <div
      className={`${jakarta.variable} ${lora.variable}`}
      style={{ fontFamily: 'var(--font-jakarta), sans-serif', background: '#ffffff', color: '#0f172a' }}
    >
      {/* ── HERO BG ───────────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: '780px',
          background: 'linear-gradient(160deg, #e0f5fb 0%, #f0faff 40%, #ffffff 100%)',
          zIndex: 0,
        }}
      />

      {/* ── NAV ──────────────────────────────────── */}
      <div className="relative z-50 px-4 pt-5">
        <nav
          className="mx-auto max-w-6xl transition-all duration-300"
          style={{
            background: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(14,184,212,0.15)',
            boxShadow: scrolled
              ? '0 8px 40px rgba(14,184,212,0.12), 0 2px 8px rgba(0,0,0,0.06)'
              : '0 4px 24px rgba(14,184,212,0.10), 0 1px 4px rgba(0,0,0,0.04)',
            padding: '14px 24px',
          }}
        >
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: 'linear-gradient(135deg,#0CB8D4,#0891b2)' }}
              >
                <Receipt className="h-4 w-4 text-white" />
              </div>
              <span className="text-[15px] font-extrabold text-slate-900">BookKeepingApp</span>
            </div>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-8">
              {['Features', 'How It Works', 'Pricing'].map((l) => (
                <a
                  key={l}
                  href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                  className="text-sm font-medium text-slate-600 hover:text-teal-500 transition-colors"
                >
                  {l}
                </a>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/sign-in" className="text-sm font-semibold text-slate-700 hover:text-teal-500 transition-colors px-3 py-2">
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-90 transition-all"
                style={{ background: 'linear-gradient(135deg,#0CB8D4,#0891b2)', boxShadow: '0 4px 16px rgba(14,184,212,0.35)' }}
              >
                Get Started
              </Link>
            </div>

            {/* Mobile toggle */}
            <button className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-5 w-5 text-slate-700" /> : <Menu className="h-5 w-5 text-slate-700" />}
            </button>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-slate-100 space-y-1">
              {['Features', 'How It Works', 'Pricing'].map((l) => (
                <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
                  {l}
                </a>
              ))}
              <div className="pt-3 flex flex-col gap-2">
                <Link href="/sign-in" className="text-center py-2.5 text-sm font-semibold text-slate-700">Sign In</Link>
                <Link href="/sign-up" className="text-center rounded-xl py-2.5 text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#0CB8D4,#0891b2)' }}>
                  Get Started
                </Link>
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative z-10 pt-16 pb-24 px-6">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8 text-xs font-semibold"
              style={{ background: 'rgba(14,184,212,0.10)', color: '#0891b2', border: '1px solid rgba(14,184,212,0.2)' }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered · Canadian Data Residency
            </div>

            <h1 className="text-[3.5rem] sm:text-[4rem] xl:text-[4.5rem] font-extrabold leading-[1.08] text-slate-900 mb-6 tracking-tight">
              Your Books,<br />
              <span style={{ color: '#0CB8D4' }}>Auto-Completed</span><br />
              by AI.
            </h1>

            <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-lg">
              Turn messy receipts into audit-ready financial reports instantly. Stop manual data entry and get paid 5 days faster with intelligent automation.
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-bold text-white transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg,#0CB8D4,#0891b2)',
                  boxShadow: '0 8px 32px rgba(14,184,212,0.40)',
                }}
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 hover:border-teal-300 hover:text-teal-600 transition-all duration-200 shadow-sm"
              >
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(14,184,212,0.12)' }}
                >
                  <Play className="h-3.5 w-3.5" style={{ color: '#0CB8D4', marginLeft: '1px' }} />
                </div>
                Watch Demo
              </button>
            </div>

            <p className="text-sm text-slate-400 mb-6">
              No credit card required. Used by <strong className="text-slate-600">10,000+</strong> businesses.
            </p>

            {/* Integration logos */}
            <div>
              <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-widest">Integrates with</p>
              <IntegrationLogos />
            </div>
          </div>

          {/* Right: App mockup */}
          <div className="flex justify-center lg:justify-end">
            <AppMockup />
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────── */}
      <section ref={statsRef} className="py-16 bg-slate-900">
        <div className="mx-auto max-w-5xl px-6 grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          {[
            { val: c1 >= 10000 ? '10,000+' : `${c1.toLocaleString()}+`, label: 'Businesses onboarded', sub: 'and growing' },
            { val: `${(c2 / 10).toFixed(1)}%`, label: 'Extraction accuracy', sub: 'on clean documents' },
            { val: `${c3} hrs`, label: 'Saved per week', sub: 'per average user' },
          ].map(({ val, label, sub }) => (
            <div key={label}>
              <div className="text-5xl font-extrabold mb-2" style={{ color: '#0CB8D4' }}>{val}</div>
              <p className="text-base font-semibold text-white">{label}</p>
              <p className="text-sm text-slate-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-3">What's included</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Everything you need,<br />nothing you don&apos;t
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
              The complete bookkeeping workflow — from receipt capture to reconciliation report.
            </p>
          </div>

          <div ref={featRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-slate-100 bg-white p-7 hover:border-teal-200 hover:shadow-lg transition-all duration-400 cursor-default"
                style={{
                  opacity: featInView ? 1 : 0,
                  transform: featInView ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.55s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms`,
                }}
              >
                <div
                  className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110"
                  style={{ background: 'rgba(14,184,212,0.10)', color: '#0CB8D4' }}
                >
                  {f.icon}
                </div>
                <h3 className="mb-2 text-[17px] font-bold text-slate-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6" style={{ background: 'linear-gradient(180deg,#f8fdff 0%,#ffffff 100%)' }}>
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-20">
            <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-3">The process</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">Up and running in minutes</h2>
          </div>

          <div className="relative">
            {/* connector line */}
            <div className="hidden lg:block absolute top-10 left-[calc(16.66%+1.5rem)] right-[calc(16.66%+1.5rem)] h-0.5 bg-gradient-to-r from-teal-200 via-teal-400 to-teal-200" />

            <div className="grid lg:grid-cols-3 gap-10">
              {[
                { n: '1', title: 'Upload documents', desc: 'Drag-and-drop receipts and bank statement CSVs. Any format, any quality.', icon: <Upload className="h-7 w-7" /> },
                { n: '2', title: 'AI extracts & categorizes', desc: 'Vendor, amount, taxes, category — extracted in seconds and organized automatically.', icon: <Sparkles className="h-7 w-7" /> },
                { n: '3', title: 'Review & export', desc: 'Confirm matches, fix mismatches, export tax-ready summaries in one click.', icon: <CheckCircle2 className="h-7 w-7" /> },
              ].map((step) => (
                <div key={step.n} className="flex flex-col items-center text-center">
                  <div
                    className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg"
                    style={{ background: 'linear-gradient(135deg,#0CB8D4,#0891b2)', boxShadow: '0 8px 24px rgba(14,184,212,0.30)' }}
                  >
                    <div className="text-white">{step.icon}</div>
                    <div
                      className="absolute -top-3 -right-3 h-7 w-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-extrabold text-white"
                      style={{ background: '#0891b2' }}
                    >
                      {step.n}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────── */}
      <section id="testimonials" className="py-24 px-6 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">Loved by business owners</h2>
            <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">Real people, real results — no more bookkeeping dread.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t) => <Testimonial key={t.name} {...t} />)}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────── */}
      <section id="pricing" className="py-24 px-6" style={{ background: 'linear-gradient(180deg,#f8fdff 0%,#ffffff 100%)' }}>
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">Simple, honest pricing</h2>
            <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">Start free. No per-seat fees. Cancel any time.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PricingCard
              name="Starter" price="Free" desc="For freelancers and sole proprietors."
              features={['50 receipts/month', '1 bank statement/month', 'AI extraction & matching', 'Basic dashboard', 'CSV export']}
              cta="Get started free"
            />
            <PricingCard
              name="Professional" price="$29" period="/mo"
              desc="For growing businesses with regular bookkeeping."
              features={['Unlimited receipts', 'Unlimited statements', 'Priority AI processing', 'Full reconciliation', 'GST/HST + PST reports', 'Accountant exports', 'Email support']}
              highlight cta="Start 14-day free trial"
            />
            <PricingCard
              name="Enterprise" price="Custom"
              desc="For agencies, accountants, multi-entity businesses."
              features={['Multiple organizations', 'Team permissions', 'API access', 'Custom integrations', 'Dedicated account manager', 'SLA support']}
              cta="Talk to sales"
            />
          </div>
          <p className="text-center text-sm text-slate-400 mt-8">
            All plans include Canadian data residency and AES-256 encryption.
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Common questions</h2>
          </div>
          {faqs.map((f) => <Faq key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'linear-gradient(160deg,#e0f5fb 0%,#f0faff 100%)' }}>
        <div className="mx-auto max-w-3xl text-center">
          <Sparkles className="h-10 w-10 mx-auto mb-6" style={{ color: '#0CB8D4' }} />
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Ready to close your books<br />with confidence?
          </h2>
          <p className="text-lg text-slate-500 mb-10 max-w-xl mx-auto">
            Join 10,000+ businesses that stopped dreading bookkeeping. Free to start, no credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-2xl px-9 py-4 text-base font-bold text-white hover:opacity-90 transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#0CB8D4,#0891b2)', boxShadow: '0 8px 32px rgba(14,184,212,0.35)' }}
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-9 py-4 text-base font-semibold text-slate-700 hover:border-teal-300 hover:text-teal-600 transition-all"
            >
              Sign in to account
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────── */}
      <footer className="bg-slate-900 py-14 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0CB8D4,#0891b2)' }}>
                  <Receipt className="h-4 w-4 text-white" />
                </div>
                <span className="text-[15px] font-extrabold text-white">BookKeepingApp</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                AI-powered bookkeeping for Canadian small businesses. Receipt extraction, reconciliation, and tax reporting — automated.
              </p>
            </div>

            {[
              { title: 'Product', links: ['Features', 'Pricing', 'How it works', 'Changelog'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Security', 'PIPEDA'] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l}><a href="#" className="text-sm text-slate-500 hover:text-white transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-600">© 2026 BookKeepingApp. All rights reserved. Canadian data residency.</p>
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-xs text-slate-600">AES-256 encrypted · TLS 1.3</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
