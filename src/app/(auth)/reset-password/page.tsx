'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check } from 'lucide-react'
import { resetPassword, updatePassword } from '@/lib/auth/actions'

const emailSchema = z.object({ email: z.string().email('Enter a valid email') })
const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type EmailValues = z.infer<typeof emailSchema>
type PasswordValues = z.infer<typeof passwordSchema>

const cardStyle = {
  background: 'linear-gradient(180deg, oklch(0.15 0.04 268) 0%, oklch(0.12 0.04 268) 100%)',
  border: '1px solid oklch(1 0 0 / 7%)',
  borderRadius: '1rem',
  padding: '2rem',
}

const inputStyle = {
  width: '100%',
  background: 'oklch(1 0 0 / 4%)',
  border: '1px solid oklch(1 0 0 / 9%)',
  borderRadius: '0.5rem',
  padding: '0.625rem 0.75rem',
  fontSize: '0.875rem',
  color: 'oklch(0.82 0.02 259)',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'oklch(0.55 0.04 262)',
  marginBottom: '0.375rem',
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const isRecovery = searchParams.get('type') === 'recovery'
  const [emailSent, setEmailSent] = useState(false)

  const emailForm = useForm<EmailValues>({ resolver: zodResolver(emailSchema) })
  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

  const onEmailSubmit = async (values: EmailValues) => {
    const result = await resetPassword(values.email)
    if (result.error) {
      emailForm.setError('root', { message: result.error })
    } else {
      setEmailSent(true)
    }
  }

  const onPasswordSubmit = async (values: PasswordValues) => {
    const result = await updatePassword(values.password)
    if (result && result.error) {
      passwordForm.setError('root', { message: result.error })
    }
  }

  if (emailSent) {
    return (
      <div style={cardStyle}>
        <div className="flex flex-col items-center text-center py-4 gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: 'rgba(16,217,161,0.12)', border: '1px solid rgba(16,217,161,0.25)' }}
          >
            <Check className="h-6 w-6" style={{ color: '#10D9A1' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'oklch(0.93 0.02 259)' }}>Check your email</h2>
            <p className="text-sm mt-1.5" style={{ color: 'oklch(0.55 0.04 262)' }}>
              We sent a password reset link. Click it to set a new password.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isRecovery) {
    return (
      <div style={cardStyle}>
        <div className="mb-6">
          <h1 className="text-lg font-bold" style={{ color: 'oklch(0.93 0.02 259)' }}>Set new password</h1>
          <p className="text-sm mt-0.5" style={{ color: 'oklch(0.48 0.04 262)' }}>Enter your new password below</p>
        </div>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
          <div>
            <label style={labelStyle}>New Password</label>
            <input
              type="password"
              className="auth-input"
              style={inputStyle}
              {...passwordForm.register('password')}
            />
            {passwordForm.formState.errors.password && (
              <p className="mt-1 text-xs" style={{ color: '#FF4757' }}>
                {passwordForm.formState.errors.password.message}
              </p>
            )}
          </div>
          {passwordForm.formState.errors.root && (
            <div
              className="rounded-lg px-3 py-2.5 text-sm"
              style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', color: '#FF4757' }}
            >
              {passwordForm.formState.errors.root.message}
            </div>
          )}
          <button
            type="submit"
            disabled={passwordForm.formState.isSubmitting}
            className="w-full rounded-lg py-2.5 text-sm font-bold transition-all duration-150"
            style={{
              background: 'linear-gradient(135deg, #27C5F5, #5EB5FF)',
              color: 'oklch(0.09 0.04 270)',
              boxShadow: passwordForm.formState.isSubmitting ? 'none' : '0 0 20px rgba(39,197,245,0.3)',
              opacity: passwordForm.formState.isSubmitting ? 0.6 : 1,
            }}
          >
            {passwordForm.formState.isSubmitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div className="mb-6">
        <h1 className="text-lg font-bold" style={{ color: 'oklch(0.93 0.02 259)' }}>Reset password</h1>
        <p className="text-sm mt-0.5" style={{ color: 'oklch(0.48 0.04 262)' }}>
          Enter your email to receive a password reset link
        </p>
      </div>
      <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
        <div>
          <label style={labelStyle}>Email address</label>
          <input
            type="email"
            placeholder="you@example.com"
            className="auth-input"
            style={inputStyle}
            {...emailForm.register('email')}
          />
          {emailForm.formState.errors.email && (
            <p className="mt-1 text-xs" style={{ color: '#FF4757' }}>
              {emailForm.formState.errors.email.message}
            </p>
          )}
        </div>
        {emailForm.formState.errors.root && (
          <div
            className="rounded-lg px-3 py-2.5 text-sm"
            style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', color: '#FF4757' }}
          >
            {emailForm.formState.errors.root.message}
          </div>
        )}
        <button
          type="submit"
          disabled={emailForm.formState.isSubmitting}
          className="w-full rounded-lg py-2.5 text-sm font-bold transition-all duration-150"
          style={{
            background: 'linear-gradient(135deg, #27C5F5, #5EB5FF)',
            color: 'oklch(0.09 0.04 270)',
            boxShadow: emailForm.formState.isSubmitting ? 'none' : '0 0 20px rgba(39,197,245,0.3)',
            opacity: emailForm.formState.isSubmitting ? 0.6 : 1,
          }}
        >
          {emailForm.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </div>
  )
}
