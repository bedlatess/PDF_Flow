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

async function mockPublicConfig(page: Page) {
  await page.route('**/api/v1/admin/public-config', async (route) => {
    await route.fulfill({
      json: {
        settings: {},
        feature_flags: {},
        content_blocks: {},
      },
    })
  })
}

test.describe('Legal pages workspace layout', () => {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 950 },
    { name: 'mobile', width: 390, height: 900 },
  ]) {
    test(`renders privacy and terms without overflow on ${viewport.name}`, async ({ page }) => {
      await mockPublicConfig(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.addInitScript(() => {
        window.localStorage.setItem('pdf-flow-locale', 'en')
      })

      await page.goto('/privacy')
      await expect(page.getByRole('heading', { name: 'How we protect your files and account information' })).toBeVisible()
      await expect(page.getByText('Short version')).toBeVisible()
      await expectNoHorizontalOverflow(page)

      await page.goto('/terms')
      await expect(page.getByRole('heading', { name: 'Please understand these rules before using PDF-Flow' })).toBeVisible()
      await expect(page.getByText('Core principle')).toBeVisible()
      await expectNoHorizontalOverflow(page)
    })
  }
})
