import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { waitForPageReady, uploadFile } from '../helpers/test-utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('压缩 PDF 功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/compress')
    await waitForPageReady(page)
  })

  test('应该显示压缩 PDF 页面', async ({ page }) => {
    await expect(page).toHaveURL(/\/compress/i)
    const heading = page.locator('h1').first()
    // 支持多语言：中文"压缩"或英文"Compress"
    await expect(heading).toContainText(/压缩|compress/i)
  })

  test('应该显示拖拽上传区域', async ({ page }) => {
    const dropZone = page.locator('[data-testid="drag-drop-zone"]')
    await expect(dropZone).toBeVisible()
  })

  test('应该显示质量选择器', async ({ page }) => {
    // 上传文件后质量选择器才会显示
    await uploadFile(page, path.join(__dirname, '../fixtures/sample1.pdf'))

    // 等待质量选项显示
    await page.waitForTimeout(500)
    const qualityOption = page.getByText(/高质量|平衡|高压缩/i).first()
    await expect(qualityOption).toBeVisible({ timeout: 10000 })
  })

  test('应该可以选择压缩质量', async ({ page }) => {
    await uploadFile(page, path.join(__dirname, '../fixtures/sample1.pdf'))

    // 等待质量选项加载
    await page.waitForTimeout(500)

    // 点击"平衡"选项
    const balanceOption = page.getByText('平衡').first()
    await balanceOption.waitFor({ state: 'visible', timeout: 10000 })
    await balanceOption.click()

    // 验证选项可见
    await expect(balanceOption).toBeVisible()
  })

  test('应该显示预估压缩效果', async ({ page }) => {
    await uploadFile(page, path.join(__dirname, '../fixtures/large.pdf'))

    // 等待预估信息加载
    await page.waitForTimeout(1000)

    // 检查预估文本
    const estimateSection = page.locator('text=/预估|压缩/i').first()
    await expect(estimateSection).toBeVisible({ timeout: 10000 })
  })

  test('应该显示压缩按钮', async ({ page }) => {
    await uploadFile(page, path.join(__dirname, '../fixtures/sample1.pdf'))

    // 使用更精确的选择器，匹配完整的 "压缩 PDF" 文本
    const compressButton = page.getByRole('button', { name: /^压缩 PDF$|^Compress PDF$/i })
    await expect(compressButton).toBeVisible({ timeout: 10000 })
  })
})
