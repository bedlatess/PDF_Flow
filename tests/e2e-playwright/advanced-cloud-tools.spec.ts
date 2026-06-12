import { expect, test, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { uploadFile, waitForPageReady } from '../helpers/test-utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const samplePdf = path.join(__dirname, '../fixtures/sample1.pdf')
const PDF_RESULT = '%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n'

type UserRole = 'guest' | 'free' | 'pro'

const users = {
  free: {
    id: 601,
    email: 'free-advanced@pdf-flow.test',
    full_name: 'Free Advanced User',
    role: 'free',
    is_active: true,
    is_verified: true,
    created_at: '2026-06-12T08:00:00.000Z',
  },
  pro: {
    id: 602,
    email: 'pro-advanced@pdf-flow.test',
    full_name: 'Pro Advanced User',
    role: 'pro',
    is_active: true,
    is_verified: true,
    created_at: '2026-06-12T08:00:00.000Z',
  },
}

async function mockAdvancedShell(page: Page, role: UserRole = 'guest') {
  await page.addInitScript((selectedRole) => {
    window.localStorage.setItem('pdf-flow-locale', 'en')

    if (selectedRole === 'guest') {
      window.localStorage.removeItem('access_token')
      window.localStorage.removeItem('refresh_token')
      return
    }

    window.localStorage.setItem('access_token', `${selectedRole}-advanced-token`)
    window.localStorage.setItem('refresh_token', `${selectedRole}-advanced-refresh-token`)
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
        total_requests: 22,
        requests_today: 3,
        storage_used: 0,
        quota_remaining: role === 'pro' ? 497 : 17,
        quota_limit: role === 'pro' ? 500 : 20,
        role,
      },
    })
  })
}

