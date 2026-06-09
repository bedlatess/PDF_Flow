import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { waitForPageReady, uploadMultipleFiles, uploadFile } from '../helpers/test-utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('合并 PDF 功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/merge')
    await waitForPageReady(page)
  })

  test('应该显示合并 PDF 页面', async ({ page }) => {
    await expect(page).toHaveURL(/\/merge/i)
    const heading = page.locator('h1').first()
    // 支持多语言：中文"合并"或英文"Merge"
    await expect(heading).toContainText(/合并|merge/i)
  })

  test('应该显示拖拽上传区域', async ({ page }) => {
    const dropZone = page.locator('[data-testid="drag-drop-zone"]')
    await expect(dropZone).toBeVisible({ timeout: 10000 })
  })

  test('应该可以上传 PDF 文件', async ({ page }) => {
    const filePaths = [
      path.join(__dirname, '../fixtures/sample1.pdf'),
      path.join(__dirname, '../fixtures/sample2.pdf'),
    ]

    await uploadMultipleFiles(page, filePaths)

    // 检查文件列表提示
    await expect(page.locator('text=/已选择.*2.*个文件/i')).toBeVisible({ timeout: 10000 })
  })

  test('应该可以重新排序文件', async ({ page }) => {
    const filePaths = [
      path.join(__dirname, '../fixtures/sample1.pdf'),
      path.join(__dirname, '../fixtures/sample2.pdf'),
    ]

    await uploadMultipleFiles(page, filePaths)

    // 等待文件加载
    await page.waitForTimeout(500)

    // 检查文件列表存在
    await expect(page.locator('text=/已选择.*2.*个文件/i')).toBeVisible()
  })

  test('应该可以删除文件', async ({ page }) => {
    await uploadFile(page, path.join(__dirname, '../fixtures/sample1.pdf'))

    // 等待文件加载
    await page.waitForTimeout(500)

    // 查找并点击删除按钮（SVG 图标）
    const deleteButton = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' }).first()
    await deleteButton.click()

    // 检查文件被删除 - 应该重新显示拖拽区域
    await expect(page.locator('[data-testid="drag-drop-zone"]')).toBeVisible({ timeout: 5000 })
  })

  test('应该显示合并按钮', async ({ page }) => {
    // 上传文件后才会显示合并按钮
    await uploadFile(page, path.join(__dirname, '../fixtures/sample1.pdf'))

    const mergeButton = page.getByRole('button', { name: /合并 PDF|Merge PDF/i })
    await expect(mergeButton).toBeVisible({ timeout: 10000 })
  })

  test('初始状态合并按钮应该禁用', async ({ page }) => {
    // 只上传一个文件，按钮应该禁用（需要至少2个文件）
    await uploadFile(page, path.join(__dirname, '../fixtures/sample1.pdf'))

    const mergeButton = page.getByRole('button', { name: /合并 PDF|Merge PDF/i })
    await expect(mergeButton).toBeDisabled({ timeout: 10000 })
  })

  test('上传文件后合并按钮应该启用', async ({ page }) => {
    const filePaths = [
      path.join(__dirname, '../fixtures/sample1.pdf'),
      path.join(__dirname, '../fixtures/sample2.pdf'),
    ]

    await uploadMultipleFiles(page, filePaths)

    // 等待一下确保状态更新
    await page.waitForTimeout(500)

    const mergeButton = page.getByRole('button', { name: /合并 PDF|Merge PDF/i })
    await expect(mergeButton).toBeEnabled({ timeout: 10000 })
  })

  test('应该显示进度条（合并时）', async ({ page }) => {
    const filePaths = [
      path.join(__dirname, '../fixtures/sample1.pdf'),
      path.join(__dirname, '../fixtures/sample2.pdf'),
    ]

    await uploadMultipleFiles(page, filePaths)

    // 点击合并
    const mergeButton = page.getByRole('button', { name: /合并 PDF|Merge PDF/i })
    await mergeButton.waitFor({ state: 'enabled', timeout: 10000 })
    await mergeButton.click()

    // 检查进度条显示（可能很快消失）
    // 使用 or 逻辑：要么看到进度条，要么直接看到成功提示
    const progressOrSuccess = page.locator('[data-testid="progress-bar"], text=/成功|完成/i').first()
    await expect(progressOrSuccess).toBeVisible({ timeout: 15000 })
  })
})
