import { expect, type Page, test } from '@playwright/test'

const authUser = {
  id: 31,
  email: 'auth@pdf-flow.test',
  full_name: 'Auth User',
  role: 'free',
  is_active: true,
  is_verified: true,
  created_at: '2026-06-12T08:00:00.000Z',
}

async function mockAuthShell(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('pdf-flow-locale', 'en')
  })

  await page.route('**/api/v1/admin/public-config', async (route) => {
    await route.fulfill({ json: { settings: {}, feature_flags: {}, content_blocks: {} } })
  })

  await page.route('**/api/v1/auth/me', async (route) => {
    const authHeader = route.request().headers().authorization || ''
    if (!authHeader.includes('password-access-token')) {
      await route.fulfill({ status: 401, json: { detail: 'Not authenticated' } })
      return
    }

    await route.fulfill({ json: authUser })
  })

  await page.route('**/api/v1/users/me/stats', async (route) => {
    await route.fulfill({
      json: {
        total_requests: 2,
        requests_today: 1,
        storage_used: 0,
        quota_remaining: 19,
        quota_limit: 20,
        role: 'free',
      },
    })
  })
}

test.describe('Auth route state and notices', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthShell(page)
  })

  test('keeps the sign-in workspace accessible and overflow-safe', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 })
    await page.goto('/auth/login')

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await expect(page.getByLabel('Show password')).toBeVisible()

    await page.getByLabel('Show password').click()
    await expect(page.getByLabel('Hide password')).toBeVisible()

    const metrics = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(metrics.scrollWidth).toBe(metrics.width)
  })

  test('shows registration success once and cleans the login URL', async ({ page }) => {
    await page.goto('/auth/login?registered=true')

    await expect(page.getByText('Account created')).toBeVisible()
    await expect(page.getByText('Your account is ready. Sign in to continue your PDF workflow.')).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/login$/)
  })

  test('shows OAuth callback errors once while preserving internal redirect', async ({ page }) => {
    await page.goto('/auth/login?error=oauth_callback_failed&redirect=/tools/merge')

    await expect(page.getByText('OAuth session was incomplete')).toBeVisible()
    await expect(page.getByText('PF-AUTH-OAUTH-CALLBACK')).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Ftools%2Fmerge$/)
  })

  test('does not follow an external login redirect after password sign-in', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        json: {
          access_token: 'password-access-token',
          refresh_token: 'password-refresh-token',
          token_type: 'bearer',
        },
      })
    })

    await page.goto('/auth/login?redirect=https://example.com/outside')
    await page.getByLabel('Email').fill('auth@pdf-flow.test')
    await page.getByLabel('Password', { exact: true }).fill('secret123')
    await page.locator('form button[type="submit"]').click()

    await expect(page).toHaveURL(/\/$/)
    expect(page.url()).not.toContain('example.com')
  })

  test('shows a diagnostic registration error from API conflicts', async ({ page }) => {
    await page.route('**/api/v1/auth/register', async (route) => {
      await route.fulfill({
        status: 409,
        json: { detail: 'Email already registered' },
      })
    })

    await page.goto('/auth/register')
    await expect(page.getByLabel('Show password')).toHaveCount(2)
    await page.getByLabel('Full Name').fill('Existing User')
    await page.getByLabel('Email').fill('auth@pdf-flow.test')
    await page.getByLabel('Password', { exact: true }).fill('Secret123!')
    await page.getByLabel('Confirm Password').fill('Secret123!')
    await page.getByLabel(/I agree/).check()
    await page.getByRole('button', { name: 'Sign Up' }).click()

    await expect(page.getByText('Account may already exist')).toBeVisible()
    await expect(page.getByText('PF-AUTH-409-EXISTS')).toBeVisible()
  })
})
