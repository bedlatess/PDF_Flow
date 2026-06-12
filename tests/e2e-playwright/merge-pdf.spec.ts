import { expect, test, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { waitForPageReady } from '../helpers/test-utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sampleOne = path.join(__dirname, '../fixtures/sample1.pdf')
const sampleTwo = path.join(__dirname, '../fixtures/sample2.pdf')

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

async function openMergePage(page: Page) {
  await mockPublicApp(page)
  await page.goto('/tools/merge')
  await waitForPageReady(page)
}

async function uploadPdfs(page: Page, files: string[]) {
  await page.locator('[data-testid="drag-drop-zone"]').first().waitFor({ state: 'visible' })
  await page.locator('input[type="file"]').first().setInputFiles(files)
  await expect(page.locator('[data-testid="file-preview"]')).toHaveCount(files.length, { timeout: 20000 })
}

test.describe('Merge PDF tool', () => {
  test.beforeEach(async ({ page }) => {
    await openMergePage(page)
  })

  test('opens the current tool shell with the upload drop zone', async ({ page }) => {
    await expect(page).toHaveURL(/\/tools\/merge/)
    await expect(page.getByRole('heading', { name: 'Merge PDF', level: 1 })).toBeVisible()
    await expect(page.locator('[data-testid="drag-drop-zone"]').first()).toBeVisible()
    await expect(page.locator('main main')).toHaveCount(0)
  })

  test('shows the merge queue after PDFs are uploaded', async ({ page }) => {
    await uploadPdfs(page, [sampleOne, sampleTwo])

    await expect(page.getByRole('heading', { name: 'Selected files' })).toBeVisible()
    await expect(page.locator('[data-testid="file-preview"]').nth(0)).toContainText('sample1.pdf')
    await expect(page.locator('[data-testid="file-preview"]').nth(1)).toContainText('sample2.pdf')
    await expect(page.getByText(/total pages/)).toBeVisible()
    await expect(page.getByText('Add more files')).toBeVisible()
  })

  test('requires at least two files before merging', async ({ page }) => {
    await uploadPdfs(page, [sampleOne])

    await expect(page.getByRole('button', { name: 'Merge PDF' })).toBeDisabled()
    await expect(page.getByText('Files').first()).toBeVisible()
    await expect(page.getByText('Pages').first()).toBeVisible()
  })

  test('enables merge when two PDFs are queued', async ({ page }) => {
    await uploadPdfs(page, [sampleOne, sampleTwo])

    await expect(page.getByRole('heading', { name: 'Confirm the order, then merge' })).toBeVisible()
    await expect(page.getByText('Local processing')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Merge PDF' })).toBeEnabled()
  })

  test('removes queued files and returns to upload state when the list is empty', async ({ page }) => {
    await uploadPdfs(page, [sampleOne])

    await page.getByRole('button', { name: 'Remove sample1.pdf' }).click()

    await expect(page.locator('[data-testid="file-preview"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="drag-drop-zone"]').first()).toBeVisible()
  })

  test('runs a local merge and shows the success dialog', async ({ page }) => {
    await uploadPdfs(page, [sampleOne, sampleTwo])

    await page.getByRole('button', { name: 'Merge PDF' }).click()

    await expect(page.getByRole('dialog', { name: 'Merge complete' })).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('dialog')).toContainText('Successfully merged 2 PDF files')
    await expect(page.getByRole('button', { name: 'Download' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Merge more files' })).toBeVisible()
  })
})
