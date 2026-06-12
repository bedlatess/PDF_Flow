import { expect, test, type Page } from '@playwright/test'
import { writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { waitForPageReady, uploadFile } from '../helpers/test-utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const samplePdf = path.join(__dirname, '../fixtures/sample1.pdf')
const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='

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

async function openTool(page: Page, route: string) {
  await mockPublicApp(page)
  await page.goto(route)
  await waitForPageReady(page)
}

test.describe('Advanced local PDF workflows', () => {
  test('crops a PDF and exposes the cropped download action', async ({ page }) => {
    await openTool(page, '/tools/crop')

    await expect(page.getByRole('heading', { name: 'Crop PDF', level: 1 })).toBeVisible()
    await uploadFile(page, samplePdf)

    await expect(page.locator('[data-testid="file-preview"]')).toContainText('sample1.pdf')
    await expect(page.getByRole('heading', { name: 'Set crop margins' })).toBeVisible()
    await expect(page.getByText('Pages: 2')).toBeVisible()

    await page.getByRole('button', { name: 'Scan border' }).click()
    await page.getByRole('button', { name: 'Create cropped PDF' }).click()

    await expect(page.getByRole('heading', { name: 'Crop complete' })).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('button', { name: 'Download cropped PDF' }).first()).toBeVisible()
  })

  test('adds page numbers and shows the numbered PDF success dialog', async ({ page }) => {
    await openTool(page, '/tools/page-numbers')

    await expect(page.getByRole('heading', { name: 'Add PDF Page Numbers', level: 1 })).toBeVisible()
    await uploadFile(page, samplePdf)

    await expect(page.getByRole('heading', { name: 'Set the format and position' })).toBeVisible()
    await page.getByLabel('Start number').fill('5')
    await page.getByLabel('Prefix').fill('Page ')
    await page.getByLabel('Show total pages').check()
    await page.getByRole('button', { name: 'Top right' }).click()

    await page.getByRole('button', { name: 'Add page numbers' }).click()

    await expect(page.getByRole('dialog', { name: 'Page numbers added' })).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('button', { name: 'Download result' })).toBeVisible()
  })

  test('applies a text watermark and shows the watermarked PDF success dialog', async ({ page }) => {
    await openTool(page, '/tools/watermark')

    await expect(page.getByRole('heading', { name: 'Watermark PDF', level: 1 })).toBeVisible()
    await uploadFile(page, samplePdf)

    await expect(page.getByRole('heading', { name: 'Adjust the message and style' })).toBeVisible()
    await page.getByLabel('Watermark text').fill('REVIEWED')
    await page.getByRole('button', { name: 'Bottom' }).click()

    await page.getByRole('button', { name: 'Apply watermark' }).click()

    await expect(page.getByRole('dialog', { name: 'Watermark applied' })).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('button', { name: 'Download' })).toBeVisible()
  })

  test('adds a visual signature image and exposes the signed PDF download action', async ({ page }, testInfo) => {
    const signaturePath = testInfo.outputPath('signature.png')
    await writeFile(signaturePath, Buffer.from(PNG_1X1_BASE64, 'base64'))
    await openTool(page, '/tools/sign')

    await expect(page.getByRole('heading', { name: 'Sign PDF', level: 1 })).toBeVisible()
    await page.locator('[data-testid="drag-drop-zone"]').first().waitFor({ state: 'visible' })
    await page.locator('input[type="file"]').first().setInputFiles(samplePdf)
    await expect(page.locator('[data-testid="file-preview"]')).toContainText('sample1.pdf')

    await page.locator('input[type="file"]').first().setInputFiles(signaturePath)
    await expect(page.getByText('signature.png')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create signed PDF' })).toBeEnabled()

    await page.getByRole('button', { name: 'Create signed PDF' }).click()

    await expect(page.getByRole('heading', { name: 'Signature applied' })).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('button', { name: 'Download signed PDF' }).first()).toBeVisible()
  })
})
