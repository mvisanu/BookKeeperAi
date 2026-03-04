'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import {
  Receipt,
  Zap,
  Shield,
  BarChart3,
  Clock,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  FileText,
  RefreshCw,
  Sparkles,
  Star,
  Menu,
  X,
} from 'lucide-react'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '600', '700', '900'],
  style: ['normal', 'italic'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
})

/* ─── Counter hook ─────────────────────────────────────────── */
function useCounter(end: number, duration = 2000, started = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!started) return
    let startTime: number | null = null
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, started])
  return count
}

/* ─── Intersection observer hook ───────────────────────────── */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect() } },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* ─── FAQ item ─────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/10">
      <button
        className="flex w-full items-center justify-between py-5 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-base font-medium text-white/90">{q}</span>
        <ChevronDown
          className="h-5 w-5 text-[#27C5F5] shrink-0 ml-4 transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '300px' : '0px' }}
      >
        <p className="pb-5 text-sm leading-relaxed text-white/50">{a}</p>
      </div>
    </div>
  )
}

/* ─── Testimonial card ─────────────────────────────────────── */
function TestimonialCard({
  quote, name, role, rating, delay,
}: { quote: string; name: string; role: string; rating: number; delay: number }) {
  return (
    <div
      className="group rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-sm hover:border-[#27C5F5]/30 hover:bg-white/5 transition-all duration-500"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-4 flex gap-1">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-[#F0B429] text-[#F0B429]" />
        ))}
      </div>
      <p className="mb-5 text-sm leading-relaxed text-white/60 italic">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#27C5F5]/40 to-[#1a9dc4]/40 flex items-center justify-center text-sm font-bold text-[#27C5F5]">
          {name[0]}
        </div>
        <div>
          <p className="text-sm font-semibold text-white/90">{name}</p>
          <p className="text-xs text-white/40">{role}</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Mock receipt UI ──────────────────────────────────────── */
