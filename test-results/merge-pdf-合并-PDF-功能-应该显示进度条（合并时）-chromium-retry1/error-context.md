# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: merge-pdf.spec.ts >> 合并 PDF 功能 >> 应该显示进度条（合并时）
- Location: tests\e2e-playwright\merge-pdf.spec.ts:99:3

# Error details

```
Error: locator.waitFor: state: expected one of (attached|detached|visible|hidden)
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
            - heading "已选择 2 个文件" [level=2] [ref=e28]
            - paragraph [ref=e29]: 共 5 页
          - button "清空列表" [ref=e30] [cursor=pointer]
        - generic [ref=e31]:
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
          - generic [ref=e74]:
            - generic [ref=e75]:
              - img [ref=e77]
              - generic [ref=e79]: "2"
              - generic [ref=e80]:
                - paragraph [ref=e81]: sample2.pdf
                - paragraph [ref=e82]: 3 页
              - button [ref=e83] [cursor=pointer]:
                - img [ref=e84]
            - generic [ref=e87]:
              - generic [ref=e88] [cursor=pointer]:
                - generic [ref=e89]:
                  - generic [ref=e90]:
                    - img [ref=e91]
                    - paragraph [ref=e93]: 加载失败
                  - generic [ref=e94]:
                    - button "Rotate" [ref=e95]:
                      - img [ref=e96]
                    - button "Remove" [ref=e98]:
                      - img [ref=e99]
                - generic [ref=e101]: Page 1
              - generic [ref=e102] [cursor=pointer]:
                - generic [ref=e103]:
                  - generic [ref=e104]:
                    - img [ref=e105]
                    - paragraph [ref=e107]: 加载失败
                  - generic [ref=e108]:
                    - button "Rotate" [ref=e109]:
                      - img [ref=e110]
                    - button "Remove" [ref=e112]:
                      - img [ref=e113]
                - generic [ref=e115]: Page 2
              - generic [ref=e116] [cursor=pointer]:
                - generic [ref=e117]:
                  - generic [ref=e118]:
                    - img [ref=e119]
                    - paragraph [ref=e121]: 加载失败
                  - generic [ref=e122]:
                    - button "Rotate" [ref=e123]:
                      - img [ref=e124]
                    - button "Remove" [ref=e126]:
                      - img [ref=e127]
                - generic [ref=e129]: Page 3
        - generic [ref=e130] [cursor=pointer]:
          - img [ref=e132]
          - generic [ref=e134]:
            - paragraph [ref=e135]: Drag & drop files here
            - paragraph [ref=e136]: 或点击选择文件
            - paragraph [ref=e137]: 支持 PDF 文件，最大 100MB
          - generic [ref=e139]: 🔒 100% Local Processing
          - paragraph [ref=e141]: 或继续添加更多文件
        - button "合并 PDF" [ref=e143] [cursor=pointer]
  - contentinfo [ref=e144]:
    - generic [ref=e145]:
      - generic [ref=e146]:
        - generic [ref=e147]:
          - generic [ref=e148]:
            - img [ref=e150]
            - generic [ref=e152]: PDF-Flow
          - paragraph [ref=e153]: Privacy-First PDF Tools
        - generic [ref=e154]:
          - heading "工具" [level=3] [ref=e155]
          - list [ref=e156]:
            - listitem [ref=e157]:
              - link "Merge PDF" [ref=e158] [cursor=pointer]:
                - /url: /tools/merge
            - listitem [ref=e159]:
              - link "Split PDF" [ref=e160] [cursor=pointer]:
                - /url: /tools/split
            - listitem [ref=e161]:
              - link "Rotate PDF" [ref=e162] [cursor=pointer]:
                - /url: /tools/rotate
        - generic [ref=e163]:
          - heading "关注我们" [level=3] [ref=e164]
          - generic [ref=e165]:
            - link "GitHub" [ref=e166] [cursor=pointer]:
              - /url: https://github.com
              - generic [ref=e167]: GitHub
              - img [ref=e168]
            - link "Twitter" [ref=e170] [cursor=pointer]:
              - /url: https://twitter.com
              - generic [ref=e171]: Twitter
              - img [ref=e172]
      - generic [ref=e174]:
        - paragraph [ref=e175]: © 2026 PDF-Flow. Made with ❤️ by PDF-Flow Team.
        - paragraph [ref=e176]:
          - link "Privacy Policy" [ref=e177] [cursor=pointer]:
            - /url: "#"
          - text: ·
          - link "Terms of Service" [ref=e178] [cursor=pointer]:
            - /url: "#"
```

# Test source

