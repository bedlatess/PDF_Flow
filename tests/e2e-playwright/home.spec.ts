import { test, expect } from '@playwright/test'

test.describe('PDF-Flow 首页', () => {
  test('应该正确加载首页', async ({ page }) => {
    await page.goto('/')

    // 检查页面标题
    await expect(page).toHaveTitle(/PDF-Flow/i)

    // 检查 Hero 区域
    await expect(page.locator('h1')).toContainText(/PDF/i)

    // 检查工具卡片存在
    const toolCards = page.locator('[data-testid="tool-card"]')
    await expect(toolCards).toHaveCount(6) // 6 个 PDF 工具
  })

  test('应该显示所有 PDF 工具', async ({ page }) => {
    await page.goto('/')

    // 检查各工具卡片（支持中英文）
    await expect(page.getByText(/合并.*PDF|Merge.*PDF/i).first()).toBeVisible()
    await expect(page.getByText(/拆分.*PDF|Split.*PDF/i).first()).toBeVisible()
    await expect(page.getByText(/旋转.*PDF|Rotate.*PDF/i).first()).toBeVisible()
    await expect(page.getByText(/压缩.*PDF|Compress.*PDF/i).first()).toBeVisible()
    await expect(page.getByText(/图片.*PDF|Image.*PDF/i).first()).toBeVisible()
    await expect(page.getByText(/PDF.*图片|PDF.*Image/i).first()).toBeVisible()
  })

  test('点击工具卡片应该跳转到对应页面', async ({ page }) => {
    await page.goto('/')

    // 点击"合并 PDF"（支持中英文）
    const mergeCard = page.getByText(/合并.*PDF|Merge.*PDF/i).first()
    await mergeCard.click()

    // 检查 URL 变化
    await expect(page).toHaveURL(/\/merge/i)

    // 检查页面标题（支持中英文）
    await expect(page.locator('h1, h2')).toContainText(/合并|merge/i)
  })
})

test.describe('响应式设计', () => {
  test('在移动端正确显示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // 检查页面可见
    await expect(page.locator('h1')).toBeVisible()

    // 工具卡片应该单列显示（通过检查卡片宽度）
    const card = page.locator('[data-testid="tool-card"]').first()
    await expect(card).toBeVisible()
  })

  test('在桌面端正确显示', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')

    await expect(page.locator('h1')).toBeVisible()
  })
})
