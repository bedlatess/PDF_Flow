<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Card from '@/components/common/Card.vue'

const { t } = useI18n()
const router = useRouter()

interface Tool {
  name: string
  title: string
  description: string
  icon: string
  route: string
  color: string
}

const tools: Tool[] = [
  {
    name: 'merge',
    title: t('tools.merge.title'),
    description: t('tools.merge.desc'),
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
    route: '/tools/merge',
    color: 'bg-blue-500',
  },
  {
    name: 'split',
    title: t('tools.split.title'),
    description: t('tools.split.desc'),
    icon: 'M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5',
    route: '/tools/split',
    color: 'bg-green-500',
  },
  {
    name: 'rotate',
    title: t('tools.rotate.title'),
    description: t('tools.rotate.desc'),
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    route: '/tools/rotate',
    color: 'bg-purple-500',
  },
  {
    name: 'compress',
    title: t('tools.compress.title'),
    description: t('tools.compress.desc'),
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    route: '/tools/compress',
    color: 'bg-indigo-500',
  },
  {
    name: 'imageToPdf',
    title: t('tools.imageToPdf.title'),
    description: t('tools.imageToPdf.desc'),
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    route: '/tools/image-to-pdf',
    color: 'bg-orange-500',
  },
  {
    name: 'pdfToImage',
    title: t('tools.pdfToImage.title'),
    description: t('tools.pdfToImage.desc'),
    icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    route: '/tools/pdf-to-image',
    color: 'bg-red-500',
  },
  {
    name: 'ocr',
    title: '📝 OCR 文字识别',
    description: '从 PDF 或图片中提取文字',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    route: '/tools/ocr',
    color: 'bg-pink-500',
  },
  {
    name: 'officeToPdf',
    title: t('tools.officeToPdf.title'),
    description: t('tools.officeToPdf.desc'),
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    route: '/tools/office-to-pdf',
    color: 'bg-teal-500',
  },
  {
    name: 'aiAnalyzer',
    title: '🤖 AI PDF 分析器',
    description: '智能摘要、问答、数据提取',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    route: '/tools/ai-analyzer',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
  },
  {
    name: 'watermark',
    title: t('tools.watermark.title'),
    description: t('tools.watermark.desc'),
    icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
    route: '/tools/watermark',
    color: 'bg-cyan-500',
  },
  {
    name: 'fillForm',
    title: t('tools.fillForm.title'),
    description: t('tools.fillForm.description'),
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    route: '/tools/fill-form',
    color: 'bg-emerald-500',
  },
  {
    name: 'annotate',
    title: t('tools.annotate.title'),
    description: t('tools.annotate.description'),
    icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
    route: '/tools/annotate',
    color: 'bg-amber-500',
  },
]

const navigateToTool = (route: string) => {
  router.push(route)
}
</script>

<template>
  <div class="home-container min-h-screen bg-background-light dark:bg-background-dark">
    <!-- Hero Section -->
    <section class="hero py-20">
      <div class="container mx-auto px-4">
        <div class="text-center">
          <h1 class="mb-4 text-5xl font-bold text-gray-900 dark:text-white">
            {{ t('app.title') }}
          </h1>
          <p class="mb-8 text-xl text-gray-600 dark:text-gray-300">
            {{ t('app.tagline') }}
          </p>
          <div class="flex justify-center gap-4">
            <span
              class="inline-flex items-center rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
            >
              {{ t('common.privacyBadge') }}
            </span>
            <span
              class="inline-flex items-center rounded-lg bg-success/10 px-4 py-2 text-sm font-medium text-success"
            >
              ⚡ 极速处理
            </span>
            <span
              class="inline-flex items-center rounded-lg bg-warning/10 px-4 py-2 text-sm font-medium text-warning"
            >
              🌍 支持 3 种语言
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Tools Grid -->
    <section class="tools-grid pb-20">
      <div class="container mx-auto px-4">
        <h2 class="mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white">
          选择工具开始使用
        </h2>

        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            v-for="tool in tools"
            :key="tool.name"
            data-testid="tool-card"
            variant="glass"
            hoverable
            clickable
            @click="navigateToTool(tool.route)"
          >
            <div class="flex flex-col items-center text-center">
              <!-- Icon -->
              <div
                :class="[
                  'mb-4 flex h-16 w-16 items-center justify-center rounded-full',
                  tool.color,
                  'text-white shadow-lg',
                ]"
              >
                <svg
                  class="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    :d="tool.icon"
                  />
                </svg>
              </div>

              <!-- Title -->
              <h3 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                {{ tool.title }}
              </h3>

              <!-- Description -->
              <p class="text-sm text-gray-600 dark:text-gray-300">
                {{ tool.description }}
              </p>

              <!-- Arrow -->
              <div class="mt-4 text-primary">
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features bg-white py-16 dark:bg-gray-900">
      <div class="container mx-auto px-4">
        <h2 class="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
          为什么选择 PDF-Flow？
        </h2>

        <div class="grid gap-8 md:grid-cols-3">
          <div class="text-center">
            <div class="mb-4 flex justify-center">
              <div class="rounded-full bg-primary/10 p-4">
                <svg
                  class="h-8 w-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              绝对隐私
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              所有处理都在您的浏览器中进行，文件不会上传到服务器
            </p>
          </div>

          <div class="text-center">
            <div class="mb-4 flex justify-center">
              <div class="rounded-full bg-success/10 p-4">
                <svg
                  class="h-8 w-8 text-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              极速处理
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              基于 WebAssembly 技术，处理速度极快
            </p>
          </div>

          <div class="text-center">
            <div class="mb-4 flex justify-center">
              <div class="rounded-full bg-warning/10 p-4">
                <svg
                  class="h-8 w-8 text-warning"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                  />
                </svg>
              </div>
            </div>
            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              完全免费
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              所有核心功能完全免费，无需注册登录
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
}

.dark .hero {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}
</style>