```ts
  9   | test.describe('合并 PDF 功能', () => {
  10  |   test.beforeEach(async ({ page }) => {
  11  |     await page.goto('/tools/merge')
  12  |     await waitForPageReady(page)
  13  |   })
  14  | 
  15  |   test('应该显示合并 PDF 页面', async ({ page }) => {
  16  |     await expect(page).toHaveURL(/\/merge/i)
  17  |     const heading = page.locator('h1').first()
  18  |     // 支持多语言：中文"合并"或英文"Merge"
  19  |     await expect(heading).toContainText(/合并|merge/i)
  20  |   })
  21  | 
  22  |   test('应该显示拖拽上传区域', async ({ page }) => {
  23  |     const dropZone = page.locator('[data-testid="drag-drop-zone"]')
  24  |     await expect(dropZone).toBeVisible({ timeout: 10000 })
  25  |   })
  26  | 
  27  |   test('应该可以上传 PDF 文件', async ({ page }) => {
  28  |     const filePaths = [
  29  |       path.join(__dirname, '../fixtures/sample1.pdf'),
  30  |       path.join(__dirname, '../fixtures/sample2.pdf'),
  31  |     ]
  32  | 
  33  |     await uploadMultipleFiles(page, filePaths)
  34  | 
  35  |     // 检查文件列表提示
  36  |     await expect(page.locator('text=/已选择.*2.*个文件/i')).toBeVisible({ timeout: 10000 })
  37  |   })
  38  | 
  39  |   test('应该可以重新排序文件', async ({ page }) => {
  40  |     const filePaths = [
  41  |       path.join(__dirname, '../fixtures/sample1.pdf'),
  42  |       path.join(__dirname, '../fixtures/sample2.pdf'),
  43  |     ]
  44  | 
  45  |     await uploadMultipleFiles(page, filePaths)
  46  | 
  47  |     // 等待文件加载
  48  |     await page.waitForTimeout(500)
  49  | 
  50  |     // 检查文件列表存在
  51  |     await expect(page.locator('text=/已选择.*2.*个文件/i')).toBeVisible()
  52  |   })
  53  | 
  54  |   test('应该可以删除文件', async ({ page }) => {
  55  |     await uploadFile(page, path.join(__dirname, '../fixtures/sample1.pdf'))
  56  | 
  57  |     // 等待文件加载
  58  |     await page.waitForTimeout(500)
  59  | 
  60  |     // 查找并点击删除按钮（SVG 图标）
  61  |     const deleteButton = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' }).first()
  62  |     await deleteButton.click()
  63  | 
  64  |     // 检查文件被删除 - 应该重新显示拖拽区域
  65  |     await expect(page.locator('[data-testid="drag-drop-zone"]')).toBeVisible({ timeout: 5000 })
  66  |   })
  67  | 
  68  |   test('应该显示合并按钮', async ({ page }) => {
  69  |     // 上传文件后才会显示合并按钮
  70  |     await uploadFile(page, path.join(__dirname, '../fixtures/sample1.pdf'))
  71  | 
  72  |     const mergeButton = page.getByRole('button', { name: /合并 PDF|Merge PDF/i })
  73  |     await expect(mergeButton).toBeVisible({ timeout: 10000 })
  74  |   })
  75  | 
  76  |   test('初始状态合并按钮应该禁用', async ({ page }) => {
  77  |     // 只上传一个文件，按钮应该禁用（需要至少2个文件）
  78  |     await uploadFile(page, path.join(__dirname, '../fixtures/sample1.pdf'))
  79  | 
  80  |     const mergeButton = page.getByRole('button', { name: /合并 PDF|Merge PDF/i })
  81  |     await expect(mergeButton).toBeDisabled({ timeout: 10000 })
  82  |   })
  83  | 
  84  |   test('上传文件后合并按钮应该启用', async ({ page }) => {
  85  |     const filePaths = [
  86  |       path.join(__dirname, '../fixtures/sample1.pdf'),
  87  |       path.join(__dirname, '../fixtures/sample2.pdf'),
  88  |     ]
  89  | 
  90  |     await uploadMultipleFiles(page, filePaths)
  91  | 
  92  |     // 等待一下确保状态更新
  93  |     await page.waitForTimeout(500)
  94  | 
  95  |     const mergeButton = page.getByRole('button', { name: /合并 PDF|Merge PDF/i })
  96  |     await expect(mergeButton).toBeEnabled({ timeout: 10000 })
  97  |   })
  98  | 
  99  |   test('应该显示进度条（合并时）', async ({ page }) => {
  100 |     const filePaths = [
  101 |       path.join(__dirname, '../fixtures/sample1.pdf'),
  102 |       path.join(__dirname, '../fixtures/sample2.pdf'),
  103 |     ]
  104 | 
  105 |     await uploadMultipleFiles(page, filePaths)
  106 | 
  107 |     // 点击合并
  108 |     const mergeButton = page.getByRole('button', { name: /合并 PDF|Merge PDF/i })
> 109 |     await mergeButton.waitFor({ state: 'enabled', timeout: 10000 })
      |                       ^ Error: locator.waitFor: state: expected one of (attached|detached|visible|hidden)
  110 |     await mergeButton.click()
  111 | 
  112 |     // 检查进度条显示（可能很快消失）
  113 |     const progressBar = page.locator('[data-testid="progress-bar"]')
  114 | 
  115 |     // 使用 or 逻辑：要么看到进度条，要么直接看到成功提示
  116 |     const progressOrSuccess = page.locator('[data-testid="progress-bar"], text=/成功|完成/i').first()
  117 |     await expect(progressOrSuccess).toBeVisible({ timeout: 15000 })
  118 |   })
  119 | })
  120 | 
```