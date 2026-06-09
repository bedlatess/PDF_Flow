# E2E 测试说明

## 测试文件结构

```
tests/e2e/
├── home.spec.ts           # 首页测试
├── merge-pdf.spec.ts      # 合并 PDF 测试
├── split-pdf.spec.ts      # 拆分 PDF 测试
├── compress-pdf.spec.ts   # 压缩 PDF 测试
└── fixtures/              # 测试用 PDF 文件
    ├── sample1.pdf        # 小型测试文件 (~100KB)
    ├── sample2.pdf        # 小型测试文件 (~100KB)
    ├── multi-page.pdf     # 多页 PDF (5-10页)
    └── large.pdf          # 大文件测试 (~5MB)
```

## 准备测试数据

E2E 测试需要真实的 PDF 文件。你可以：

### 方法 1: 使用在线工具生成
- 访问 [PDF Generator](https://www.pdf-online.com/osa/generate.aspx)
- 生成简单的测试 PDF 文件

### 方法 2: 使用现有 PDF
- 将你的 PDF 文件复制到 `tests/fixtures/` 目录
- 重命名为对应的名称

### 方法 3: 使用脚本生成
```bash
# 安装 pdf-lib
npm install --save-dev pdf-lib

# 运行生成脚本
node tests/fixtures/generate-test-pdfs.js
```

## 运行测试

### 安装 Playwright 浏览器
```bash
npx playwright install
```

### 运行所有测试
```bash
npm run test:e2e
```

### 运行特定测试
```bash
npx playwright test home.spec.ts
```

### 调试模式
```bash
npx playwright test --debug
```

### UI 模式
```bash
npx playwright test --ui
```

### 只运行 Chromium
```bash
npx playwright test --project=chromium
```

## 查看测试报告

```bash
npx playwright show-report
```

## 注意事项

1. **测试前先构建**: E2E 测试运行在生产构建上
   ```bash
   npm run build
   ```

2. **端口占用**: 确保 4173 端口可用

3. **测试文件**: 确保 `fixtures/` 目录下有 PDF 文件

4. **超时设置**: 大文件处理可能需要增加超时时间

5. **data-testid**: 组件需要添加 `data-testid` 属性以便测试定位

## 添加测试 ID 到组件

在组件中添加 `data-testid` 属性：

```vue
<!-- DragDropZone.vue -->
<div data-testid="drag-drop-zone">
  <!-- ... -->
</div>

<!-- FilePreview.vue -->
<div data-testid="file-preview">
  <!-- ... -->
</div>

<!-- ProgressBar.vue -->
<div data-testid="progress-bar">
  <!-- ... -->
</div>
```

## 当前测试覆盖

- [x] 首页加载和导航
- [x] 合并 PDF 功能
- [x] 拆分 PDF 功能  
- [x] 压缩 PDF 功能
- [ ] 旋转 PDF 功能
- [ ] 图片转 PDF 功能
- [ ] PDF 转图片功能
- [ ] 响应式设计

## CI/CD 集成

GitHub Actions 示例:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```
