'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { resetPassword, updatePassword } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const emailSchema = z.object({ email: z.string().email('Enter a valid email') })
const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type EmailValues = z.infer<typeof emailSchema>
type PasswordValues = z.infer<typeof passwordSchema>

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
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a password reset link. Click it to set a new password.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (isRecovery) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Set new password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input id="password" type="password" {...passwordForm.register('password')} />
              {passwordForm.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.password.message}
                </p>
              )}
            </div>
            {passwordForm.formState.errors.root && (
              <p className="text-sm text-destructive">
                {passwordForm.formState.errors.root.message}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={passwordForm.formState.isSubmitting}
            >
              {passwordForm.formState.isSubmitting ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Enter your email to receive a password reset link</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...emailForm.register('email')}
            />
            {emailForm.formState.errors.email && (
              <p className="text-sm text-destructive">
                {emailForm.formState.errors.email.message}
              </p>
            )}
          </div>
          {emailForm.formState.errors.root && (
            <p className="text-sm text-destructive">{emailForm.formState.errors.root.message}</p>
          )}
          <Button type="submit" className="w-full" disabled={emailForm.formState.isSubmitting}>
            {emailForm.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
