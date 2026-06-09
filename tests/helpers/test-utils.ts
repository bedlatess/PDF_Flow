// 测试辅助函数
import { Page } from '@playwright/test'

/**
 * 等待 SPA 页面完全加载
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')

  // 等待主标题加载
  await page.waitForSelector('h1, h2', { timeout: 10000 })

  // 确保 Vue 应用已挂载
  await page.waitForFunction(() => {
    const app = document.querySelector('#app')
    return app && app.children.length > 0
  }, { timeout: 10000 })
}

/**
 * 上传文件并等待预览显示
 */
export async function uploadFile(page: Page, filePath: string): Promise<void> {
  // 等待拖拽区域加载
  await page.waitForSelector('[data-testid="drag-drop-zone"]', { timeout: 10000 })

  // 查找文件输入框
  const fileInput = page.locator('input[type="file"]')

  // 上传文件
  await fileInput.setInputFiles(filePath)

  // 等待文件预览显示，增加超时时间和重试
  await page.waitForSelector('[data-testid="file-preview"]', {
    timeout: 20000,
    state: 'visible'
  })

  // 额外等待确保文件完全加载
  await page.waitForTimeout(500)
}

/**
 * 等待多个文件上传
 */
export async function uploadMultipleFiles(page: Page, filePaths: string[]): Promise<void> {
  await page.waitForSelector('[data-testid="drag-drop-zone"]', { timeout: 10000 })

  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(filePaths)

  // 等待文件列表容器或成功提示出现
  // MergePDF 会显示 "已选择 X 个文件" 的提示
  try {
    await page.waitForSelector('text=/已选择.*个文件|Selected.*files/i', {
      timeout: 30000,
      state: 'visible'
    })
  } catch (error) {
    // 备选方案：等待 data-testid
    await page.waitForSelector('[data-testid="file-preview"]', {
      timeout: 10000,
      state: 'visible'
    })
  }

  // 额外等待确保所有文件完全加载
  await page.waitForTimeout(1000)
}

/**
 * 等待 PDF 处理完成
 */
export async function waitForProcessing(page: Page, timeoutMs: number = 30000): Promise<void> {
  // 等待进度条出现
  const progressBar = page.locator('[data-testid="progress-bar"]')

  try {
    await progressBar.waitFor({ state: 'visible', timeout: 5000 })
  } catch (error) {
    // 进度条可能立即完成，没出现
    return
  }

  // 等待进度条消失（处理完成）
  await progressBar.waitFor({
    state: 'hidden',
    timeout: timeoutMs
  })
}

/**
 * 等待模态对话框显示
 */
export async function waitForModal(page: Page): Promise<void> {
  await page.waitForSelector('[role="dialog"], .modal', {
    timeout: 5000,
    state: 'visible'
  })
}

/**
 * 关闭模态对话框
 */
export async function closeModal(page: Page): Promise<void> {
  const closeButton = page.locator('[role="dialog"] button, .modal button').filter({ hasText: /关闭|取消|Close|Cancel/i })
  await closeButton.first().click()

  await page.waitForSelector('[role="dialog"], .modal', {
    state: 'hidden',
    timeout: 5000
  })
}

/**
 * 等待下载开始
 */
export async function waitForDownload(page: Page): Promise<void> {
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
  await downloadPromise
}

/**
 * 检查工具页面是否正确加载
 */
export async function verifyToolPage(page: Page, toolName: string): Promise<void> {
  await waitForPageReady(page)

  // 检查 URL
  await page.waitForURL(new RegExp(toolName, 'i'))

  // 检查页面标题
  const heading = page.locator('h1, h2').first()
  await heading.waitFor({ state: 'visible', timeout: 5000 })

  // 检查拖拽区域
  const dropZone = page.locator('[data-testid="drag-drop-zone"]')
  await dropZone.waitFor({ state: 'visible', timeout: 5000 })
}

/**
 * 等待缩略图加载
 */
export async function waitForThumbnails(page: Page, minCount: number = 1): Promise<void> {
  await page.waitForFunction(
    (count) => {
      const thumbnails = document.querySelectorAll('[data-testid="page-thumbnail"]')
      return thumbnails.length >= count
    },
    minCount,
    { timeout: 15000 }
  )
}

/**
 * 选择页面缩略图
 */
export async function selectThumbnails(page: Page, indices: number[]): Promise<void> {
  for (const index of indices) {
    const thumbnail = page.locator('[data-testid="page-thumbnail"]').nth(index)
    await thumbnail.click()
    await page.waitForTimeout(100) // 短暂延迟，确保选中状态更新
  }
}

/**
 * 输入页面范围
 */
export async function inputPageRange(page: Page, range: string): Promise<void> {
  const rangeInput = page.locator('input[placeholder*="页码"], input[placeholder*="范围"], input[placeholder*="page"]')
  await rangeInput.waitFor({ state: 'visible', timeout: 5000 })
  await rangeInput.fill(range)
}

/**
 * 点击处理按钮（合并/拆分/压缩等）
 */
export async function clickProcessButton(page: Page, buttonText: string): Promise<void> {
  const button = page.getByRole('button', { name: new RegExp(buttonText, 'i') })
  await button.waitFor({ state: 'visible', timeout: 5000 })
  await button.click()
}

/**
 * 等待成功提示
 */
export async function waitForSuccess(page: Page): Promise<void> {
  await page.waitForSelector('text=/成功|完成|Success|Complete/i', {
    timeout: 5000,
    state: 'visible'
  })
}

/**
 * 等待错误提示
 */
export async function waitForError(page: Page): Promise<void> {
  await page.waitForSelector('text=/错误|失败|Error|Failed/i', {
    timeout: 5000,
    state: 'visible'
  })
}
