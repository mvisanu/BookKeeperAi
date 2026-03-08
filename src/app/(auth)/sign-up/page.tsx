'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check } from 'lucide-react'
import { signUp } from '@/lib/auth/actions'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

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

export default function SignUpPage() {
  const [success, setSuccess] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    const result = await signUp(values.email, values.password)
    if (result.error) {
      setError('root', { message: result.error })
    } else {
      setSuccess(true)
    }
  }

  if (success) {
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
              We sent a confirmation link to your email address. Click it to activate your account.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div className="mb-6">
        <h1 className="text-lg font-bold" style={{ color: 'oklch(0.93 0.02 259)' }}>Create an account</h1>
        <p className="text-sm mt-0.5" style={{ color: 'oklch(0.48 0.04 262)' }}>
          Enter your email and password to get started
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label style={labelStyle}>Email address</label>
          <input
            type="email"
            placeholder="you@example.com"
            className="auth-input"
            style={inputStyle}
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-xs" style={{ color: '#FF4757' }}>{errors.email.message}</p>
          )}
        </div>

        <div>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            className="auth-input"
            style={inputStyle}
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-xs" style={{ color: '#FF4757' }}>{errors.password.message}</p>
          )}
        </div>

        {errors.root && (
          <div
            className="rounded-lg px-3 py-2.5 text-sm"
            style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', color: '#FF4757' }}
          >
            {errors.root.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg py-2.5 text-sm font-bold transition-all duration-150"
          style={{
            background: 'linear-gradient(135deg, #27C5F5, #5EB5FF)',
            color: 'oklch(0.09 0.04 270)',
            boxShadow: isSubmitting ? 'none' : '0 0 20px rgba(39,197,245,0.3)',
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-sm text-center" style={{ color: 'oklch(0.48 0.04 262)' }}>
          Already have an account?{' '}
          <Link href="/sign-in" className="font-semibold" style={{ color: '#27C5F5' }}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
