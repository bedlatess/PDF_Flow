# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: merge-pdf.spec.ts >> 合并 PDF 功能 >> 应该可以删除文件
- Location: tests\e2e-playwright\merge-pdf.spec.ts:54:3

# Error details

```
TimeoutError: page.waitForSelector: Timeout 20000ms exceeded.
Call log:
  - waiting for locator('[data-testid="file-preview"]') to be visible

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e6]:
      - generic [ref=e7] [cursor=pointer]:
        - img [ref=e9]
        - generic [ref=e11]: PDF-Flow
      - generic [ref=e12]:
        - combobox [ref=e13]:
          - option "English" [selected]
          - option "简体中文"
          - option "Español"
        - button [ref=e14] [cursor=pointer]:
          - img [ref=e15]
        - button "Home" [ref=e17] [cursor=pointer]
  - main [ref=e18]:
    - generic [ref=e20]:
      - generic [ref=e21]:
        - heading "Merge PDF" [level=1] [ref=e22]
        - paragraph [ref=e23]: Combine multiple PDFs into one
        - paragraph [ref=e24]: 💡 提示：拖拽文件卡片可以调整合并顺序
      - generic [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]:
            - heading "已选择 1 个文件" [level=2] [ref=e28]
            - paragraph [ref=e29]: 共 2 页
          - button "清空列表" [ref=e30] [cursor=pointer]
        - generic [ref=e32]:
          - generic [ref=e33]:
            - img [ref=e35]
            - generic [ref=e37]: "1"
            - generic [ref=e38]:
              - paragraph [ref=e39]: sample1.pdf
              - paragraph [ref=e40]: 2 页
            - button [ref=e41] [cursor=pointer]:
              - img [ref=e42]
          - generic [ref=e45]:
            - generic [ref=e46] [cursor=pointer]:
              - generic [ref=e47]:
                - generic [ref=e48]:
                  - img [ref=e49]
                  - paragraph [ref=e51]: 加载失败
                - generic [ref=e52]:
                  - button "Rotate" [ref=e53]:
                    - img [ref=e54]
                  - button "Remove" [ref=e56]:
                    - img [ref=e57]
              - generic [ref=e59]: Page 1
            - generic [ref=e60] [cursor=pointer]:
              - generic [ref=e61]:
                - generic [ref=e62]:
                  - img [ref=e63]
                  - paragraph [ref=e65]: 加载失败
                - generic [ref=e66]:
                  - button "Rotate" [ref=e67]:
                    - img [ref=e68]
                  - button "Remove" [ref=e70]:
                    - img [ref=e71]
              - generic [ref=e73]: Page 2
        - generic [ref=e74] [cursor=pointer]:
          - img [ref=e76]
          - generic [ref=e78]:
            - paragraph [ref=e79]: Drag & drop files here
            - paragraph [ref=e80]: 或点击选择文件
            - paragraph [ref=e81]: 支持 PDF 文件，最大 100MB
          - generic [ref=e83]: 🔒 100% Local Processing
          - paragraph [ref=e85]: 或继续添加更多文件
        - button "合并 PDF" [disabled] [ref=e87]
  - contentinfo [ref=e88]:
    - generic [ref=e89]:
      - generic [ref=e90]:
        - generic [ref=e91]:
          - generic [ref=e92]:
            - img [ref=e94]
            - generic [ref=e96]: PDF-Flow
          - paragraph [ref=e97]: Privacy-First PDF Tools
        - generic [ref=e98]:
          - heading "工具" [level=3] [ref=e99]
          - list [ref=e100]:
            - listitem [ref=e101]:
              - link "Merge PDF" [ref=e102] [cursor=pointer]:
                - /url: /tools/merge
            - listitem [ref=e103]:
              - link "Split PDF" [ref=e104] [cursor=pointer]:
                - /url: /tools/split
            - listitem [ref=e105]:
              - link "Rotate PDF" [ref=e106] [cursor=pointer]:
                - /url: /tools/rotate
        - generic [ref=e107]:
          - heading "关注我们" [level=3] [ref=e108]
          - generic [ref=e109]:
            - link "GitHub" [ref=e110] [cursor=pointer]:
              - /url: https://github.com
              - generic [ref=e111]: GitHub
              - img [ref=e112]
            - link "Twitter" [ref=e114] [cursor=pointer]:
              - /url: https://twitter.com
              - generic [ref=e115]: Twitter
              - img [ref=e116]
      - generic [ref=e118]:
        - paragraph [ref=e119]: © 2026 PDF-Flow. Made with ❤️ by PDF-Flow Team.
        - paragraph [ref=e120]:
          - link "Privacy Policy" [ref=e121] [cursor=pointer]:
            - /url: "#"
          - text: ·
          - link "Terms of Service" [ref=e122] [cursor=pointer]:
            - /url: "#"
```

# Test source

