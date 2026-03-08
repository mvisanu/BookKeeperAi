import { createClient } from '@/lib/supabase/server'
import { CheckCircle2, Cpu, Database } from 'lucide-react'

export const metadata = { title: 'Settings — BookKeeperAI' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const cardStyle = {
    background: 'linear-gradient(180deg, oklch(0.15 0.04 268) 0%, oklch(0.12 0.04 268) 100%)',
    border: '1px solid oklch(1 0 0 / 7%)',
  }
  const labelStyle = { color: 'oklch(0.45 0.04 262)' }
  const valueStyle = {
    background: 'oklch(1 0 0 / 4%)',
    border: '1px solid oklch(1 0 0 / 7%)',
    color: 'oklch(0.75 0.02 259)',
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl animate-page-enter">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'oklch(0.93 0.02 259)' }}>
          Settings
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'oklch(0.48 0.04 262)' }}>
          Manage your account and connected services.
        </p>
      </div>

      {/* Account */}
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'oklch(0.82 0.02 259)' }}>Account</h3>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.48 0.04 262)' }}>Your authentication details</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={labelStyle}>
              Email address
            </label>
            <input
              value={user?.email ?? ''}
              disabled
              className="w-full rounded-lg px-3 py-2.5 text-sm font-medium"
              style={valueStyle}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={labelStyle}>
              User ID
            </label>
            <input
              value={user?.id ?? ''}
              disabled
              className="w-full rounded-lg px-3 py-2.5 text-xs font-mono"
              style={{ ...valueStyle, color: 'oklch(0.55 0.04 262)' }}
            />
          </div>
        </div>
      </div>

      {/* Connected services */}
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'oklch(0.82 0.02 259)' }}>Connected Services</h3>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.48 0.04 262)' }}>Integrations powering your workspace</p>
        </div>
        <div className="p-5 space-y-3">
          {[
            {
              icon: <Cpu className="h-4 w-4" style={{ color: '#27C5F5' }} />,
              iconBg: 'rgba(39,197,245,0.1)',
              name: 'Google Gemini AI',
              desc: 'Receipt & statement extraction',
              status: 'Connected',
            },
            {
              icon: <Database className="h-4 w-4" style={{ color: '#10D9A1' }} />,
              iconBg: 'rgba(16,217,161,0.1)',
              name: 'Supabase',
              desc: 'Database, auth & file storage',
              status: 'Connected',
            },
          ].map(({ icon, iconBg, name, desc, status }) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ background: 'oklch(1 0 0 / 3%)', border: '1px solid oklch(1 0 0 / 6%)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                  style={{ background: iconBg }}
                >
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'oklch(0.82 0.02 259)' }}>{name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'oklch(0.48 0.04 262)' }}>{desc}</p>
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: 'rgba(16,217,161,0.12)', color: '#10D9A1' }}
              >
                <CheckCircle2 className="h-3 w-3" />
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
