import { expect, type Page, test } from '@playwright/test'

const shellUser = {
  id: 77,
  email: 'shell@pdf-flow.test',
  full_name: 'Shell User',
  role: 'free',
  is_active: true,
  is_verified: true,
  created_at: '2026-06-12T08:00:00.000Z',
}

const defaultPublicConfig = {
  settings: {},
  feature_flags: {},
  content_blocks: {},
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    docClientWidth: document.documentElement.clientWidth,
  }))

  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.bodyClientWidth + 2)
  expect(metrics.docScrollWidth).toBeLessThanOrEqual(metrics.docClientWidth + 2)
}

async function mockPublicShell(
  page: Page,
  options: {
    authenticated?: boolean
    configFails?: boolean
    maintenance?: boolean
    announcement?: string
  } = {},
) {
  await page.addInitScript((authenticated) => {
    window.localStorage.setItem('pdf-flow-locale', 'en')
    if (authenticated) {
      window.localStorage.setItem('access_token', 'shell-access-token')
      window.localStorage.setItem('refresh_token', 'shell-refresh-token')
    } else {
      window.localStorage.removeItem('access_token')
      window.localStorage.removeItem('refresh_token')
    }
  }, Boolean(options.authenticated))

  await page.route('**/api/v1/admin/public-config', async (route) => {
    if (options.configFails) {
      await route.fulfill({ status: 503, json: { detail: 'Public config unavailable' } })
      return
    }

    await route.fulfill({
      json: {
        ...defaultPublicConfig,
        settings: {
          ...(options.announcement
            ? {
                global_announcement: {
                  value: options.announcement,
                  value_type: 'string',
                  group: 'site',
                  label: 'Announcement',
                },
              }
            : {}),
          ...(options.maintenance
            ? {
                maintenance_mode: {
                  value: 'true',
                  value_type: 'boolean',
                  group: 'site',
                  label: 'Maintenance mode',
                },
                global_announcement: {
                  value: 'Planned maintenance window',
                  value_type: 'string',
                  group: 'site',
                  label: 'Announcement',
                },
              }
            : {}),
        },
      },
    })
  })

  await page.route('**/api/v1/auth/me', async (route) => {
    const authHeader = route.request().headers().authorization || ''
    if (!options.authenticated || !authHeader.includes('shell-access-token')) {
      await route.fulfill({ status: 401, json: { detail: 'Not authenticated' } })
      return
    }

    await route.fulfill({ json: shellUser })
  })

  await page.route('**/api/v1/users/me/stats', async (route) => {
    await route.fulfill({
      json: {
        total_requests: 3,
        requests_today: 1,
        storage_used: 0,
        quota_remaining: 19,
        quota_limit: 20,
        role: 'free',
      },
    })
  })

  await page.route('**/api/v1/auth/logout', async (route) => {
    await route.fulfill({ json: { ok: true } })
  })
}

test.describe('Public shell states', () => {
  test('shows retryable public-config diagnostics while keeping the public app usable', async ({ page }) => {
    await mockPublicShell(page, { configFails: true })

    await page.goto('/')

    await expect(page.getByText('Site settings are using defaults')).toBeVisible()
    await expect(page.getByText('PF-GENERAL-503-SERVER')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry settings' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    await expect(page.locator('h1')).toContainText(/PDF/i)
    await expectNoHorizontalOverflow(page)
  })

  test('blocks public routes during maintenance while allowing auth routes through', async ({ page }) => {
    await mockPublicShell(page, { maintenance: true })

    await page.goto('/features')

    await expect(page.getByText('Site maintenance in progress')).toBeVisible()
    await expect(page.getByRole('main').getByText('Planned maintenance window')).toBeVisible()
    await expect(page.locator('h1')).not.toContainText('Features')
    await expect(page.getByRole('button', { name: 'Send feedback' })).toHaveCount(0)

    await page.goto('/auth/login')
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
  })

  test('renders authenticated header menu and mobile navigation without overflow', async ({ page }) => {
    await mockPublicShell(page, { authenticated: true, announcement: 'Workspace notice' })
    await page.setViewportSize({ width: 390, height: 900 })

    await page.goto('/')
    await expect(page.getByText('Workspace notice')).toBeVisible()

    const menuButton = page.getByRole('button', { name: 'Open menu' })
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    await menuButton.click()
    await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('button', { name: 'My Account' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Processing History' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
    await expectNoHorizontalOverflow(page)
  })

  test('keeps shell navigation keyboard and account-menu semantics accessible', async ({ page }) => {
    await mockPublicShell(page, { authenticated: true })

    await page.goto('/features')

    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: 'Skip to main content' })
    await expect(skipLink).toBeFocused()
    await skipLink.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()

    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()

    const accountButton = page.getByRole('button', { name: 'My Account' })
    await expect(accountButton).toHaveAttribute('aria-expanded', 'false')
    await accountButton.click()
    await expect(accountButton).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('menu')).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /My Account/ })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(accountButton).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
  })
})
