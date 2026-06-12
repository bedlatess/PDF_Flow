import { expect, type Page, test } from '@playwright/test'

const oauthUser = {
  id: 18,
  email: 'oauth@pdf-flow.test',
  full_name: 'OAuth User',
  role: 'free',
  is_active: true,
  is_verified: true,
  created_at: '2026-06-12T08:00:00.000Z',
}

async function mockOAuthShell(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('pdf-flow-locale', 'en')
  })

  await page.route('**/api/v1/admin/public-config', async (route) => {
    await route.fulfill({ json: { settings: {}, feature_flags: {}, content_blocks: {} } })
  })

  await page.route('**/api/v1/auth/me', async (route) => {
    const authHeader = route.request().headers().authorization || ''
    if (!authHeader.includes('oauth-access-token')) {
      await route.fulfill({ status: 401, json: { detail: 'Not authenticated' } })
      return
    }

    await route.fulfill({ json: oauthUser })
  })

  await page.route('**/api/v1/users/me/stats', async (route) => {
    await route.fulfill({
      json: {
        total_requests: 9,
        requests_today: 1,
        storage_used: 0,
        quota_remaining: 19,
        quota_limit: 20,
        role: 'free',
      },
    })
  })
}

test.describe('OAuth callback route state', () => {
  test.beforeEach(async ({ page }) => {
    await mockOAuthShell(page)
  })

  test('stores returned tokens, clears callback URL, and redirects only to internal paths', async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem('oauth_redirect', '/tools/merge')
    })

    await page.goto('/auth/oauth-callback?access_token=oauth-access-token&refresh_token=oauth-refresh-token&token_type=bearer')

    await expect(page).toHaveURL(/\/tools\/merge$/)
    expect(page.url()).not.toContain('access_token')
    expect(page.url()).not.toContain('refresh_token')

    const stored = await page.evaluate(() => ({
      accessToken: window.localStorage.getItem('access_token'),
      refreshToken: window.localStorage.getItem('refresh_token'),
      redirect: window.sessionStorage.getItem('oauth_redirect'),
    }))

    expect(stored.accessToken).toBe('oauth-access-token')
    expect(stored.refreshToken).toBe('oauth-refresh-token')
    expect(stored.redirect).toBeNull()
  })

  test('stays on the callback state with actions when tokens are missing', async ({ page }) => {
    await page.goto('/auth/oauth-callback')

    await expect(page.getByRole('heading', { name: 'We could not finish sign-in' })).toBeVisible()
    await expect(page.getByText('OAuth sign-in')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeVisible()

    const stored = await page.evaluate(() => ({
      accessToken: window.localStorage.getItem('access_token'),
      refreshToken: window.localStorage.getItem('refresh_token'),
    }))

    expect(stored.accessToken).toBeNull()
    expect(stored.refreshToken).toBeNull()
  })

  test('does not preserve external login redirects for OAuth', async ({ page }) => {
    await page.route('**/api/v1/auth/oauth/google', async (route) => {
      await route.fulfill({ status: 204, body: '' })
    })

    await page.goto('/auth/login?redirect=https://example.com/outside')
    await page.getByRole('button', { name: 'Google' }).click()

    const redirect = await page.evaluate(() => window.sessionStorage.getItem('oauth_redirect'))
    expect(redirect).toBeNull()
  })
})
