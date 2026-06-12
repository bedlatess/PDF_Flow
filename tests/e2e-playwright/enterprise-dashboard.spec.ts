import { expect, type Page, test } from '@playwright/test'

const enterpriseUser = {
  id: 10,
  email: 'ops@pdf-flow.test',
  full_name: 'PDF-Flow Ops',
  role: 'enterprise',
  is_active: true,
  is_verified: true,
  created_at: '2026-01-10T08:00:00.000Z',
}

const apiKeys = [
  {
    id: 1,
    name: 'Production API',
    key_prefix: 'pdf_live_prod',
    is_active: true,
    rate_limit: -1,
    expires_at: null,
    last_used_at: '2026-06-12T08:30:00.000Z',
    created_at: '2026-05-20T08:00:00.000Z',
  },
  {
    id: 2,
    name: 'Staging Worker',
    key_prefix: 'pdf_test_stage',
    is_active: false,
    rate_limit: 300,
    expires_at: null,
    last_used_at: null,
    created_at: '2026-05-28T08:00:00.000Z',
  },
]

const webhooks = [
  {
    id: 21,
    url: 'https://workflow.example.com/pdf-flow/webhook',
    events: ['job.completed', 'job.failed'],
    is_active: true,
    last_triggered_at: '2026-06-12T08:15:00.000Z',
    created_at: '2026-05-15T08:00:00.000Z',
    updated_at: '2026-06-01T08:00:00.000Z',
    total_deliveries: 124,
    successful_deliveries: 119,
    failed_deliveries: 5,
  },
]

