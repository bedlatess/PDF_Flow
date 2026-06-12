import { expect, test, type Page } from '@playwright/test'

type ToolPageCase = {
  route: string
  heading: string | RegExp
  access: 'upload' | 'access-panel'
}

const toolPages: ToolPageCase[] = [
  { route: '/tools/merge', heading: 'Merge PDF', access: 'upload' },
  { route: '/tools/split', heading: 'Split PDF', access: 'upload' },
  { route: '/tools/rotate', heading: 'Rotate PDF', access: 'upload' },
  { route: '/tools/compress', heading: 'Compress PDF', access: 'upload' },
  { route: '/tools/image-to-pdf', heading: 'Image to PDF', access: 'upload' },
  { route: '/tools/pdf-to-image', heading: 'PDF to Image', access: 'upload' },
  { route: '/tools/delete-pages', heading: 'Delete PDF Pages', access: 'upload' },
  { route: '/tools/organize', heading: 'Organize PDF Pages', access: 'upload' },
  { route: '/tools/page-numbers', heading: 'Add PDF Page Numbers', access: 'upload' },
  { route: '/tools/crop', heading: 'Crop PDF', access: 'upload' },
  { route: '/tools/flatten', heading: 'Flatten PDF', access: 'upload' },
  { route: '/tools/sign', heading: 'Sign PDF', access: 'upload' },
  { route: '/tools/extract-text', heading: 'Extract PDF Text', access: 'upload' },
  { route: '/tools/extract-images', heading: 'Extract PDF Images', access: 'upload' },
  { route: '/tools/watermark', heading: 'Watermark PDF', access: 'upload' },
  { route: '/tools/repair', heading: 'Repair PDF', access: 'access-panel' },
  { route: '/tools/protect', heading: 'Protect PDF', access: 'access-panel' },
  { route: '/tools/unlock', heading: 'Unlock PDF', access: 'access-panel' },
  { route: '/tools/office-to-pdf', heading: 'Office to PDF', access: 'access-panel' },
  { route: '/tools/ocr', heading: 'OCR Text Recognition', access: 'access-panel' },
  { route: '/tools/ai-analyzer', heading: 'AI PDF Analyzer', access: 'access-panel' },
  { route: '/tools/fill-form', heading: 'Fill PDF Form', access: 'access-panel' },
  { route: '/tools/annotate', heading: 'Annotate PDF', access: 'access-panel' },
]

async function mockPublicToolShell(page: Page) {
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

async function expectToolPageReady(page: Page, tool: ToolPageCase) {
  await page.goto(tool.route)

  await expect(page).toHaveURL(new RegExp(tool.route.replaceAll('/', '\\/')))
  await expect(page.getByRole('heading', { name: tool.heading, level: 1 })).toBeVisible()
  await expect(page.locator('main main')).toHaveCount(0)

  if (tool.access === 'upload') {
    await expect(page.locator('[data-testid="drag-drop-zone"]').first()).toBeVisible()
  } else {
    await expect(page.locator('[data-testid="tool-access-panel"]').first()).toBeVisible()
  }

  await expectNoHorizontalOverflow(page)
}

test.describe('Tool page matrix QA', () => {
  test.beforeEach(async ({ page }) => {
    await mockPublicToolShell(page)
  })

  test('opens every tool detail page on desktop with the expected workspace surface', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })

    for (const tool of toolPages) {
      await expectToolPageReady(page, tool)
    }
  })

  test('keeps every tool detail page usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 })

    for (const tool of toolPages) {
      await expectToolPageReady(page, tool)
    }
  })
})
