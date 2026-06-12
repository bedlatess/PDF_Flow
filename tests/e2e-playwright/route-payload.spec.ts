import { expect, test, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const HEAVY_PDF_ASSET_PATTERNS = [
  /\/assets\/jspdf-vendor-[^/]+\.js$/,
  /\/assets\/pdf-lib-vendor-[^/]+\.js$/,
  /\/assets\/pdfjs-vendor-[^/]+\.js$/,
  /\/assets\/convert-[^/]+\.js$/,
  /\/assets\/pdf\.worker-[^/]+\.js$/,
  /\/assets\/pdf\.worker\.min-[^/]+\.mjs$/,
]

const CUSTOM_WORKER_PATTERN = /\/assets\/pdf\.worker-[^/]+\.js$/
const CONVERT_STACK_PATTERNS = [
  /\/assets\/convert-[^/]+\.js$/,
  /\/assets\/jspdf-vendor-[^/]+\.js$/,
  /\/assets\/pdfjs-vendor-[^/]+\.js$/,
]

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

function collectAssetRequests(page: Page) {
  const paths: string[] = []

  page.on('request', (request) => {
    const url = request.url()
    if (!url.includes('/assets/')) {
      return
    }

    paths.push(new URL(url).pathname)
  })

  return paths
}

function matchingAssets(paths: string[], patterns: RegExp[]) {
  return paths.filter((assetPath) => patterns.some((pattern) => pattern.test(assetPath)))
}

async function expectNoHeavyPdfAssets(page: Page, route: string) {
  await mockPublicApp(page)
  const requests = collectAssetRequests(page)

  await page.goto(route)
  await page.waitForLoadState('networkidle')

  expect(matchingAssets(requests, HEAVY_PDF_ASSET_PATTERNS)).toEqual([])
}

test.describe('Route payload and PDF worker lazy loading', () => {
  test('keeps public entry routes free of PDF processing bundles', async ({ page }) => {
    await expectNoHeavyPdfAssets(page, '/')
  })

  test('keeps the tools center free of PDF processing bundles', async ({ page }) => {
    await expectNoHeavyPdfAssets(page, '/tools')
  })

  test('opens image conversion routes without loading the conversion stack', async ({ page }) => {
    await mockPublicApp(page)
    const requests = collectAssetRequests(page)

    await page.goto('/tools/image-to-pdf')
    await expect(page.getByRole('heading', { name: 'Image to PDF' })).toBeVisible()
    await page.waitForLoadState('networkidle')

    await page.goto('/tools/pdf-to-image')
    await expect(page.getByRole('heading', { name: 'PDF to Image' })).toBeVisible()
    await page.waitForLoadState('networkidle')

    expect(matchingAssets(requests, CONVERT_STACK_PATTERNS)).toEqual([])
  })

  test('starts the custom PDF worker only when local processing begins', async ({ page }) => {
    await mockPublicApp(page)
    const requests = collectAssetRequests(page)

    await page.goto('/tools/merge')
    await expect(page.getByRole('heading', { name: 'Merge PDF' })).toBeVisible()
    await page.waitForLoadState('networkidle')

    expect(matchingAssets(requests, [CUSTOM_WORKER_PATTERN])).toEqual([])

    await page
      .locator('input[type="file"]')
      .setInputFiles([
        path.join(__dirname, '../fixtures/sample1.pdf'),
        path.join(__dirname, '../fixtures/sample2.pdf'),
      ])
    await expect(page.getByRole('button', { name: 'Merge PDF' })).toBeEnabled({ timeout: 20000 })
    await page.waitForLoadState('networkidle')

    expect(matchingAssets(requests, [CUSTOM_WORKER_PATTERN])).toEqual([])

    await page.getByRole('button', { name: 'Merge PDF' }).click()
    await expect
      .poll(() => matchingAssets(requests, [CUSTOM_WORKER_PATTERN]).length, { timeout: 15000 })
      .toBeGreaterThan(0)
  })
})