async function mockEnterpriseDashboard(
  page: Page,
  options: {
    failEnterpriseGet?: boolean
    calls?: {
      deleteApiKeys: number
      deleteWebhooks: number
    }
  } = {},
) {
  await page.addInitScript(() => {
    window.localStorage.setItem('pdf-flow-locale', 'en')
    window.localStorage.setItem('access_token', 'enterprise-visual-token')
    window.localStorage.setItem('refresh_token', 'enterprise-visual-refresh')
  })

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: enterpriseUser })
  })

  await page.route('**/api/v1/users/me/stats', async (route) => {
    await route.fulfill({
      json: {
        total_requests: 1842,
        requests_today: 37,
        storage_used: 10485760,
        quota_remaining: -1,
        quota_limit: -1,
        role: 'enterprise',
      },
    })
  })

  await page.route('**/api/v1/admin/public-config', async (route) => {
    await route.fulfill({ json: { settings: {}, feature_flags: {}, content_blocks: {} } })
  })

  await page.route('**/api/v1/enterprise/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()

    if (options.failEnterpriseGet && method === 'GET') {
      await route.fulfill({ status: 503, json: { detail: 'Enterprise service unavailable' } })
      return
    }

    if (method !== 'GET') {
      if (method === 'POST' && url.pathname === '/api/v1/enterprise/api-keys') {
        await route.fulfill({
          json: {
            id: 3,
            name: 'New automation key',
            key_prefix: 'pdf_live_new',
            api_key: 'pdf_live_new_secret_once',
            is_active: true,
            rate_limit: -1,
            expires_at: null,
            last_used_at: null,
            created_at: '2026-06-12T09:00:00.000Z',
          },
        })
        return
      }

      if (method === 'DELETE' && url.pathname === '/api/v1/enterprise/api-keys/1') {
        if (options.calls) options.calls.deleteApiKeys += 1
        await route.fulfill({ json: { ok: true } })
        return
      }

      if (method === 'DELETE' && url.pathname === '/api/v1/enterprise/webhooks/21') {
        if (options.calls) options.calls.deleteWebhooks += 1
        await route.fulfill({ json: { ok: true } })
        return
      }

      await route.fulfill({ json: { ok: true } })
      return
    }

    const responses: Record<string, unknown> = {
      '/api/v1/enterprise/dashboard': {
        total_api_keys: 2,
        active_api_keys: 1,
        total_requests_30d: 28420,
        total_files_processed_30d: 931,
        total_bytes_processed_30d: 834928640,
        current_month_tokens: 642000,
        current_month_cost_cents: 12850,
        total_webhooks: 1,
        active_webhooks: 1,
        rate_limit_hits_today: 3,
        last_request_at: '2026-06-12T08:30:00.000Z',
        last_api_key_created_at: '2026-05-28T08:00:00.000Z',
      },
      '/api/v1/enterprise/api-keys': { keys: apiKeys, total: apiKeys.length },
      '/api/v1/enterprise/usage/stats': {
        total_requests: 28420,
        successful_requests: 27890,
        failed_requests: 530,
        total_files_processed: 931,
        total_bytes_processed: 834928640,
        total_tokens_used: 642000,
        total_cost_cents: 12850,
        endpoint_breakdown: {
          '/api/v1/files/merge': 1042,
          '/api/v1/files/ocr': 312,
          '/api/v1/ai/summarize': 97,
        },
        daily_breakdown: [
          { date: '2026-06-10', requests: 920, tokens: 18000, cost: 420 },
          { date: '2026-06-11', requests: 1180, tokens: 24000, cost: 510 },
          { date: '2026-06-12', requests: 760, tokens: 16000, cost: 330 },
        ],
      },
      '/api/v1/enterprise/webhooks': { webhooks, total: webhooks.length },
      '/api/v1/enterprise/billing/stats': {
        current_period_start: '2026-06-01T00:00:00.000Z',
        current_period_end: '2026-06-30T23:59:59.000Z',
        tokens_used: 642000,
        tokens_included: 1000000,
        tokens_overage: 0,
        subscription_cost: 7900,
        overage_cost: 0,
        total_cost: 7900,
        next_billing_date: '2026-07-01T00:00:00.000Z',
        estimated_next_bill: 7900,
      },
      '/api/v1/enterprise/billing/pricing': {
        free_tier_tokens: 0,
        pro_tier_tokens: 100000,
        enterprise_included_tokens: 1000000,
        overage_price_per_1k_tokens: 5,
      },
    }

    const body = responses[url.pathname]
    if (body === undefined) {
      await route.fulfill({ status: 404, json: { detail: `Unhandled enterprise mock: ${url.pathname}` } })
      return
    }

    await route.fulfill({ json: body })
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

test.describe('Enterprise dashboard visual QA', () => {
  test.beforeEach(async ({ page }) => {
    await mockEnterpriseDashboard(page)
  })

  for (const viewport of [
    { label: 'desktop', width: 1440, height: 1000 },
    { label: 'mobile', width: 390, height: 900 },
  ]) {
    test(`renders enterprise tabs without overflow on ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/enterprise/dashboard')

      await expect(page.getByRole('heading', { name: 'Enterprise Dashboard' })).toBeVisible()
      await expect(page.getByText('Production API')).toBeVisible()
      await expectNoHorizontalOverflow(page)

      const tabs = [
        { label: 'Usage', visibleText: 'Endpoint Breakdown' },
        { label: 'Webhooks', visibleText: 'workflow.example.com/pdf-flow/webhook' },
        { label: 'Billing', visibleText: 'Current Billing Period' },
        { label: 'Documentation', visibleText: 'Async job flow' },
        { label: 'API Keys', visibleText: 'Production API' },
      ]

      for (const tab of tabs) {
        await page.getByRole('button', { name: tab.label }).click()
        await expect(page.getByText(tab.visibleText).first()).toBeVisible()
        await expectNoHorizontalOverflow(page)
      }

      await page.getByRole('button', { name: 'Documentation' }).click()
      await expect(page.getByText('Authorization: Bearer YOUR_API_KEY')).toBeVisible()
      await expect(page.getByText('job.completed')).toBeVisible()
      await expect(page.getByText('Backend verified access')).toBeVisible()
      await expectNoHorizontalOverflow(page)
    })
  }

  test('shows retryable diagnostics when enterprise services are unavailable', async ({ page }) => {
    await mockEnterpriseDashboard(page, { failEnterpriseGet: true })

    await page.goto('/enterprise/dashboard')

    await expect(page.getByText('PF-ENTERPRISE-503-SERVER').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry overview' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry API keys' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Usage' }).click()
    await expect(page.getByRole('button', { name: 'Retry usage' })).toBeVisible()
    await expect(page.getByText('PF-ENTERPRISE-503-SERVER').first()).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Webhooks' }).click()
    await expect(page.getByRole('button', { name: 'Retry webhooks' })).toBeVisible()
    await expect(page.getByText('PF-ENTERPRISE-503-SERVER').first()).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Billing' }).click()
    await expect(page.getByRole('button', { name: 'Retry billing' })).toBeVisible()
    await expect(page.getByText('PF-ENTERPRISE-503-SERVER').first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('requires in-app confirmation before deleting API keys and webhooks', async ({ page }) => {
    const calls = {
      deleteApiKeys: 0,
      deleteWebhooks: 0,
    }
    await mockEnterpriseDashboard(page, { calls })

    await page.goto('/enterprise/dashboard')
    await expect(page.getByText('Production API')).toBeVisible()

    await page.getByRole('button', { name: 'Delete API key Production API' }).click()
    const apiKeyDialog = page.getByRole('dialog', { name: 'Delete API key?' })
    await expect(apiKeyDialog).toBeVisible()
    await expect(page.getByText('This will remove "Production API" from enterprise API access.')).toBeVisible()
    expect(calls.deleteApiKeys).toBe(0)
    await apiKeyDialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(apiKeyDialog).toBeHidden()
    expect(calls.deleteApiKeys).toBe(0)

    await page.getByRole('button', { name: 'Delete API key Production API' }).click()
    await apiKeyDialog.getByRole('button', { name: 'Delete API key', exact: true }).click()
    await expect(apiKeyDialog).toBeHidden()
    expect(calls.deleteApiKeys).toBe(1)

    await page.getByRole('button', { name: 'Webhooks' }).click()
    await expect(page.getByText('workflow.example.com/pdf-flow/webhook')).toBeVisible()
    await page
      .getByRole('button', { name: 'Delete webhook https://workflow.example.com/pdf-flow/webhook' })
      .click()
    const webhookDialog = page.getByRole('dialog', { name: 'Delete webhook?' })
    await expect(webhookDialog).toBeVisible()
    await expect(
      page.getByText(
        'This will stop PDF-Flow events from being delivered to https://workflow.example.com/pdf-flow/webhook.'
      )
    ).toBeVisible()
    expect(calls.deleteWebhooks).toBe(0)
    await webhookDialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(webhookDialog).toBeHidden()
    expect(calls.deleteWebhooks).toBe(0)

    await page
      .getByRole('button', { name: 'Delete webhook https://workflow.example.com/pdf-flow/webhook' })
      .click()
    await webhookDialog.getByRole('button', { name: 'Delete webhook', exact: true }).click()
    await expect(webhookDialog).toBeHidden()
    expect(calls.deleteWebhooks).toBe(1)
  })
})
