import { expect, test, type Page } from '@playwright/test'
import { writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { waitForPageReady, uploadFile } from '../helpers/test-utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const samplePdf = path.join(__dirname, '../fixtures/sample1.pdf')
const PDF_RESULT = '%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n'

type UserRole = 'guest' | 'free' | 'pro'

const users = {
  free: {
    id: 501,
    email: 'free-cloud@pdf-flow.test',
    full_name: 'Free Cloud User',
    role: 'free',
    is_active: true,
    is_verified: true,
    created_at: '2026-06-12T08:00:00.000Z',
  },
  pro: {
    id: 502,
    email: 'pro-cloud@pdf-flow.test',
    full_name: 'Pro Cloud User',
    role: 'pro',
    is_active: true,
    is_verified: true,
    created_at: '2026-06-12T08:00:00.000Z',
  },
}

async function mockCloudShell(page: Page, role: UserRole = 'guest') {
  await page.addInitScript((selectedRole) => {
    window.localStorage.setItem('pdf-flow-locale', 'en')

    if (selectedRole === 'guest') {
      window.localStorage.removeItem('access_token')
      window.localStorage.removeItem('refresh_token')
      return
    }

    window.localStorage.setItem('access_token', `${selectedRole}-cloud-token`)
    window.localStorage.setItem('refresh_token', `${selectedRole}-cloud-refresh-token`)
  }, role)

  await page.route('**/api/v1/admin/public-config', async (route) => {
    await route.fulfill({ json: { settings: {}, feature_flags: {}, content_blocks: {} } })
  })

  await page.route('**/api/v1/auth/me', async (route) => {
    if (role === 'guest') {
      await route.fulfill({ status: 401, json: { detail: 'Not authenticated' } })
      return
    }

    await route.fulfill({ json: users[role] })
  })

  await page.route('**/api/v1/users/me/stats', async (route) => {
    await route.fulfill({
      json: {
        total_requests: 12,
        requests_today: 2,
        storage_used: 0,
        quota_remaining: role === 'pro' ? 498 : 18,
        quota_limit: role === 'pro' ? 500 : 20,
        role,
      },
    })
  })
}

async function openCloudTool(page: Page, route: string, role: UserRole = 'guest') {
  await mockCloudShell(page, role)
  await page.goto(route)
  await waitForPageReady(page)
}

async function fulfillPdfBlob(route: Parameters<Parameters<Page['route']>[1]>[0]) {
  await route.fulfill({
    status: 200,
    contentType: 'application/pdf',
    body: PDF_RESULT,
  })
}

test.describe('Cloud and gated tool access workflows', () => {
  test('shows sign-in access panels for guest-only cloud tools', async ({ page }) => {
    const tools = [
      {
        route: '/tools/protect',
        heading: 'Protect PDF',
        accessTitle: 'Sign in to create a protected PDF',
      },
      {
        route: '/tools/unlock',
        heading: 'Unlock PDF',
        accessTitle: 'Sign in to unlock PDFs you are allowed to process',
      },
      {
        route: '/tools/repair',
        heading: 'Repair PDF',
        accessTitle: 'Sign in to repair readable PDF files',
      },
      {
        route: '/tools/office-to-pdf',
        heading: 'Office to PDF',
        accessTitle: 'Sign in to convert Office files',
      },
      {
        route: '/tools/ocr',
        heading: 'OCR Text Recognition',
        accessTitle: 'Sign in to use OCR',
      },
      {
        route: '/tools/ai-analyzer',
        heading: 'AI PDF Analyzer',
        accessTitle: 'Sign in to use AI analysis',
      },
    ]

    for (const tool of tools) {
      await openCloudTool(page, tool.route)

      await expect(page.getByRole('heading', { name: tool.heading, level: 1 })).toBeVisible()
      await expect(page.locator('[data-testid="tool-access-panel"]')).toContainText(tool.accessTitle)
      await expect(page.locator('[data-testid="tool-access-panel"]').getByRole('button')).toContainText('Sign in')
    }
  })

  test('shows Pro upgrade panels for signed-in free users on Pro cloud tools', async ({ page }) => {
    await openCloudTool(page, '/tools/ocr', 'free')

    await expect(page.getByRole('heading', { name: 'OCR Text Recognition', level: 1 })).toBeVisible()
    await expect(page.locator('[data-testid="tool-access-panel"]')).toContainText('Upgrade required')
    await page.locator('[data-testid="tool-access-panel"]').getByRole('button', { name: 'View Pro' }).click()
    await expect(page).toHaveURL(/\/pricing\?feature=ocr/)

    await page.goto('/tools/ai-analyzer')
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { name: 'AI PDF Analyzer', level: 1 })).toBeVisible()
    await expect(page.locator('[data-testid="tool-access-panel"]')).toContainText('Upgrade required')
    await page.locator('[data-testid="tool-access-panel"]').getByRole('button', { name: 'View Pro' }).click()
    await expect(page).toHaveURL(/\/pricing\?feature=ai-analyzer/)
  })

  test('creates a protected PDF for an authenticated user', async ({ page }) => {
    await openCloudTool(page, '/tools/protect', 'free')
    await page.route('**/api/v1/advanced/protect', fulfillPdfBlob)

    await expect(page.getByRole('heading', { name: 'Protect PDF', level: 1 })).toBeVisible()
    await uploadFile(page, samplePdf)

    await page.getByLabel('Open password').fill('Strong123!')
    await page.getByLabel('Confirm password').fill('Strong123!')
    await page.getByRole('button', { name: 'Create protected PDF' }).click()

    await expect(page.getByRole('heading', { name: 'PDF protected' })).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('button', { name: 'Download protected PDF' }).first()).toBeVisible()
  })

  test('shows a diagnostic when unlocking fails server-side', async ({ page }) => {
    await openCloudTool(page, '/tools/unlock', 'free')
    await page.route('**/api/v1/advanced/unlock', async (route) => {
      await route.fulfill({ status: 422, json: { detail: 'Invalid PDF password' } })
    })

    await expect(page.getByRole('heading', { name: 'Unlock PDF', level: 1 })).toBeVisible()
    await uploadFile(page, samplePdf)

    await page.getByLabel('Current open password').fill('wrong-password')
    await page.getByRole('button', { name: 'Create unlocked copy' }).click()

    await expect(page.getByText('Please check the file and options')).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('PF-UNLOCK-422-INPUT')).toBeVisible()
  })

  test('converts an Office file through the authenticated cloud job flow', async ({ page }, testInfo) => {
    const officeFile = testInfo.outputPath('sample.docx')
    await writeFile(officeFile, 'PDF-Flow office conversion fixture')

    await openCloudTool(page, '/tools/office-to-pdf', 'free')
    await page.route('**/api/v1/files/office-to-pdf', async (route) => {
      await route.fulfill({ json: { job_id: 'office-job-1', status: 'pending', progress: 10 } })
    })
    await page.route('**/api/v1/files/jobs/office-job-1', async (route) => {
      await route.fulfill({
        json: {
          job_id: 'office-job-1',
          status: 'completed',
          created_at: Date.now(),
          updated_at: Date.now(),
          progress: 100,
        },
      })
    })
    await page.route('**/api/v1/files/download/office-job-1', fulfillPdfBlob)

    await expect(page.getByRole('heading', { name: 'Office to PDF', level: 1 })).toBeVisible()
    await uploadFile(page, officeFile)

    await page.getByRole('button', { name: 'Convert to PDF' }).click()

    await expect(page.getByRole('heading', { name: 'Conversion successful!' })).toBeVisible({
      timeout: 20000,
    })
    await expect(page.getByRole('button', { name: 'Download' }).first()).toBeVisible()
  })

  test('runs OCR for a Pro user and opens the recognized text result', async ({ page }) => {
    await openCloudTool(page, '/tools/ocr', 'pro')
    await page.route('**/api/v1/files/upload', async (route) => {
      await route.fulfill({
        json: {
          file_id: 'ocr-file-1',
          filename: 'sample1.pdf',
          size: 1555,
          mime_type: 'application/pdf',
          upload_time: Date.now(),
        },
      })
    })
    await page.route('**/api/v1/files/ocr', async (route) => {
      await route.fulfill({ json: { job_id: 'ocr-job-1', status: 'pending', progress: 15 } })
    })
    await page.route('**/api/v1/files/jobs/ocr-job-1', async (route) => {
      await route.fulfill({
        json: {
          job_id: 'ocr-job-1',
          status: 'completed',
          created_at: Date.now(),
          updated_at: Date.now(),
          progress: 100,
        },
      })
    })
    await page.route('**/api/v1/files/download/ocr-job-1', async (route) => {
      await route.fulfill({
        contentType: 'text/plain;charset=utf-8',
        body: JSON.stringify({
          text: 'Recognized OCR result from the uploaded document.',
          page_count: 2,
          average_confidence: 96,
        }),
      })
    })

    await expect(page.getByRole('heading', { name: 'OCR Text Recognition', level: 1 })).toBeVisible()
    await uploadFile(page, samplePdf)

    await page.getByRole('button', { name: 'Simplified Chinese' }).click()
    await page.getByRole('button', { name: 'Start OCR' }).click()

    await expect(page.getByRole('dialog', { name: 'Recognized text' })).toBeVisible({
      timeout: 20000,
    })
    await expect(page.getByRole('dialog', { name: 'Recognized text' })).toContainText(
      'Recognized OCR result from the uploaded document.'
    )
    await expect(
      page.getByRole('dialog', { name: 'Recognized text' }).getByRole('button', { name: 'Download TXT' })
    ).toBeVisible()
  })

  test('runs an AI summary for a Pro user', async ({ page }) => {
    await openCloudTool(page, '/tools/ai-analyzer', 'pro')
    await page.route('**/api/v1/ai/summarize**', async (route) => {
      await route.fulfill({
        json: {
          summary: 'This PDF is a concise test document used to verify AI workflow rendering.',
          key_points: ['Upload succeeded', 'Summary rendered'],
          topics: ['Testing', 'PDF'],
        },
      })
    })

    await expect(page.getByRole('heading', { name: 'AI PDF Analyzer', level: 1 })).toBeVisible()
    await page.locator('[data-testid="drag-drop-zone"]').first().waitFor({ state: 'visible' })
    await page.locator('input[type="file"]').first().setInputFiles(samplePdf)
    await expect(page.getByText('sample1.pdf')).toBeVisible({ timeout: 20000 })

    await page.getByLabel('Summary Length').selectOption('short')
    await page.getByRole('button', { name: 'Generate Summary' }).click()

    await expect(page.getByText('This PDF is a concise test document used to verify AI workflow rendering.')).toBeVisible({
      timeout: 20000,
    })
    await expect(page.getByText('Upload succeeded')).toBeVisible()
    await expect(page.getByText('Testing')).toBeVisible()
  })
})
