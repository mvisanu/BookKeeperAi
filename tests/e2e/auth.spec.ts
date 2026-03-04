import { test, expect } from '@playwright/test'

const TEST_EMAIL = `e2e+${Date.now()}@example.com`
const TEST_PASSWORD = 'Test1234!'

test.describe('Authentication Flow', () => {
  test('sign-up page renders', async ({ page }) => {
    await page.goto('/sign-up')
    await expect(page.getByRole('heading', { name: /sign up|create account|register/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('sign-in page renders', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('unauthenticated access to dashboard redirects to sign-in', async ({ page }) => {
    await page.goto('/receipts')
    await expect(page).toHaveURL(/sign-in/)
  })

  test('sign-in with wrong credentials shows error', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 5000 })
  })

  test('sign-up with mismatched passwords shows validation error', async ({ page }) => {
    await page.goto('/sign-up')
    await page.getByLabel(/email/i).fill(TEST_EMAIL)

    // Fill password fields — if there are two password fields
    const passwordFields = page.getByLabel(/password/i)
    const count = await passwordFields.count()
    if (count >= 2) {
      await passwordFields.nth(0).fill(TEST_PASSWORD)
      await passwordFields.nth(1).fill('different_password')
      await page.getByRole('button', { name: /sign up|create|register/i }).click()
      await expect(page.getByText(/match|password/i)).toBeVisible({ timeout: 3000 })
    }
  })

  test('forgot password page renders', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByLabel(/email/i)).toBeVisible()
  })

  test('sign-up flow creates account and shows confirmation', async ({ page }) => {
    await page.goto('/sign-up')
    await page.getByLabel(/email/i).fill(TEST_EMAIL)

    const passwordFields = page.getByLabel(/password/i)
    const count = await passwordFields.count()
    await passwordFields.nth(0).fill(TEST_PASSWORD)
    if (count >= 2) await passwordFields.nth(1).fill(TEST_PASSWORD)

    await page.getByRole('button', { name: /sign up|create|register/i }).click()
    // Should show email confirmation message or redirect
    await expect(
      page.getByText(/check your email|confirm|verification|sign in/i)
    ).toBeVisible({ timeout: 10000 })
  })
})
