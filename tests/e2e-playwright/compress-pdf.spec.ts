import { expect, test, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { waitForPageReady, uploadFile } from '../helpers/test-utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function mockPublicApp(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('pdf-flow-locale', 'en')
    window.localStorage.removeItem('access_token')
    window.localStorage.removeItem('refresh_token')
  })

  await page.route('**/api/v1/admin/public-config', async (route) => {
    await route.fulfill({ json: { settings: {}, feature_flags: {}, content_blocks: {} } })
  })

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ status: 401, json: { detail: 'Not authenticated' } })
  })
}

async function openCompressPage(page: Page) {
  await mockPublicApp(page)
  await page.goto('/tools/compress')
  await waitForPageReady(page)
}

async function uploadSamplePdf(page: Page, fileName = 'sample1.pdf') {
  await uploadFile(page, path.join(__dirname, '../fixtures', fileName))
}

test.describe('Compress PDF tool', () => {
  test.beforeEach(async ({ page }) => {
    await openCompressPage(page)
  })

  test('opens the current tool shell with the upload drop zone', async ({ page }) => {
    await expect(page).toHaveURL(/\/tools\/compress/)
    await expect(page.getByRole('heading', { name: 'Compress PDF', level: 1 })).toBeVisible()
    await expect(page.locator('[data-testid="drag-drop-zone"]')).toBeVisible()
    await expect(page.locator('main main')).toHaveCount(0)
  })

  test('shows compression setup after a PDF is uploaded', async ({ page }) => {
    await uploadSamplePdf(page)

    await expect(page.locator('[data-testid="file-preview"]')).toContainText('sample1.pdf')
    await expect(page.getByRole('heading', { name: 'Choose a compression level' })).toBeVisible()
    await expect(page.getByText('Local processing')).toBeVisible()

    for (const option of ['High quality', 'Balanced', 'Size first']) {
      await expect(page.getByRole('button', { name: new RegExp(option) })).toBeVisible()
    }
  })

  test('allows selecting a different compression level', async ({ page }) => {
    await uploadSamplePdf(page)

    const sizeFirst = page.getByRole('button', { name: /Size first/ })
    await expect(sizeFirst).toBeVisible()
    await sizeFirst.click()

    await expect(sizeFirst).toHaveClass(/border-primary/)
    await expect(page.getByText('Reference compression')).toBeVisible()
    await expect(page.getByText('Reference size')).toBeVisible()
  })

  test('keeps the compress action available with the estimate panel', async ({ page }) => {
    await uploadSamplePdf(page, 'large.pdf')

    await expect(page.getByRole('heading', { name: 'Review before exporting' })).toBeVisible()
    await expect(page.getByText('Original size').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Compress PDF' })).toBeEnabled()
  })
})
