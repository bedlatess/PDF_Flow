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

test.describe('History page workspace states', () => {
  test('renders local history and clears it through an in-page confirmation', async ({ page }) => {
    await mockPublicConfig(page)
    await page.addInitScript(() => {
      window.localStorage.setItem('pdf-flow-locale', 'en')
      window.localStorage.setItem('pdf-flow-history', JSON.stringify([
        {
          id: 'history-1',
          type: 'merge',
          fileName: 'contract-pack.pdf',
          timestamp: Date.now(),
          fileSize: 1024,
          resultSize: 900,
        },
      ]))
    })

    let nativeDialogOpened = false
    page.on('dialog', async (dialog) => {
      nativeDialogOpened = true
      await dialog.dismiss()
    })

    await page.goto('/history')

    await expect(page.getByRole('heading', { name: 'Processing History' })).toBeVisible()
    await expect(page.getByText('contract-pack.pdf')).toBeVisible()
    await expect(page.getByText('Merge PDF · Just now')).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Clear all history' }).click()
    await expect(page.getByText('Clear all local history?')).toBeVisible()
    expect(nativeDialogOpened).toBe(false)

    await page.getByRole('button', { name: 'Keep history' }).click()
    await expect(page.getByText('contract-pack.pdf')).toBeVisible()

    await page.getByRole('button', { name: 'Clear all history' }).click()
    await page.getByRole('button', { name: 'Clear history' }).click()
    await expect(page.getByText('No processing history yet')).toBeVisible()
    await expect(page.getByText('contract-pack.pdf')).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
  })

  test('keeps the history workspace usable on mobile', async ({ page }) => {
    await mockPublicConfig(page)
    await page.setViewportSize({ width: 390, height: 900 })
    await page.addInitScript(() => {
      window.localStorage.setItem('pdf-flow-locale', 'en')
      window.localStorage.setItem('pdf-flow-history', JSON.stringify([
        {
          id: 'history-mobile',
          type: 'compress',
          fileName: 'quarterly-report-with-a-long-name.pdf',
          timestamp: Date.now(),
          fileSize: 4096,
          resultSize: 2048,
        },
      ]))
    })

    await page.goto('/history')

    await expect(page.getByRole('heading', { name: 'Processing History' })).toBeVisible()
    await expect(page.getByText('quarterly-report-with-a-long-name.pdf')).toBeVisible()
    await page.getByRole('button', { name: 'Clear all history' }).click()
    await expect(page.getByText('Clear all local history?')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})
