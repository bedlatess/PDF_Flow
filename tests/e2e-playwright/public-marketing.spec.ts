import { expect, type Page, test } from '@playwright/test'

async function mockPublicShell(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('pdf-flow-locale', 'en')
  })

  await page.route('**/api/v1/admin/public-config', async (route) => {
    await route.fulfill({ json: { settings: {}, feature_flags: {}, content_blocks: {} } })
  })

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ status: 401, json: { detail: 'Not authenticated' } })
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

test.describe('Public marketing workspace pages', () => {
  test.beforeEach(async ({ page }) => {
    await mockPublicShell(page)
  })

  test('keeps the home tool launcher useful on desktop and mobile', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /Everyday PDF tools/ })).toBeVisible()
    await expect(page.locator('[data-testid="tool-card"]')).toHaveCount(23)

    await page.locator('input[type="search"]').fill('ocr')
    await expect(page.getByRole('heading', { name: 'OCR Text Recognition' })).toBeVisible()

    await expectNoHorizontalOverflow(page)

    await page.setViewportSize({ width: 390, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Everyday PDF tools/ })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('renders features and pricing in the workspace visual system', async ({ page }) => {
    for (const route of ['/features', '/pricing']) {
      await page.goto(route)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('main main')).toHaveCount(0)
      await expectNoHorizontalOverflow(page)

      await page.setViewportSize({ width: 390, height: 900 })
      await page.goto(route)
      await expect(page.locator('h1')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await page.setViewportSize({ width: 1440, height: 950 })
    }
  })
})