function MockReceiptUI() {
  const items = [
    { vendor: 'Office Depot', amount: '$142.80', cat: 'Office Supplies', status: 'matched' },
    { vendor: 'Delta Airlines', amount: '$1,204.50', cat: 'Travel', status: 'matched' },
    { vendor: 'Starbucks', amount: '$28.60', cat: 'Meals & Ent.', status: 'processing' },
    { vendor: 'Adobe Inc.', amount: '$54.99', cat: 'Software', status: 'matched' },
  ]

  return (
    <div className="relative mx-auto max-w-sm">
      {/* Glow */}
      <div className="absolute -inset-4 rounded-3xl bg-[#27C5F5]/10 blur-3xl" />

      {/* Card */}
      <div className="relative rounded-2xl border border-white/10 bg-[#111318] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-xs font-medium text-white/40 uppercase tracking-widest">BookKeeperAI</p>
            <p className="text-sm font-bold text-white mt-0.5">March 2026</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-green-400">AI Active</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 border-b border-white/8 divide-x divide-white/8">
          {[['24', 'Matched'], ['2', 'Pending'], ['$1,431', 'GST/HST']].map(([val, label]) => (
            <div key={label} className="p-4 text-center">
              <p className="text-lg font-bold text-[#27C5F5]">{val}</p>
              <p className="text-xs text-white/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Transaction list */}
        <div className="divide-y divide-white/5">
          {items.map((item) => (
            <div key={item.vendor} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#27C5F5]/10 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-[#27C5F5]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90">{item.vendor}</p>
                  <p className="text-xs text-white/40">{item.cat}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{item.amount}</p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    item.status === 'matched'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {item.status === 'matched' ? 'Matched' : 'Processing…'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/8 px-5 py-3 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#27C5F5]" />
          <p className="text-xs text-white/40">AI matched 4 transactions in 1.2s</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Pricing card ─────────────────────────────────────────── */
function PricingCard({
  name, price, period, desc, features, highlight, cta,
}: {
  name: string
  price: string
  period?: string
  desc: string
  features: string[]
  highlight?: boolean
  cta: string
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl p-8 transition-all duration-500 hover:-translate-y-1 ${
        highlight
          ? 'bg-gradient-to-b from-[#27C5F5]/15 to-[#27C5F5]/5 border border-[#27C5F5]/40 shadow-[0_0_60px_rgba(39,197,245,0.15)]'
          : 'bg-white/3 border border-white/10 hover:border-white/20'
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-[#27C5F5] text-[#09090B] text-xs font-bold px-4 py-1 rounded-full uppercase tracking-widest">
            Most Popular
          </span>
        </div>
      )}
      <div className="mb-6">
        <p className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-2">{name}</p>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-5xl font-black text-white">{price}</span>
          {period && <span className="text-white/40 mb-2">{period}</span>}
        </div>
        <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
      </div>
      <ul className="flex-1 space-y-3 mb-8">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-white/70">
            <CheckCircle2 className="h-4 w-4 text-[#27C5F5] shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/sign-up"
        className={`w-full rounded-xl py-3 text-center text-sm font-semibold transition-all duration-200 ${
          highlight
            ? 'bg-[#27C5F5] text-[#09090B] hover:bg-[#1aafd8] shadow-lg shadow-[#27C5F5]/25'
            : 'bg-white/8 text-white hover:bg-white/12 border border-white/10'
        }`}
      >
        {cta}
      </Link>
    </div>
  )
}

/* ─── Main page ────────────────────────────────────────────── */
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const { ref: statsRef, inView: statsInView } = useInView(0.3)
  const receipts = useCounter(2400000, 2500, statsInView)
  const accuracy = useCounter(998, 2000, statsInView)
  const hours = useCounter(14, 1800, statsInView)

  const { ref: featuresRef, inView: featuresInView } = useInView(0.1)

  const features = [
    {
      icon: <Receipt className="h-6 w-6" />,
      title: 'AI Receipt Extraction',
      desc: 'Snap a photo or upload a PDF. Our AI reads vendor, amount, taxes, and line items instantly — no manual entry.',
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: 'Bank Statement Parsing',
      desc: 'Import CSV or PDF statements from any Canadian bank. Columns auto-mapped, transactions cleanly extracted.',
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Smart Auto-Matching',
      desc: 'Receipts and bank transactions matched by amount, date, and vendor with configurable fuzzy tolerance.',
    },
    {
      icon: <RefreshCw className="h-6 w-6" />,
      title: 'One-Click Reconciliation',
      desc: 'See exactly what matched, what didn\'t, and why. Drag receipts to transactions for manual overrides.',
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Spending Intelligence',
      desc: 'Category breakdowns, top vendors, monthly trends — understand your business spending at a glance.',
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Tax-Ready Reports',
      desc: 'Export GST/HST and PST summaries, categorized transactions, and reconciliation reports for your accountant.',
    },
  ]

  const testimonials = [
    {
      quote: "I used to spend 6 hours every Sunday matching receipts to bank statements. Now it takes 20 minutes and I actually understand where my money goes.",
      name: 'Sarah M.', role: 'Restaurant Owner, Toronto', rating: 5,
    },
    {
      quote: "The AI matched 847 transactions in my first import and got 94% of them right on day one. The manual match UI for the rest is genuinely clever.",
      name: 'David K.', role: 'Freelance Designer, Vancouver', rating: 5,
    },
    {
      quote: "My accountant loved getting clean, categorized exports with matched receipts. Cut our annual tax prep by a full day.",
      name: 'Jennifer L.', role: 'CFO, 12-person Agency', rating: 5,
    },
    {
      quote: "Receipt OCR handles terrible photos. Crumpled paper, bad lighting — it still pulls the right numbers. Remarkable.",
      name: 'Marco R.', role: 'General Contractor, Calgary', rating: 5,
    },
    {
      quote: "Switched from QuickBooks for the AI reconciliation alone. The bank statement import is also 10x faster to set up.",
      name: 'Priya S.', role: 'E-commerce Founder, Ottawa', rating: 5,
    },
    {
      quote: "The dashboard gives me an instant health score for my bookkeeping. Never been this confident going into tax season.",
      name: 'Thomas B.', role: 'Independent Consultant, Montreal', rating: 5,
    },
  ]

  const faqs = [
    { q: 'Which banks are supported for statement imports?', a: 'Any bank that exports CSV or PDF. We auto-map columns from RBC, TD, Scotiabank, BMO, CIBC, and most credit unions. For other banks, our AI column-mapper handles custom formats.' },
    { q: 'How accurate is the receipt OCR?', a: 'Our AI achieves 96–99% accuracy on clear photos and PDFs. It extracts vendor name, date, subtotal, GST/HST, PST, and line items. Failed extractions can be manually corrected and the AI learns from corrections.' },
    { q: 'Is my financial data secure?', a: 'All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We\'re hosted on Canadian infrastructure. You own your data — export and delete at any time.' },
    { q: 'Can I handle multiple businesses?', a: 'Enterprise plans support multiple organizations under one account with separate ledgers, users, and reporting. Starter and Professional plans support one organization.' },
    { q: 'What\'s the difference between matching and reconciliation?', a: 'Matching links a receipt to a bank transaction (same vendor, amount, date). Reconciliation is the broader process of confirming all transactions are accounted for. BookKeeperAI does both.' },
    { q: 'Do you support multicurrency?', a: 'Foreign transaction support is on our roadmap for Q3 2026. Currently we work in CAD with GST/HST and PST tax calculations.' },
  ]

  return (
    <div
      className={`${playfair.variable} ${dmSans.variable}`}
      style={{
        fontFamily: 'var(--font-body), sans-serif',
        background: '#09090B',
        color: '#F5F0E8',
        overflowX: 'hidden',
      }}
    >
      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(9,9,11,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#27C5F5] flex items-center justify-center">
              <Receipt className="h-4 w-4 text-[#09090B]" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-bold text-white">
              BookKeeperAI
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How It Works', 'Pricing', 'Testimonials'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="text-sm text-white/50 hover:text-white transition-colors duration-200"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl bg-[#27C5F5] px-5 py-2.5 text-sm font-semibold text-[#09090B] hover:bg-[#1aafd8] transition-colors duration-200 shadow-lg shadow-[#27C5F5]/20"
            >
              Start free
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/8 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/8 bg-[#09090B]/98 backdrop-blur-xl">
            <div className="px-6 py-4 space-y-3">
              {['Features', 'How It Works', 'Pricing', 'Testimonials'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                  className="block text-sm text-white/60 hover:text-white py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item}
                </a>
              ))}
              <div className="pt-3 border-t border-white/8 flex flex-col gap-2">
                <Link href="/sign-in" className="text-center py-2.5 text-sm text-white/60">Sign in</Link>
                <Link href="/sign-up" className="text-center rounded-xl bg-[#27C5F5] py-2.5 text-sm font-semibold text-[#09090B]">
                  Start free
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(39,197,245,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(39,197,245,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Radial glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(39,197,245,0.08) 0%, transparent 70%)' }}
        />

        <div className="relative mx-auto max-w-7xl px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#27C5F5]/30 bg-[#27C5F5]/8 px-4 py-2 mb-8">
              <Sparkles className="h-3.5 w-3.5 text-[#27C5F5]" />
              <span className="text-xs font-medium text-[#27C5F5] uppercase tracking-widest">AI-Powered Bookkeeping</span>
            </div>

            <h1
              style={{ fontFamily: 'var(--font-display)', lineHeight: 1.1 }}
              className="text-5xl sm:text-6xl xl:text-7xl font-black text-white mb-6"
            >
              Your books,{' '}
              <span className="italic text-[#27C5F5]">balanced</span>
              <br />
              by intelligence.
            </h1>

            <p className="text-lg text-white/50 leading-relaxed mb-10 max-w-lg">
              Upload receipts and bank statements. Our AI extracts, categorizes, and reconciles every transaction automatically — so you spend time running your business, not your books.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-xl bg-[#27C5F5] px-7 py-3.5 text-base font-semibold text-[#09090B] hover:bg-[#1aafd8] transition-all duration-200 shadow-xl shadow-[#27C5F5]/25 hover:shadow-[#27C5F5]/40 hover:-translate-y-0.5"
              >
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-7 py-3.5 text-base font-medium text-white/70 hover:text-white hover:border-white/30 transition-all duration-200"
              >
                See how it works
              </a>
            </div>

            <p className="mt-6 text-xs text-white/30">No credit card required · Cancel anytime · Canadian data residency</p>
          </div>

          {/* Right: Mock UI */}
          <div className="flex justify-center">
            <MockReceiptUI />
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs text-white/25 uppercase tracking-widest">Scroll</span>
          <ChevronDown className="h-4 w-4 text-white/25" />
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────── */}
      <section ref={statsRef} className="border-y border-white/6 bg-white/2 py-16">
        <div className="mx-auto max-w-5xl px-6 grid grid-cols-1 sm:grid-cols-3 gap-12 text-center">
          {[
            {
              value: receipts >= 1000000
                ? `${(receipts / 1000000).toFixed(1)}M+`
                : `${Math.round(receipts / 1000)}K+`,
              label: 'Receipts processed',
              sub: 'and counting',
            },
            {
              value: `${(accuracy / 10).toFixed(1)}%`,
              label: 'Extraction accuracy',
              sub: 'on clean documents',
            },
            {
              value: `${hours}hrs`,
              label: 'Saved per week',
              sub: 'for our average user',
            },
          ].map(({ value, label, sub }) => (
            <div key={label} className="space-y-2">
              <div
                style={{ fontFamily: 'var(--font-display)' }}
                className="text-5xl font-black text-[#27C5F5]"
              >
                {value}
              </div>
              <p className="text-base font-semibold text-white/80">{label}</p>
              <p className="text-sm text-white/35">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section id="features" className="py-28 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#27C5F5] uppercase tracking-widest mb-4">What you get</p>
            <h2
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-4xl sm:text-5xl font-black text-white"
            >
              Everything bookkeeping requires
            </h2>
            <p className="mt-4 text-base text-white/45 max-w-xl mx-auto">
              From receipt capture to reconciliation report — the full workflow, automated.
            </p>
          </div>

          <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-white/8 bg-white/2 p-8 hover:border-[#27C5F5]/30 hover:bg-white/4 transition-all duration-500 cursor-default"
                style={{
                  opacity: featuresInView ? 1 : 0,
                  transform: featuresInView ? 'translateY(0)' : 'translateY(24px)',
                  transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
                }}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-[#27C5F5]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#27C5F5]/10 text-[#27C5F5] group-hover:bg-[#27C5F5]/20 transition-colors duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="mb-3 text-lg font-bold text-white">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-white/50">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 px-6 bg-white/2">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-20">
            <p className="text-xs font-semibold text-[#27C5F5] uppercase tracking-widest mb-4">The process</p>
            <h2
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-4xl sm:text-5xl font-black text-white"
            >
              Up and running in minutes
            </h2>
          </div>

          <div className="space-y-20">
            {[
              {
                step: '01',
                title: 'Upload your documents',
                desc: 'Drag-and-drop receipts (JPG, PNG, PDF) and bank statement CSVs. Our AI handles the rest — no templates, no formatting required.',
                icon: <Receipt className="h-8 w-8 text-[#27C5F5]" />,
                highlights: ['Any image quality', 'Any CSV format', 'Batch uploads supported'],
              },
              {
                step: '02',
                title: 'AI extracts and categorizes',
                desc: 'Within seconds, the AI reads every vendor, amount, date, and tax line. Transactions are categorized automatically based on your business type.',
                icon: <Sparkles className="h-8 w-8 text-[#27C5F5]" />,
                highlights: ['GST/HST + PST extraction', 'Smart categorization', 'Learns your patterns'],
              },
              {
                step: '03',
                title: 'Review, match, and export',
                desc: 'See matched pairs side-by-side. Fix any mismatches with a drag. Export tax-ready summaries directly to your accountant or accounting software.',
                icon: <CheckCircle2 className="h-8 w-8 text-[#27C5F5]" />,
                highlights: ['One-click reconciliation', 'Audit trail included', 'CSV + PDF export'],
              },
            ].map((step, i) => (
              <div
                key={step.step}
                className={`grid lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? 'lg:grid-flow-dense' : ''}`}
              >
                <div className={i % 2 === 1 ? 'lg:col-start-2' : ''}>
                  <div className="mb-6 inline-flex items-center gap-3">
                    <span
                      style={{ fontFamily: 'var(--font-display)' }}
                      className="text-7xl font-black text-white/6"
                    >
                      {step.step}
                    </span>
                    <div className="h-px flex-1 bg-white/8" />
                  </div>
                  <h3
                    style={{ fontFamily: 'var(--font-display)' }}
                    className="text-3xl font-bold text-white mb-4"
                  >
                    {step.title}
                  </h3>
                  <p className="text-base text-white/50 leading-relaxed mb-6">{step.desc}</p>
                  <ul className="space-y-2">
                    {step.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-3 text-sm text-white/60">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#27C5F5]" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={`flex justify-center ${i % 2 === 1 ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                  <div className="relative w-full max-w-sm">
                    <div className="absolute -inset-3 rounded-2xl bg-[#27C5F5]/6 blur-2xl" />
                    <div className="relative rounded-2xl border border-white/10 bg-[#111318] p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
                      <div className="h-16 w-16 rounded-2xl bg-[#27C5F5]/10 flex items-center justify-center">
                        {step.icon}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-white/80">Step {step.step}</p>
                        <p className="text-xs text-white/35 mt-1">{step.title}</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5 mt-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-green-400">Processing complete</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────── */}
      <section id="testimonials" className="py-28 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#27C5F5] uppercase tracking-widest mb-4">What they say</p>
            <h2
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-4xl sm:text-5xl font-black text-white"
            >
              Loved by business owners
            </h2>
            <p className="mt-4 text-base text-white/45 max-w-xl mx-auto">
              From solo freelancers to 20-person agencies — they stopped dreading bookkeeping.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <TestimonialCard key={t.name} {...t} delay={i * 80} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section id="pricing" className="py-28 px-6 bg-white/2">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#27C5F5] uppercase tracking-widest mb-4">Simple pricing</p>
            <h2
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-4xl sm:text-5xl font-black text-white"
            >
              Start free, scale as you grow
            </h2>
            <p className="mt-4 text-base text-white/45 max-w-xl mx-auto">
              No per-seat fees. No hidden limits. Cancel any time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PricingCard
              name="Starter"
              price="Free"
              desc="Perfect for freelancers and sole proprietors just getting started."
              features={[
                'Up to 50 receipts/month',
                '1 bank statement/month',
                'AI extraction & matching',
                'Basic spending dashboard',
                'CSV export',
              ]}
              cta="Get started free"
            />
            <PricingCard
              name="Professional"
              price="$29"
              period="/month"
              desc="For growing businesses with regular bookkeeping needs."
              features={[
                'Unlimited receipts',
                'Unlimited bank statements',
                'Priority AI processing',
                'Full reconciliation suite',
                'GST/HST + PST reports',
                'Accountant-ready exports',
                'Email support',
              ]}
              highlight
              cta="Start 14-day free trial"
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              desc="For agencies, accountants, and businesses managing multiple entities."
              features={[
                'Multiple organizations',
                'Team access & permissions',
                'API access',
                'Custom integrations',
                'Dedicated account manager',
                'SLA & priority support',
              ]}
              cta="Talk to sales"
            />
          </div>

          <p className="text-center text-sm text-white/30 mt-8">
            All plans include Canadian data residency and AES-256 encryption.
          </p>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section id="faq" className="py-28 px-6">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#27C5F5] uppercase tracking-widest mb-4">FAQ</p>
            <h2
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-4xl sm:text-5xl font-black text-white"
            >
              Common questions
            </h2>
          </div>

          <div>
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="mx-auto max-w-4xl">
          <div
            className="relative rounded-3xl overflow-hidden text-center px-8 py-20"
            style={{
              background: 'linear-gradient(135deg, rgba(39,197,245,0.12) 0%, rgba(39,197,245,0.04) 100%)',
              border: '1px solid rgba(39,197,245,0.2)',
              boxShadow: '0 0 80px rgba(39,197,245,0.12)',
            }}
          >
            <div
              className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(39,197,245,0.15) 0%, transparent 70%)' }}
            />
            <div className="relative">
              <Sparkles className="h-8 w-8 text-[#27C5F5] mx-auto mb-6" />
              <h2
                style={{ fontFamily: 'var(--font-display)' }}
                className="text-4xl sm:text-5xl font-black text-white mb-4"
              >
                Ready to close your books<br />
                <span className="italic text-[#27C5F5]">with confidence?</span>
              </h2>
              <p className="text-base text-white/50 max-w-lg mx-auto mb-10">
                Join business owners who recovered hundreds of hours from bookkeeping. Start free, no credit card required.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#27C5F5] px-8 py-4 text-base font-semibold text-[#09090B] hover:bg-[#1aafd8] transition-all duration-200 shadow-xl shadow-[#27C5F5]/30 hover:-translate-y-0.5"
                >
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-8 py-4 text-base font-medium text-white/70 hover:text-white hover:border-white/30 transition-all duration-200"
                >
                  Sign in to your account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-white/6 py-12 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-[#27C5F5] flex items-center justify-center">
                  <Receipt className="h-3.5 w-3.5 text-[#09090B]" />
                </div>
                <span style={{ fontFamily: 'var(--font-display)' }} className="font-bold text-white">
                  BookKeeperAI
                </span>
              </div>
              <p className="text-xs text-white/35 leading-relaxed max-w-xs">
                AI-powered bookkeeping for Canadian small businesses. Receipt extraction, bank reconciliation, and tax reporting — automated.
              </p>
            </div>

            {[
              {
                title: 'Product',
                links: ['Features', 'Pricing', 'How it works', 'Changelog'],
              },
              {
                title: 'Company',
                links: ['About', 'Blog', 'Careers', 'Contact'],
              },
              {
                title: 'Legal',
                links: ['Privacy Policy', 'Terms of Service', 'Security', 'PIPEDA Compliance'],
              },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">{col.title}</p>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-white/35 hover:text-white/70 transition-colors duration-200">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/6 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/25">
              © 2026 BookKeeperAI. All rights reserved. Canadian data residency.
            </p>
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-white/25" />
              <span className="text-xs text-white/25">AES-256 encrypted · TLS 1.3 in transit</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
