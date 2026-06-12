import { expect, type Page, test } from '@playwright/test'

const proUser = {
  id: 12,
  email: 'pro@pdf-flow.test',
  full_name: 'PDF-Flow Pro',
  role: 'pro',
  is_active: true,
  is_verified: true,
  created_at: '2026-06-01T08:00:00.000Z',
}

async function mockPaymentShell(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('pdf-flow-locale', 'en')
    window.localStorage.setItem('access_token', 'payment-visual-token')
    window.localStorage.setItem('refresh_token', 'payment-visual-refresh')
  })

  await page.route('**/api/v1/admin/public-config', async (route) => {
    await route.fulfill({
      json: {
        settings: {
          support_email: {
            value: 'support@pdf-flow.test',
            value_type: 'string',
            group: 'support',
            label: 'Support email',
          },
        },
        feature_flags: {},
        content_blocks: {},
      },
    })
  })

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: proUser })
  })

  await page.route('**/api/v1/users/me/stats', async (route) => {
    await route.fulfill({
      json: {
        total_requests: 245,
        requests_today: 4,
        storage_used: 0,
        quota_remaining: -1,
        quota_limit: -1,
        role: 'pro',
      },
    })
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

test.describe('Payment result pages', () => {
  test.beforeEach(async ({ page }) => {
    await mockPaymentShell(page)
  })

  for (const viewport of [
    { label: 'desktop', width: 1440, height: 1000 },
    { label: 'mobile', width: 390, height: 900 },
  ]) {
    test(`renders success and cancel states without overflow on ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      await page.goto('/payment/success?session_id=cs_test_pdf_flow_1234567890')
      await expect(page.getByRole('heading', { name: 'Payment Successful!' })).toBeVisible()
      await expect(page.getByText('Checkout complete')).toBeVisible()
      await expect(page.getByText('Reference', { exact: true })).toBeVisible()
      await expect(page.getByText('...34567890')).toBeVisible()
      await expect(page.getByText('support@pdf-flow.test')).toBeVisible()
      await expectNoHorizontalOverflow(page)

      await page.goto('/payment/cancel')
      await expect(page.getByRole('heading', { name: 'Payment Cancelled' })).toBeVisible()
      await expect(page.getByText('Checkout not completed')).toBeVisible()
      await expect(page.getByText('Free / unchanged')).toBeVisible()
      await expect(page.getByRole('button', { name: /Try Again/ })).toBeVisible()
      await expectNoHorizontalOverflow(page)
    })
  }
})
