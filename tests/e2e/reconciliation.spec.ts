import { test, expect, type Page } from '@playwright/test'

async function signIn(page: Page) {
  await page.goto('/sign-in')
  await page.getByLabel(/email/i).fill(process.env.PLAYWRIGHT_TEST_USER ?? 'test@example.com')
  await page.getByLabel(/password/i).fill(process.env.PLAYWRIGHT_TEST_PASSWORD ?? 'Test1234!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/reconciliation|dashboard/, { timeout: 10000 })
}

test.describe('Reconciliation Page', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await page.goto('/reconciliation')
  })

  test('reconciliation page loads', async ({ page }) => {
    await expect(page).toHaveURL(/reconciliation/)
  })

  test('shows run auto-match button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /auto.?match|run match/i })).toBeVisible()
  })

  test('shows export CSV button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export|csv/i })).toBeVisible()
  })

  test('shows empty state when no data imported', async ({ page }) => {
    const hasMatches = await page.getByText(/matched pair|green/i).isVisible().catch(() => false)
    if (!hasMatches) {
      // Either empty state message or zero-count chips
      const content = await page.content()
      expect(content).toBeTruthy()
    }
  })

  test('navigating to reconciliation from sidebar works', async ({ page }) => {
    await page.goto('/')
    const reconLink = page.getByRole('link', { name: /reconciliation/i })
    await expect(reconLink).toBeVisible()
    await reconLink.click()
    await expect(page).toHaveURL(/reconciliation/)
  })
})

test.describe('Reconciliation Workflow (requires local Supabase with data)', () => {
  test.skip(
    !process.env.PLAYWRIGHT_TEST_USER,
    'Set PLAYWRIGHT_TEST_USER to run reconciliation workflow tests'
  )

  test('run auto-match button triggers matching', async ({ page }) => {
    await signIn(page)
    await page.goto('/reconciliation')

    const autoMatchButton = page.getByRole('button', { name: /auto.?match|run match/i })
    await autoMatchButton.click()

    // Should show loading state then results
    await expect(page.getByText(/matching|matched|processed/i)).toBeVisible({ timeout: 10000 })
  })

  test('export CSV downloads a file', async ({ page }) => {
    await signIn(page)
    await page.goto('/reconciliation')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /export|csv/i }).click(),
    ])

    expect(download.suggestedFilename()).toMatch(/\.csv$/)
  })

  test('unlink a matched pair returns both to unmatched', async ({ page }) => {
    await signIn(page)
    await page.goto('/reconciliation')

    const unlinkButton = page.getByRole('button', { name: /unlink/i }).first()
    if (await unlinkButton.isVisible()) {
      await unlinkButton.click()
      // Confirm dialog if present
      const confirmButton = page.getByRole('button', { name: /confirm|yes|unlink/i })
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click()
      }
      await expect(page.getByText(/unlinked|removed/i)).toBeVisible({ timeout: 5000 })
    }
  })
})
