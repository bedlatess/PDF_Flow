import { defineConfig, devices } from '@playwright/test'

/**
 * E2E 测试配置
 * 参考文档: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e-playwright',

  /* 增加测试超时时间 */
  timeout: 60000, // 60秒

  /* 最大并行测试数 */
  fullyParallel: true,

  /* CI 环境下失败时不重试 */
  forbidOnly: !!process.env.CI,

  /* 重试失败的测试 */
  retries: process.env.CI ? 2 : 1,

  /* CI 环境下限制并行 worker 数量 */
  workers: process.env.CI ? 1 : 2,

  /* 测试报告配置 */
  reporter: 'html',

  /* 共享设置 */
  use: {
    /* 基础 URL */
    baseURL: 'http://localhost:4173',

    /* 增加动作超时 */
    actionTimeout: 15000, // 15秒

    /* 增加导航超时 */
    navigationTimeout: 30000, // 30秒

    /* 失败时截图 */
    screenshot: 'only-on-failure',

    /* 失败时录制视频 */
    video: 'retain-on-failure',

    /* 追踪配置 */
    trace: 'on-first-retry',
  },

  /* 配置多个浏览器项目 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* 移动端测试 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* 运行测试前启动开发服务器 */
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
