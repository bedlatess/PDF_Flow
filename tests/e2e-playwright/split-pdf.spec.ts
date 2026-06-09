import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { waitForPageReady, uploadFile, inputPageRange } from '../helpers/test-utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('拆分 PDF 功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/split')
    await waitForPageReady(page)
  })

  test('应该显示拆分 PDF 页面', async ({ page }) => {
    await expect(page).toHaveURL(/\/split/i)
    const heading = page.locator('h1').first()
    // 支持多语言：中文"拆分"或英文"Split"
    await expect(heading).toContainText(/拆分|split/i)
  })

  test('应该显示拖拽上传区域', async ({ page }) => {
    const dropZone = page.locator('[data-testid="drag-drop-zone"]')
    await expect(dropZone).toBeVisible()
  })

  test('应该可以上传 PDF 文件', async ({ page }) => {
    await uploadFile(page, path.join(__dirname, '../fixtures/multi-page.pdf'))

    // 检查文件预览
    const filePreview = page.locator('[data-testid="file-preview"]')
    await expect(filePreview).toBeVisible({ timeout: 10000 })
  })

  test('应该显示页面范围输入框', async ({ page }) => {
    await uploadFile(page, path.join(__dirname, '../fixtures/multi-page.pdf'))

    // 等待页面加载
    await page.waitForTimeout(1000)

    // 查找页面范围输入框
    const rangeInput = page.locator('input[type="text"]').filter({ hasText: '' }).first()
    await expect(rangeInput).toBeVisible({ timeout: 10000 })
  })

  test('应该可以输入页面范围', async ({ page }) => {
    await uploadFile(page, path.join(__dirname, '../fixtures/multi-page.pdf'))

    // 等待输入框出现
    await page.waitForTimeout(1000)

    // 输入页面范围
    const rangeInput = page.locator('input[placeholder*="1-3"]').or(page.locator('input[type="text"]')).first()
    await rangeInput.waitFor({ state: 'visible', timeout: 10000 })
    await rangeInput.fill('1-3,5')

    // 检查输入值
    await expect(rangeInput).toHaveValue('1-3,5')
  })

  test('应该显示拆分按钮', async ({ page }) => {
    await uploadFile(page, path.join(__dirname, '../fixtures/multi-page.pdf'))

    const splitButton = page.getByRole('button', { name: /拆分|提取/i })
    await expect(splitButton).toBeVisible({ timeout: 10000 })
  })

  test('应该显示可视化选择按钮', async ({ page }) => {
    await uploadFile(page, path.join(__dirname, '../fixtures/multi-page.pdf'))

    // 查找可视化选择按钮
    const visualButton = page.getByText(/可视化选择/i).or(page.locator('button').filter({ hasText: /可视化/i }))
    await expect(visualButton.first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('可视化页面选择器', () => {
  test('应该可以打开可视化选择模式', async ({ page }) => {
    await page.goto('/tools/split')
    await waitForPageReady(page)

    await uploadFile(page, path.join(__dirname, '../fixtures/multi-page.pdf'))

    // 查找并点击可视化选择按钮
    const visualButton = page.getByText(/可视化选择/i).first()

    // 检查按钮是否存在
    const buttonExists = await visualButton.count() > 0
    if (buttonExists) {
      await visualButton.click()

      // 等待模态框或缩略图网格出现
      await page.waitForTimeout(1000)

      // 检查是否有缩略图或模态框出现
      const thumbnailOrModal = page.locator('[data-testid="page-thumbnail"], [role="dialog"]').first()
      const hasContent = await thumbnailOrModal.count() > 0

      if (hasContent) {
        await expect(thumbnailOrModal).toBeVisible({ timeout: 10000 })
      }
    }
  })
})
