<script setup lang="ts">
import { useRouter } from 'vue-router'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'

const router = useRouter()

interface Feature {
  icon: string
  title: string
  description: string
  details: string[]
}

const coreFeatures: Feature[] = [
  {
    icon: '🔒',
    title: '100% 隐私保护',
    description: '本地处理优先，文件不离开您的设备',
    details: [
      '基础工具完全在浏览器本地运行',
      '无需上传文件到服务器',
      '处理完成后自动清理临时数据',
      '符合GDPR和CCPA隐私标准',
    ],
  },
  {
    icon: '⚡',
    title: '极速处理',
    description: 'Web Workers多线程技术，处理不阻塞界面',
    details: [
      '后台异步处理，UI响应流畅',
      '实时进度反馈',
      'WebSocket实时推送',
      '平均处理时间 < 2秒',
    ],
  },
  {
    icon: '☁️',
    title: '云端增强',
    description: 'Pro用户享受云端高级处理能力',
    details: [
      'OCR文字识别（10种语言）',
      '大文件处理（最高500MB）',
      '批量处理任务',
      'Office转PDF（即将推出）',
    ],
  },
  {
    icon: '🎨',
    title: '现代化设计',
    description: '精致的用户界面，完美适配各种设备',
    details: [
      '响应式设计，手机/平板/桌面完美适配',
      '深色模式支持',
      '直观的拖拽操作',
      '实时预览功能',
    ],
  },
  {
    icon: '🌍',
    title: '多语言支持',
    description: '支持英语、简体中文、西班牙语',
    details: [
      '界面多语言切换',
      'OCR支持10种语言识别',
      '持续扩展语言支持',
      '本地化用户体验',
    ],
  },
  {
    icon: '🔧',
    title: '强大工具集',
    description: '7大PDF工具，满足日常所有需求',
    details: [
      '合并PDF - 多文件合并',
      '拆分PDF - 页面提取',
      '旋转PDF - 角度调整',
      '压缩PDF - 减小文件大小',
      '图片转PDF - 批量转换',
      'PDF转图片 - 高清导出',
      'OCR识别 - 文字提取',
    ],
  },
]

const technicalFeatures = [
  {
    icon: '🚀',
    title: '前沿技术栈',
    items: ['Vue 3 + TypeScript', 'FastAPI + PostgreSQL', 'Redis + Celery', 'WebSocket实时通信'],
  },
  {
    icon: '🔐',
    title: '企业级安全',
    items: ['JWT认证', 'STRIDE威胁模型', 'API限流保护', '审计日志只读'],
  },
  {
    icon: '📊',
    title: '性能优化',
    items: ['代码分割', '懒加载', 'Service Worker缓存', '首屏加载 < 1.5s'],
  },
  {
    icon: '🧪',
    title: '质量保证',
    items: ['108个单元测试', 'E2E自动化测试', '持续集成部署', '99.9%服务可用性'],
  },
]
</script>

