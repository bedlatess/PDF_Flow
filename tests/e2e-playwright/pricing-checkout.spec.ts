import { expect, type Page, test } from '@playwright/test'

const checkoutUser = {
  id: 48,
  email: 'checkout@pdf-flow.test',
  full_name: 'Checkout User',
  role: 'free',
  is_active: true,
  is_verified: true,
  created_at: '2026-06-12T08:00:00.000Z',
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

async function mockPricingShell(
  page: Page,
  options: {
    authenticated?: boolean
    checkoutFails?: boolean
    providerListFails?: boolean
  } = {},
) {
  await page.addInitScript((authenticated) => {
    window.localStorage.setItem('pdf-flow-locale', 'en')
    if (authenticated) {
      window.localStorage.setItem('access_token', 'checkout-access-token')
      window.localStorage.setItem('refresh_token', 'checkout-refresh-token')
    } else {
      window.localStorage.removeItem('access_token')
      window.localStorage.removeItem('refresh_token')
    }
  }, Boolean(options.authenticated))

  await page.route('**/api/v1/admin/public-config', async (route) => {
    await route.fulfill({ json: { settings: {}, feature_flags: {}, content_blocks: {} } })
  })

  await page.route('**/api/v1/auth/me', async (route) => {
    const authHeader = route.request().headers().authorization || ''
    if (!options.authenticated || !authHeader.includes('checkout-access-token')) {
      await route.fulfill({ status: 401, json: { detail: 'Not authenticated' } })
      return
    }

    await route.fulfill({ json: checkoutUser })
  })

  await page.route('**/api/v1/users/me/stats', async (route) => {
    await route.fulfill({
      json: {
        total_requests: 8,
        requests_today: 2,
        storage_used: 0,
        quota_remaining: 18,
        quota_limit: 20,
        role: 'free',
      },
    })
  })

  await page.route('**/api/v1/payment/providers', async (route) => {
    if (options.providerListFails) {
      await route.fulfill({ status: 503, json: { detail: 'Payment providers unavailable' } })
      return
    }

    await route.fulfill({
      json: {
        providers: [
          {
            key: 'stripe',
            enabled: true,
            display_name: 'Stripe',
            settlement: 'subscription',
            supports_subscription: true,
            supports_one_time: true,
          },
          {
            key: 'paypal',
            enabled: true,
            display_name: 'PayPal',
            settlement: 'one_time_entitlement',
            supports_subscription: false,
            supports_one_time: true,
          },
          {
            key: 'wechat',
            enabled: true,
            display_name: 'WeChat Pay',
            settlement: 'one_time_entitlement',
            supports_subscription: false,
            supports_one_time: true,
          },
          {
            key: 'okpay',
            enabled: false,
            display_name: 'OKPay',
            settlement: 'one_time_entitlement',
            supports_subscription: false,
            supports_one_time: true,
          },
        ],
      },
    })
  })

  await page.route('**/api/v1/payment/create-checkout-session', async (route) => {
    if (options.checkoutFails) {
      await route.fulfill({ status: 503, json: { detail: 'Stripe unavailable' } })
      return
    }

    const body = route.request().postDataJSON()
    expect(body.plan).toBe('monthly')
    expect(body.success_url).toContain('/payment/success')
    expect(body.cancel_url).toContain('/payment/cancel')
    expect(body.provider).toBeTruthy()

    if (body.provider === 'wechat') {
      await route.fulfill({
        json: {
          checkout_url: 'weixin://wxpay/bizpayurl?pr=checkout',
          qr_code_url: 'weixin://wxpay/bizpayurl?pr=checkout',
          session_id: 'pf_20260612_wechat',
          provider: 'wechat',
          order_id: '42',
          merchant_order_id: 'pf_20260612_wechat',
          expires_at: '2026-06-12T10:30:00.000Z',
        },
      })
      return
    }

    await route.fulfill({
      json: {
        checkout_url: 'http://localhost:4173/payment/success?session_id=cs_test_pdf_flow',
        session_id: 'cs_test_pdf_flow',
        provider: body.provider,
        order_id: '41',
        merchant_order_id: 'pf_20260612_redirect',
      },
    })
  })
}

test.describe('Pricing checkout edge states', () => {
  test('redirects guests to login with pricing return path', async ({ page }) => {
    await mockPricingShell(page)

    await page.goto('/pricing')
    await page.getByRole('button', { name: 'Upgrade to Pro' }).click()

    await expect(page).toHaveURL(/\/auth\/login\?redirect=\/pricing/)
  })

  test('still lets guests go to login when payment methods are unavailable', async ({ page }) => {
    await mockPricingShell(page, { providerListFails: true })

    await page.goto('/pricing')
    await page.getByRole('button', { name: 'Upgrade to Pro' }).click()

    await expect(page).toHaveURL(/\/auth\/login\?redirect=\/pricing/)
  })

  test('shows retryable diagnostics when checkout cannot be created', async ({ page }) => {
    await mockPricingShell(page, { authenticated: true, checkoutFails: true })

    await page.goto('/pricing')
    await page.getByRole('button', { name: 'Upgrade to Pro' }).click()

    await expect(page.getByText('Service is temporarily unavailable')).toBeVisible()
    await expect(page.getByText('PF-GENERAL-503-SERVER')).toBeVisible()
    await expect(page.getByText('Retry once. If it repeats, submit feedback with this diagnostic code.')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('shows retryable diagnostics when payment methods cannot be loaded', async ({ page }) => {
    await mockPricingShell(page, { authenticated: true, providerListFails: true })

    await page.goto('/pricing')

    await expect(page.getByText('Payment methods are unavailable')).toBeVisible()
    await expect(page.getByText('PF-GENERAL-503-SERVER')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Upgrade to Pro' })).toBeDisabled()
    await expectNoHorizontalOverflow(page)
  })

  test('navigates to the returned checkout URL when session creation succeeds', async ({ page }) => {
    await mockPricingShell(page, { authenticated: true })

    await page.goto('/pricing')
    await expect(page.getByRole('radio', { name: /Stripe/ })).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('button', { name: 'Upgrade to Pro' }).click()

    await expect(page).toHaveURL(/\/payment\/success\?session_id=cs_test_pdf_flow/)
  })

  test('renders QR-style provider checkout without trusting frontend completion', async ({ page }) => {
    await mockPricingShell(page, { authenticated: true })

    await page.goto('/pricing')
    await page.getByRole('radio', { name: /WeChat Pay/ }).click()
    await page.getByRole('button', { name: 'Upgrade to Pro' }).click()

    await expect(page.getByText('Payment code ready')).toBeVisible()
    await expect(page.getByText('weixin://wxpay/bizpayurl?pr=checkout')).toBeVisible()
    await expect(page).toHaveURL(/\/pricing/)
    await expectNoHorizontalOverflow(page)
  })
})
