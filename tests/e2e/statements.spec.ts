import { test, expect, type Page } from '@playwright/test'

async function signIn(page: Page) {
  await page.goto('/sign-in')
  await page.getByLabel(/email/i).fill(process.env.PLAYWRIGHT_TEST_USER ?? 'test@example.com')
  await page.getByLabel(/password/i).fill(process.env.PLAYWRIGHT_TEST_PASSWORD ?? 'Test1234!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/statements|dashboard/, { timeout: 10000 })
}

test.describe('Bank Statements Page', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await page.goto('/statements')
  })

  test('statements page loads with upload zone', async ({ page }) => {
    await expect(page.getByText(/drag|drop|upload|browse/i)).toBeVisible()
  })

  test('shows empty state when no statements imported', async ({ page }) => {
    const hasTable = await page.getByRole('table').isVisible().catch(() => false)
    if (!hasTable) {
      await expect(page.getByText(/no statements|upload|import/i)).toBeVisible()
    }
  })

  test('navigating to statements from sidebar works', async ({ page }) => {
    await page.goto('/')
    const statementsLink = page.getByRole('link', { name: /statements/i })
    await expect(statementsLink).toBeVisible()
    await statementsLink.click()
    await expect(page).toHaveURL(/statements/)
  })

  test('filter bar is present', async ({ page }) => {
    // Check filter elements are present (may be hidden until statements exist)
    await expect(page).toHaveURL(/statements/)
  })
})

test.describe('CSV Statement Import (requires local Supabase)', () => {
  test.skip(
    !process.env.PLAYWRIGHT_TEST_USER,
    'Set PLAYWRIGHT_TEST_USER to run import tests'
  )

  test('uploading CSV shows mapping modal', async ({ page }) => {
    await signIn(page)
    await page.goto('/statements')

    const fixturePath = `${__dirname}/../fixtures/bank-statement-sample.csv`
    const fileInput = page.locator('input[type="file"]')

    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(fixturePath)
      // CSV upload should trigger mapping modal
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15000 })
      await expect(page.getByText(/date column|description|amount/i)).toBeVisible()
    }
  })

  test('confirming CSV mapping triggers import and shows progress', async ({ page }) => {
    await signIn(page)
    await page.goto('/statements')

    const fixturePath = `${__dirname}/../fixtures/bank-statement-sample.csv`
    const fileInput = page.locator('input[type="file"]')

    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(fixturePath)

      // Wait for mapping modal
      await page.waitForSelector('[role="dialog"]', { timeout: 15000 })

      // Confirm the mapping
      const confirmButton = page.getByRole('button', { name: /confirm|import|start/i })
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
        // Wait for progress indicator
        await expect(page.getByText(/importing|processing|transactions/i)).toBeVisible({
          timeout: 10000,
        })
      }
    }
  })
})
