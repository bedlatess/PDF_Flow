import { expect, type Page, test } from '@playwright/test'

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

async function mockFeedbackShell(page: Page, options: { feedbackFails?: boolean } = {}) {
  await page.addInitScript(() => {
    window.localStorage.setItem('pdf-flow-locale', 'en')
    window.localStorage.removeItem('access_token')
    window.localStorage.removeItem('refresh_token')
  })

  await page.route('**/api/v1/admin/public-config', async (route) => {
    await route.fulfill({
      json: {
        settings: {},
        feature_flags: {},
        content_blocks: {},
      },
    })
  })

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ status: 401, json: { detail: 'Not authenticated' } })
  })

  await page.route('**/api/v1/feedback', async (route) => {
    if (options.feedbackFails) {
      await route.fulfill({ status: 503, json: { detail: 'Feedback offline' } })
      return
    }

    const body = route.request().postDataJSON()
    expect(body.title).toBe('Merge button looked stuck')
    expect(body.message).toContain('I clicked merge')
    expect(body.diagnostic_code).toMatch(/^PDF-/)
    expect(body.diagnostics.path).toBe('/')
    await route.fulfill({
      json: {
        id: 928,
        status: 'new',
        diagnostic_code: body.diagnostic_code,
        created_at: '2026-06-12T08:00:00.000Z',
      },
    })
  })
}

test.describe('Feedback widget support states', () => {
  test('submits feedback and exposes a copyable support reference', async ({ page }) => {
    await mockFeedbackShell(page)

    await page.goto('/')
    await page.getByRole('button', { name: 'Send feedback' }).click()

    await page.getByLabel('Short title').fill('Merge button looked stuck')
    await page.getByLabel('Details').fill('I clicked merge and the button looked stuck for several seconds.')
    await page.getByLabel('Email, optional').fill('reader@pdf-flow.test')
    await page.getByRole('button', { name: 'Submit feedback' }).click()

    await expect(page.getByRole('heading', { name: 'Feedback submitted' })).toBeVisible()
    await expect(page.getByText('Reference #928')).toBeVisible()
    await expect(page.getByText(/Diagnostic code PDF-/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy reference' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('keeps diagnostic context visible when the feedback service fails', async ({ page }) => {
    await mockFeedbackShell(page, { feedbackFails: true })

    await page.goto('/')
    await page.getByRole('button', { name: 'Send feedback' }).click()

    await page.getByLabel('Short title').fill('Merge button looked stuck')
    await page.getByLabel('Details').fill('I clicked merge and the button looked stuck for several seconds.')
    await page.getByRole('button', { name: 'Submit feedback' }).click()

    await expect(page.getByText('Service is temporarily unavailable')).toBeVisible()
    await expect(page.getByText('The server could not finish the request just now. Please retry shortly.')).toBeVisible()
    await expect(page.getByText(/Code: PDF-/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit feedback' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('validates required fields and stays usable on mobile', async ({ page }) => {
    await mockFeedbackShell(page)
    await page.setViewportSize({ width: 390, height: 900 })

    await page.goto('/features')
    await page.getByRole('button', { name: 'Send feedback' }).click()
    await page.getByRole('button', { name: 'Submit feedback' }).click()

    await expect(page.getByText('Title and details are required')).toBeVisible()
    await expect(page.getByText(/Page: \/features/)).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})