```ts
  1   | // 测试辅助函数
  2   | import { Page } from '@playwright/test'
  3   | 
  4   | /**
  5   |  * 等待 SPA 页面完全加载
  6   |  */
  7   | export async function waitForPageReady(page: Page): Promise<void> {
  8   |   await page.waitForLoadState('networkidle')
  9   | 
  10  |   // 等待主标题加载
  11  |   await page.waitForSelector('h1, h2', { timeout: 10000 })
  12  | 
  13  |   // 确保 Vue 应用已挂载
  14  |   await page.waitForFunction(() => {
  15  |     const app = document.querySelector('#app')
  16  |     return app && app.children.length > 0
  17  |   }, { timeout: 10000 })
  18  | }
  19  | 
  20  | /**
  21  |  * 上传文件并等待预览显示
  22  |  */
  23  | export async function uploadFile(page: Page, filePath: string): Promise<void> {
  24  |   // 等待拖拽区域加载
  25  |   await page.waitForSelector('[data-testid="drag-drop-zone"]', { timeout: 10000 })
  26  | 
  27  |   // 查找文件输入框
  28  |   const fileInput = page.locator('input[type="file"]')
  29  | 
  30  |   // 上传文件
  31  |   await fileInput.setInputFiles(filePath)
  32  | 
  33  |   // 等待文件预览显示，增加超时时间和重试
> 34  |   await page.waitForSelector('[data-testid="file-preview"]', {
      |              ^ TimeoutError: page.waitForSelector: Timeout 20000ms exceeded.
  35  |     timeout: 20000,
  36  |     state: 'visible'
  37  |   })
  38  | 
  39  |   // 额外等待确保文件完全加载
  40  |   await page.waitForTimeout(500)
  41  | }
  42  | 
  43  | /**
  44  |  * 等待多个文件上传
  45  |  */
  46  | export async function uploadMultipleFiles(page: Page, filePaths: string[]): Promise<void> {
  47  |   await page.waitForSelector('[data-testid="drag-drop-zone"]', { timeout: 10000 })
  48  | 
  49  |   const fileInput = page.locator('input[type="file"]')
  50  |   await fileInput.setInputFiles(filePaths)
  51  | 
  52  |   // 等待文件列表容器或成功提示出现
  53  |   // MergePDF 会显示 "已选择 X 个文件" 的提示
  54  |   try {
  55  |     await page.waitForSelector('text=/已选择.*个文件|Selected.*files/i', {
  56  |       timeout: 30000,
  57  |       state: 'visible'
  58  |     })
  59  |   } catch (error) {
  60  |     // 备选方案：等待 data-testid
  61  |     await page.waitForSelector('[data-testid="file-preview"]', {
  62  |       timeout: 10000,
  63  |       state: 'visible'
  64  |     })
  65  |   }
  66  | 
  67  |   // 额外等待确保所有文件完全加载
  68  |   await page.waitForTimeout(1000)
  69  | }
  70  | 
  71  | /**
  72  |  * 等待 PDF 处理完成
  73  |  */
  74  | export async function waitForProcessing(page: Page, timeoutMs: number = 30000): Promise<void> {
  75  |   // 等待进度条出现
  76  |   const progressBar = page.locator('[data-testid="progress-bar"]')
  77  | 
  78  |   try {
  79  |     await progressBar.waitFor({ state: 'visible', timeout: 5000 })
  80  |   } catch (error) {
  81  |     // 进度条可能立即完成，没出现
  82  |     return
  83  |   }
  84  | 
  85  |   // 等待进度条消失（处理完成）
  86  |   await progressBar.waitFor({
  87  |     state: 'hidden',
  88  |     timeout: timeoutMs
  89  |   })
  90  | }
  91  | 
  92  | /**
  93  |  * 等待模态对话框显示
  94  |  */
  95  | export async function waitForModal(page: Page): Promise<void> {
  96  |   await page.waitForSelector('[role="dialog"], .modal', {
  97  |     timeout: 5000,
  98  |     state: 'visible'
  99  |   })
  100 | }
  101 | 
  102 | /**
  103 |  * 关闭模态对话框
  104 |  */
  105 | export async function closeModal(page: Page): Promise<void> {
  106 |   const closeButton = page.locator('[role="dialog"] button, .modal button').filter({ hasText: /关闭|取消|Close|Cancel/i })
  107 |   await closeButton.first().click()
  108 | 
  109 |   await page.waitForSelector('[role="dialog"], .modal', {
  110 |     state: 'hidden',
  111 |     timeout: 5000
  112 |   })
  113 | }
  114 | 
  115 | /**
  116 |  * 等待下载开始
  117 |  */
  118 | export async function waitForDownload(page: Page): Promise<void> {
  119 |   const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
  120 |   await downloadPromise
  121 | }
  122 | 
  123 | /**
  124 |  * 检查工具页面是否正确加载
  125 |  */
  126 | export async function verifyToolPage(page: Page, toolName: string): Promise<void> {
  127 |   await waitForPageReady(page)
  128 | 
  129 |   // 检查 URL
  130 |   await page.waitForURL(new RegExp(toolName, 'i'))
  131 | 
  132 |   // 检查页面标题
  133 |   const heading = page.locator('h1, h2').first()
  134 |   await heading.waitFor({ state: 'visible', timeout: 5000 })
```