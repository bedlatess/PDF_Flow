import { expect, type Page, test } from '@playwright/test'

const profileUser = {
  id: 42,
  email: 'profile@pdf-flow.test',
  full_name: 'Profile User',
  role: 'free',
  is_active: true,
  is_verified: true,
  created_at: '2026-06-12T08:00:00.000Z',
}

async function mockProfileShell(page: Page, options: { statsFails?: boolean; updateFails?: boolean; deleteFails?: boolean } = {}) {
  await page.addInitScript(() => {
    window.localStorage.setItem('pdf-flow-locale', 'en')
    window.localStorage.setItem('access_token', 'profile-access-token')
    window.localStorage.setItem('refresh_token', 'profile-refresh-token')
  })

  await page.route('**/api/v1/admin/public-config', async (route) => {
    await route.fulfill({ json: { settings: {}, feature_flags: {}, content_blocks: {} } })
  })

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: profileUser })
  })

  await page.route('**/api/v1/users/me/stats', async (route) => {
    if (options.statsFails) {
      await route.fulfill({ status: 503, json: { detail: 'Stats service unavailable' } })
      return
    }

    await route.fulfill({
      json: {
        total_requests: 128,
        requests_today: 7,
        storage_used: 0,
        quota_remaining: 13,
        quota_limit: 20,
        role: 'free',
      },
    })
  })

  await page.route('**/api/v1/users/me', async (route) => {
    const method = route.request().method()

    if (method === 'PATCH') {
      if (options.updateFails) {
        await route.fulfill({ status: 422, json: { detail: 'Invalid display name' } })
        return
      }

      const body = route.request().postDataJSON() as { full_name?: string }
      await route.fulfill({ json: { ...profileUser, full_name: body.full_name || profileUser.full_name } })
      return
    }

    if (method === 'DELETE') {
      if (options.deleteFails) {
        await route.fulfill({ status: 500, json: { detail: 'Delete failed' } })
        return
      }

      await route.fulfill({ status: 204, body: '' })
      return
    }

    await route.continue()
  })
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

test.describe('Profile account states', () => {
  test('renders profile and usage without overflow', async ({ page }) => {
    await mockProfileShell(page)
    await page.setViewportSize({ width: 390, height: 900 })

    await page.goto('/auth/profile')
    await expect(page.getByRole('heading', { name: 'My Account' })).toBeVisible()
    await expect(page.getByText('Profile User', { exact: true })).toBeVisible()
    await expect(page.getByText('128')).toBeVisible()
    await expect(page.getByText('13')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('shows a retryable usage failure state', async ({ page }) => {
    await mockProfileShell(page, { statsFails: true })

    await page.goto('/auth/profile')
    await expect(page.getByText('Service is temporarily unavailable')).toBeVisible()
    await expect(page.getByText('PF-AUTH-503-SERVER')).toBeVisible()
  })

  test('shows profile update diagnostics and keeps edit mode available', async ({ page }) => {
    await mockProfileShell(page, { updateFails: true })

    await page.goto('/auth/profile')
    await page.getByRole('button', { name: /Edit Profile/ }).click()
    await page.getByLabel('Full Name').fill('Updated Name')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Please review your details')).toBeVisible()
    await expect(page.getByText('PF-AUTH-422-INPUT')).toBeVisible()
    await expect(page.getByLabel('Full Name')).toBeVisible()
  })

  test('shows delete diagnostics when account deletion fails', async ({ page }) => {
    await mockProfileShell(page, { deleteFails: true })

    await page.goto('/auth/profile')
    await page.getByRole('button', { name: 'Delete Account' }).click()
    const dialog = page.getByRole('dialog', { name: 'Delete this account?' })
    await expect(dialog).toBeVisible()
    await expect(page.getByText('This will remove access for profile@pdf-flow.test.')).toBeVisible()
    await dialog.getByRole('button', { name: 'Delete account', exact: true }).click()

    await expect(page.getByText('Service is temporarily unavailable')).toBeVisible()
    await expect(page.getByText('PF-AUTH-500-SERVER')).toBeVisible()
  })

  test('does not delete the account when confirmation is cancelled', async ({ page }) => {
    let deleteRequests = 0
    await mockProfileShell(page)
    await page.route('**/api/v1/users/me', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteRequests += 1
      }
      await route.continue()
    })

    await page.goto('/auth/profile')
    await page.getByRole('button', { name: 'Delete Account' }).click()
    await expect(page.getByRole('dialog', { name: 'Delete this account?' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('dialog', { name: 'Delete this account?' })).toBeHidden()
    expect(deleteRequests).toBe(0)
  })
})
