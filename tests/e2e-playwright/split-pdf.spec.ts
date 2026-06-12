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

async function openSplitPage(page: Page) {
  await mockPublicApp(page)
  await page.goto('/tools/split')
  await waitForPageReady(page)
}

async function uploadMultiPagePdf(page: Page) {
  await uploadFile(page, path.join(__dirname, '../fixtures/multi-page.pdf'))
}

test.describe('Split PDF tool', () => {
  test.beforeEach(async ({ page }) => {
    await openSplitPage(page)
  })

  test('opens the current tool shell with the upload drop zone', async ({ page }) => {
    await expect(page).toHaveURL(/\/tools\/split/)
    await expect(page.getByRole('heading', { name: 'Split PDF', level: 1 })).toBeVisible()
    await expect(page.locator('[data-testid="drag-drop-zone"]')).toBeVisible()
    await expect(page.locator('main main')).toHaveCount(0)
  })

  test('shows page range controls after a PDF is uploaded', async ({ page }) => {
    await uploadMultiPagePdf(page)

    await expect(page.locator('[data-testid="file-preview"]')).toContainText('multi-page.pdf')
    await expect(page.getByRole('heading', { name: 'Choose the pages to export' })).toBeVisible()
    await expect(page.getByText(/pages available/)).toBeVisible()
    await expect(page.getByPlaceholder('Example: 1-3,5,7-9')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Visual selector' })).toBeVisible()
  })

  test('accepts a typed page range and keeps the extract action available', async ({ page }) => {
    await uploadMultiPagePdf(page)

    const rangeInput = page.getByPlaceholder('Example: 1-3,5,7-9')
    await rangeInput.fill('1-3,5')

    await expect(rangeInput).toHaveValue('1-3,5')
    await expect(page.getByRole('heading', { name: 'Confirm the range, then generate a new file' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Extract pages' })).toBeEnabled()
  })

  test('opens the visual selector dialog from the split setup', async ({ page }) => {
    await uploadMultiPagePdf(page)

    await page.getByRole('button', { name: 'Visual selector' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText('Choose pages to extract')
  })
})
