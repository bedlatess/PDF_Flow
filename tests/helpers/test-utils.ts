import { expect, type Page } from '@playwright/test'

export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('h1, h2', { timeout: 10000 })
  await page.waitForFunction(() => {
    const app = document.querySelector('#app')
    return Boolean(app && app.children.length > 0)
  }, { timeout: 10000 })
}

export async function uploadFile(page: Page, filePath: string): Promise<void> {
  await page.locator('[data-testid="drag-drop-zone"]').first().waitFor({ state: 'visible' })
  await page.locator('input[type="file"]').first().setInputFiles(filePath)
  await expect(page.locator('[data-testid="file-preview"]').first()).toBeVisible({ timeout: 20000 })
}

export async function uploadMultipleFiles(page: Page, filePaths: string[]): Promise<void> {
  await page.locator('[data-testid="drag-drop-zone"]').first().waitFor({ state: 'visible' })
  await page.locator('input[type="file"]').first().setInputFiles(filePaths)
  await expect(page.locator('[data-testid="file-preview"]')).toHaveCount(filePaths.length, {
    timeout: 30000,
  })
}

export async function waitForProcessing(page: Page, timeoutMs: number = 30000): Promise<void> {
  const progressBar = page.locator('[data-testid="progress-bar"]')

  if (await progressBar.first().isVisible().catch(() => false)) {
    await expect(progressBar.first()).toBeHidden({ timeout: timeoutMs })
  }
}

export async function waitForModal(page: Page): Promise<void> {
  await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5000 })
}

export async function closeModal(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog').first()
  await expect(dialog).toBeVisible({ timeout: 5000 })
  await dialog
    .getByRole('button', { name: /close|cancel|x/i })
    .or(dialog.locator('button').first())
    .click()
  await expect(dialog).toBeHidden({ timeout: 5000 })
}

export async function waitForDownload(page: Page): Promise<void> {
  await page.waitForEvent('download', { timeout: 10000 })
}

export async function verifyToolPage(page: Page, toolName: string): Promise<void> {
  await waitForPageReady(page)
  await page.waitForURL(new RegExp(toolName, 'i'))
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 })
  await expect(page.locator('[data-testid="drag-drop-zone"]').first()).toBeVisible({ timeout: 5000 })
}

export async function waitForThumbnails(page: Page, minCount: number = 1): Promise<void> {
  await expect
    .poll(async () => page.locator('[data-testid="page-thumbnail"]').count(), { timeout: 15000 })
    .toBeGreaterThanOrEqual(minCount)
}

export async function selectThumbnails(page: Page, indices: number[]): Promise<void> {
  for (const index of indices) {
    const thumbnail = page.locator('[data-testid="page-thumbnail"]').nth(index)
    await thumbnail.click()
    await expect(thumbnail).toHaveClass(/border-primary/)
  }
}

export async function inputPageRange(page: Page, range: string): Promise<void> {
  const rangeInput = page
    .locator('input[placeholder*="page"], input[placeholder*="Page"], input[placeholder*="1-3"], input[type="text"]')
    .first()
  await expect(rangeInput).toBeVisible({ timeout: 5000 })
  await rangeInput.fill(range)
  await expect(rangeInput).toHaveValue(range)
}

export async function clickProcessButton(page: Page, buttonText: string): Promise<void> {
  const button = page.getByRole('button', { name: new RegExp(buttonText, 'i') })
  await expect(button).toBeVisible({ timeout: 5000 })
  await button.click()
}

export async function waitForSuccess(page: Page): Promise<void> {
  await expect(page.getByText(/success|complete|completed|ready|done/i).first()).toBeVisible({
    timeout: 5000,
  })
}

export async function waitForError(page: Page): Promise<void> {
  await expect(page.getByText(/error|failed|failure|could not|unable/i).first()).toBeVisible({
    timeout: 5000,
  })
}