async function openAdvancedTool(page: Page, route: string, role: UserRole = 'guest') {
  await mockAdvancedShell(page, role)
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

test.describe('Advanced cloud tool workflows', () => {
  test('shows Pro upgrade panels for Fill Form and Annotate free users', async ({ page }) => {
    const tools = [
      {
        route: '/tools/fill-form',
        heading: 'Fill PDF Form',
        feature: 'fill-form',
      },
      {
        route: '/tools/annotate',
        heading: 'Annotate PDF',
        feature: 'annotate',
      },
    ]

    for (const tool of tools) {
      await openAdvancedTool(page, tool.route, 'free')

      await expect(page.getByRole('heading', { name: tool.heading, level: 1 })).toBeVisible()
      await expect(page.locator('[data-testid="tool-access-panel"]')).toContainText('Upgrade required')
      await page.locator('[data-testid="tool-access-panel"]').getByRole('button', { name: 'View Pro' }).click()
      await expect(page).toHaveURL(new RegExp(`/pricing\\?feature=${tool.feature}`))
    }
  })

  test('detects fields and fills a PDF form for a Pro user', async ({ page }) => {
    await openAdvancedTool(page, '/tools/fill-form', 'pro')

    await page.route('**/api/v1/advanced/form/fields', async (route) => {
      await route.fulfill({
        json: {
          fields: [
            { name: 'Full name', type: 'text', required: true, default_value: '' },
            { name: 'Newsletter', type: 'checkbox', required: false, default_value: false },
            { name: 'Plan', type: 'dropdown', required: true, options: ['Pro', 'Enterprise'], default_value: '' },
          ],
        },
      })
    })
    await page.route('**/api/v1/advanced/form/fill', fulfillPdfBlob)

    await expect(page.getByRole('heading', { name: 'Fill PDF Form', level: 1 })).toBeVisible()
    await uploadFile(page, samplePdf)

    await expect(page.getByRole('heading', { name: 'Review fields' })).toBeVisible({ timeout: 20000 })
    await page.getByLabel('Full name').fill('Ada Lovelace')
    await page.getByLabel('Newsletter').check()
    await page.getByLabel('Plan').selectOption('Pro')
    await page.getByRole('button', { name: 'Fill Form' }).click()

    await expect(page.getByRole('heading', { name: 'Form filled' })).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('3 fields filled')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Download' }).first()).toBeVisible()
  })

  test('adds text and highlight annotations for a Pro user', async ({ page }) => {
    await openAdvancedTool(page, '/tools/annotate', 'pro')
    await page.route('**/api/v1/advanced/annotate/text', fulfillPdfBlob)
    await page.route('**/api/v1/advanced/annotate/highlight', fulfillPdfBlob)

    await expect(page.getByRole('heading', { name: 'Annotate PDF', level: 1 })).toBeVisible()
    await uploadFile(page, samplePdf)

    await expect(page.getByRole('heading', { name: 'Configure annotation' })).toBeVisible({ timeout: 20000 })
    await page.getByLabel('Annotation text').fill('Reviewed by PDF-Flow')
    await page.getByLabel('Page Number').fill('1')
    await page.getByLabel('X Position').fill('120')
    await page.getByLabel('Y Position').fill('180')
    await page.getByRole('button', { name: 'Add Annotation' }).click()

    await expect(page.getByRole('heading', { name: 'Annotation added' })).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Text annotation added successfully')).toBeVisible()

    await page.getByRole('button', { name: 'Annotate Another PDF' }).click()
    await uploadFile(page, samplePdf)
    await page.getByRole('button', { name: /Highlight Text/ }).click()
    await page.getByLabel('Page Number').fill('1')
    await page.getByPlaceholder('x1').fill('90')
    await page.getByPlaceholder('y1').fill('120')
    await page.getByPlaceholder('x2').fill('260')
    await page.getByPlaceholder('y2').fill('145')
    await page.getByRole('button', { name: 'Add Annotation' }).click()

    await expect(page.getByRole('heading', { name: 'Annotation added' })).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Highlight added successfully')).toBeVisible()
  })

  test('runs AI question, extraction, and batch analysis for a Pro user', async ({ page }) => {
    await openAdvancedTool(page, '/tools/ai-analyzer', 'pro')

    await page.route('**/api/v1/ai/ask', async (route) => {
      await route.fulfill({
        json: {
          answer: 'The document is a short PDF-Flow verification fixture.',
          confidence: 'high',
          relevant_excerpts: ['PDF-Flow sample document'],
        },
      })
    })
    await page.route('**/api/v1/ai/extract**', async (route) => {
      await route.fulfill({
        json: {
          extracted_data: {
            document_type: 'general',
            owner: 'PDF-Flow',
          },
        },
      })
    })
    await page.route('**/api/v1/ai/batch-analyze', async (route) => {
      await route.fulfill({
        json: {
          operations_completed: ['summarize', 'extract', 'classify'],
          results: {
            summary: { summary: 'Batch summary complete.' },
            extraction: { fields: ['owner', 'document_type'] },
            classification: { category: 'General document', confidence: 'high' },
          },
        },
      })
    })

    await expect(page.getByRole('heading', { name: 'AI PDF Analyzer', level: 1 })).toBeVisible()
    await page.locator('[data-testid="drag-drop-zone"]').first().waitFor({ state: 'visible' })
    await page.locator('input[type="file"]').first().setInputFiles(samplePdf)
    await expect(page.getByText('sample1.pdf')).toBeVisible({ timeout: 20000 })

    await page.getByRole('button', { name: 'Q&A' }).click()
    await page.getByLabel('Your Question').fill('What is this document?')
    await page.getByRole('button', { name: 'Ask AI' }).click()
    await expect(page.getByText('The document is a short PDF-Flow verification fixture.')).toBeVisible({
      timeout: 20000,
    })

    await page.getByRole('button', { name: 'Extract Data' }).click()
    await page.getByLabel('Document Type').selectOption('general')
    await page.getByRole('button', { name: 'Extract Data' }).last().click()
    await expect(page.getByText('"owner": "PDF-Flow"')).toBeVisible({ timeout: 20000 })

    await page.getByRole('button', { name: 'Batch analysis' }).click()
    await expect(page.getByText('Smart summary')).toBeVisible()
    await page.getByText('Document classification').click()
    await page.getByRole('button', { name: 'Start batch analysis' }).click()

    await expect(page.getByText('Analysis complete')).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('3 tasks completed.')).toBeVisible()
    await expect(page.getByText('General document · high')).toBeVisible()
  })
})