<template>
  <div class="features-page min-h-screen bg-background-light dark:bg-background-dark">
    <!-- Hero Section -->
    <div class="bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 py-20">
      <div class="container mx-auto px-4 text-center">
        <h1 class="mb-4 text-5xl font-bold text-gray-900 dark:text-white">
          🚀 功能特性
        </h1>
        <p class="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-300">
          隐私优先、极速处理、功能强大的现代化PDF工具平台
        </p>
        <div class="mt-8 flex justify-center gap-4">
          <Button
            variant="primary"
            size="lg"
            @click="router.push('/')"
          >
            开始使用
          </Button>
          <Button
            variant="outline"
            size="lg"
            @click="router.push('/pricing')"
          >
            查看定价
          </Button>
        </div>
      </div>
    </div>

    <!-- Core Features -->
    <div class="container mx-auto px-4 py-16">
      <div class="mb-12 text-center">
        <h2 class="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
          💎 核心特性
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-300">
          为什么选择 PDF-Flow？
        </p>
      </div>

      <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="feature in coreFeatures"
          :key="feature.title"
          class="transition-all hover:shadow-xl"
        >
          <div class="p-6">
            <div class="mb-4 text-5xl">
              {{ feature.icon }}
            </div>
            <h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              {{ feature.title }}
            </h3>
            <p class="mb-4 text-gray-600 dark:text-gray-400">
              {{ feature.description }}
            </p>
            <ul class="space-y-2">
              <li
                v-for="detail in feature.details"
                :key="detail"
                class="flex items-start text-sm text-gray-600 dark:text-gray-300"
              >
                <span class="mr-2 text-success">✓</span>
                <span>{{ detail }}</span>
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </div>

    <!-- Technical Features -->
    <div class="bg-gray-50 py-16 dark:bg-gray-900">
      <div class="container mx-auto px-4">
        <div class="mb-12 text-center">
          <h2 class="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
            ⚙️ 技术实力
          </h2>
          <p class="text-lg text-gray-600 dark:text-gray-300">
            前沿技术栈，企业级架构
          </p>
        </div>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card
            v-for="tech in technicalFeatures"
            :key="tech.title"
          >
            <div class="p-6 text-center">
              <div class="mb-4 text-4xl">
                {{ tech.icon }}
              </div>
              <h3 class="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                {{ tech.title }}
              </h3>
              <ul class="space-y-2">
                <li
                  v-for="item in tech.items"
                  :key="item"
                  class="text-sm text-gray-600 dark:text-gray-400"
                >
                  {{ item }}
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>

    <!-- Comparison Section -->
    <div class="container mx-auto px-4 py-16">
      <div class="mb-12 text-center">
        <h2 class="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
          📊 与竞品对比
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-300">
          为什么 PDF-Flow 是更好的选择？
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b-2 border-gray-200 dark:border-gray-700">
              <th class="p-4 text-left text-gray-900 dark:text-white">功能</th>
              <th class="p-4 text-center">
                <div class="font-bold text-primary">PDF-Flow</div>
              </th>
              <th class="p-4 text-center text-gray-600 dark:text-gray-400">竞品A</th>
              <th class="p-4 text-center text-gray-600 dark:text-gray-400">竞品B</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <td class="p-4">本地处理（隐私保护）</td>
              <td class="p-4 text-center text-success text-2xl">✓</td>
              <td class="p-4 text-center text-error text-2xl">✗</td>
              <td class="p-4 text-center text-error text-2xl">✗</td>
            </tr>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <td class="p-4">免费使用基础功能</td>
              <td class="p-4 text-center text-success text-2xl">✓</td>
              <td class="p-4 text-center text-warning text-xl">部分</td>
              <td class="p-4 text-center text-error text-2xl">✗</td>
            </tr>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <td class="p-4">WebSocket实时进度</td>
              <td class="p-4 text-center text-success text-2xl">✓</td>
              <td class="p-4 text-center text-error text-2xl">✗</td>
              <td class="p-4 text-center text-error text-2xl">✗</td>
            </tr>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <td class="p-4">OCR文字识别</td>
              <td class="p-4 text-center text-success text-2xl">✓</td>
              <td class="p-4 text-center text-success text-2xl">✓</td>
              <td class="p-4 text-center text-warning text-xl">付费</td>
            </tr>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <td class="p-4">开源透明</td>
              <td class="p-4 text-center text-success text-2xl">✓</td>
              <td class="p-4 text-center text-error text-2xl">✗</td>
              <td class="p-4 text-center text-error text-2xl">✗</td>
            </tr>
            <tr>
              <td class="p-4">企业API访问</td>
              <td class="p-4 text-center text-success text-2xl">✓</td>
              <td class="p-4 text-center text-warning text-xl">高价</td>
              <td class="p-4 text-center text-success text-2xl">✓</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="bg-gradient-to-r from-primary to-purple-600 py-16 text-white">
      <div class="container mx-auto px-4 text-center">
        <h2 class="mb-4 text-3xl font-bold">
          准备好体验了吗？
        </h2>
        <p class="mb-8 text-xl opacity-90">
          注册即可免费使用所有基础功能，无需信用卡
        </p>
        <div class="flex justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            class="border-white text-white hover:bg-white hover:text-primary"
            @click="router.push('/auth/register')"
          >
            免费注册
          </Button>
          <Button
            variant="ghost"
            size="lg"
            class="text-white hover:bg-white/10"
            @click="router.push('/pricing')"
          >
            查看定价 →
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
