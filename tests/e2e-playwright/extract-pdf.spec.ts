import { expect, test, type Page } from '@playwright/test'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { waitForPageReady, uploadFile } from '../helpers/test-utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

async function uploadSamplePdf(page: Page, fileName = 'sample1.pdf') {
  await uploadFile(page, path.join(__dirname, '../fixtures', fileName))
}

async function createPdfWithEmbeddedImage(filePath: string) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const pngBytes = Uint8Array.from(Buffer.from(PNG_1X1_BASE64, 'base64'))
  const image = await pdf.embedPng(pngBytes)
  const page = pdf.addPage([320, 240])

  page.drawText('Image extraction fixture', {
    x: 24,
    y: 200,
    size: 14,
    font,
    color: rgb(0.1, 0.1, 0.1),
  })
  page.drawImage(image, {
    x: 32,
    y: 80,
    width: 96,
    height: 96,
  })

  await writeFile(filePath, await pdf.save())
}

async function createImageOnlyPdf(filePath: string) {
  const pdf = await PDFDocument.create()
  const pngBytes = Uint8Array.from(Buffer.from(PNG_1X1_BASE64, 'base64'))
  const image = await pdf.embedPng(pngBytes)
  const page = pdf.addPage([240, 240])

  page.drawImage(image, {
    x: 72,
    y: 72,
    width: 96,
    height: 96,
  })

  await writeFile(filePath, await pdf.save())
}

test.describe('Extract PDF tools', () => {
  test('extracts text from a text-layer PDF and exposes copy/download actions', async ({ page }) => {
    await openTool(page, '/tools/extract-text')

    await expect(page.getByRole('heading', { name: 'Extract PDF Text', level: 1 })).toBeVisible()
    await expect(page.locator('[data-testid="drag-drop-zone"]')).toBeVisible()

    await uploadSamplePdf(page)

    await expect(page.locator('[data-testid="file-preview"]')).toContainText('sample1.pdf')
    await expect(page.getByRole('button', { name: 'Extract text' })).toBeEnabled()
    await page.getByRole('button', { name: 'Extract text' }).click()

    await expect(page.getByText('Text extracted').first()).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Sample PDF 1').first()).toBeVisible()
    await expect(page.getByText('--- Page 1 ---').first()).toBeVisible()
    await expect(page.getByText('This is a test PDF file.').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy text' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Download TXT' })).toBeVisible()
  })

  test('shows the empty text state for image-only PDFs', async ({ page }, testInfo) => {
    const imagePdf = testInfo.outputPath('image-only-text-check.pdf')
    await createImageOnlyPdf(imagePdf)
    await openTool(page, '/tools/extract-text')

    await uploadFile(page, imagePdf)
    await page.getByRole('button', { name: 'Extract text' }).click()

    await expect(page.getByText('No usable text found')).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Try OCR text recognition instead.')).toBeVisible()
  })

  test('extracts embedded images and renders downloadable image cards', async ({ page }, testInfo) => {
    const imagePdf = testInfo.outputPath('embedded-image.pdf')
    await createPdfWithEmbeddedImage(imagePdf)
    await openTool(page, '/tools/extract-images')

    await expect(page.getByRole('heading', { name: 'Extract PDF Images', level: 1 })).toBeVisible()
    await expect(page.locator('[data-testid="drag-drop-zone"]')).toBeVisible()

    await uploadFile(page, imagePdf)

    await expect(page.locator('[data-testid="file-preview"]')).toContainText('embedded-image.pdf')
    await expect(page.getByRole('button', { name: 'Extract images' })).toBeEnabled()
    await page.getByRole('button', { name: 'Extract images' }).click()

    await expect(page.getByRole('heading', { name: /\d+ images found/ })).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('img').first()).toBeVisible()
    await expect(page.getByText(/Size \d+ x \d+/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Download all' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Download' }).first()).toBeVisible()
  })
})
