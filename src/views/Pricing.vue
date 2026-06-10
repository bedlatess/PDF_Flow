<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { computed } from 'vue'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'

const router = useRouter()
const userStore = useUserStore()

interface PricingTier {
  id: 'free' | 'pro' | 'enterprise'
  name: string
  price: string
  priceDetail: string
  description: string
  features: string[]
  limitations?: string[]
  cta: string
  ctaVariant: 'outline' | 'primary' | 'ghost'
  popular?: boolean
  current?: boolean
}

const isLoggedIn = computed(() => userStore.isAuthenticated)
const currentTier = computed(() => userStore.user?.role || 'free')

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: '免费版',
    price: '$0',
    priceDetail: '永久免费',
    description: '适合个人偶尔使用',
    features: [
      '✅ 6大PDF工具本地处理',
      '✅ 无限次数使用',
      '✅ 100% 隐私保护',
      '✅ 无需注册',
      '✅ 无广告',
    ],
    limitations: [
      '⚠️ 仅本地处理',
      '⚠️ 云端功能 3次/天',
      '⚠️ 文件大小限制 20MB',
    ],
    cta: currentTier.value === 'free' ? '当前套餐' : '开始使用',
    ctaVariant: 'outline',
    current: currentTier.value === 'free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.9',
    priceDetail: '/月 或 $79/年',
    description: '适合专业人士和团队',
    features: [
      '✅ 所有Free功能',
      '✅ 云端高级处理',
      '✅ OCR文字识别（10种语言）',
      '✅ 批量处理',
      '✅ 文件大小 500MB',
      '✅ 优先处理队列',
      '✅ Office转PDF（即将推出）',
      '✅ 邮件支持',
    ],
    cta: currentTier.value === 'pro' ? '当前套餐' : '升级到Pro',
    ctaVariant: 'primary',
    popular: true,
    current: currentTier.value === 'pro',
  },
  {
    id: 'enterprise',
    name: '企业版',
    price: '按需定价',
    priceDetail: '联系销售',
    description: '适合企业级应用',
    features: [
      '✅ 所有Pro功能',
      '✅ RESTful API访问',
      '✅ 无文件大小限制',
      '✅ 自定义处理流程',
      '✅ 专属技术支持',
      '✅ SLA保证',
      '✅ 数据处理协议（DPA）',
      '✅ AI文档智能（Gemini集成）',
    ],
    cta: currentTier.value === 'enterprise' ? '当前套餐' : '联系销售',
    ctaVariant: 'outline',
    current: currentTier.value === 'enterprise',
  },
]

const handleCTA = async (tier: PricingTier) => {
  if (tier.current) {
    // 当前套餐，跳转到个人中心
    router.push('/auth/profile')
    return
  }

  if (tier.id === 'free') {
    // 免费套餐，跳转到首页开始使用
    router.push('/')
    return
  }

  if (tier.id === 'pro') {
    // Pro套餐，检查登录状态
    if (!isLoggedIn.value) {
      // 未登录，跳转到登录页面
      router.push('/auth/login?redirect=/pricing')
      return
    }

    // 已登录，创建Stripe结账会话
    try {
      const { paymentAPI } = await import('@/services/api')

      const response = await paymentAPI.createCheckoutSession({
        plan: 'monthly', // 默认月付
        success_url: `${window.location.origin}/payment/success`,
        cancel_url: `${window.location.origin}/payment/cancel`
      })

      // 重定向到Stripe结账页面
      window.location.href = response.checkout_url
    } catch (error) {
      console.error('Failed to create checkout session:', error)
      alert('暂时无法发起支付，请稍后重试或联系管理员。')
    }
    return
  }

  if (tier.id === 'enterprise') {
    // Enterprise套餐，联系销售
    window.location.href = 'mailto:sales@pdf-flow.com?subject=Enterprise Plan Inquiry'
    return
  }
}
</script>

<template>
  <div class="pricing-page min-h-screen bg-background-light p-8 dark:bg-background-dark">
    <div class="mx-auto max-w-7xl">
      <!-- Header -->
      <div class="mb-12 text-center">
        <h1 class="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
          💎 选择适合您的套餐
        </h1>
        <p class="text-xl text-gray-600 dark:text-gray-300">
          灵活的定价，强大的功能，满足不同需求
        </p>
        <div class="mt-6 flex justify-center gap-4">
          <span class="inline-flex items-center rounded-lg bg-success/10 px-4 py-2 text-sm font-medium text-success">
            ✓ 7天无理由退款
          </span>
          <span class="inline-flex items-center rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            ✓ 随时取消订阅
          </span>
          <span class="inline-flex items-center rounded-lg bg-warning/10 px-4 py-2 text-sm font-medium text-warning">
            ✓ 数据安全保障
          </span>
        </div>
      </div>

      <!-- Pricing Cards -->
      <div class="grid gap-8 md:grid-cols-3">
        <div
          v-for="tier in pricingTiers"
          :key="tier.name"
          class="relative"
        >
          <!-- Popular Badge -->
          <div
            v-if="tier.popular"
            class="absolute -top-4 left-1/2 -translate-x-1/2 transform"
          >
            <span class="rounded-full bg-gradient-to-r from-primary to-purple-600 px-4 py-1 text-sm font-semibold text-white shadow-lg">
              🔥 最受欢迎
            </span>
          </div>

          <Card
            :class="[
              'h-full transition-all',
              tier.popular ? 'border-2 border-primary shadow-xl' : '',
              tier.current ? 'ring-2 ring-success' : ''
            ]"
          >
            <div class="flex h-full flex-col p-6">
              <!-- Tier Name -->
              <div class="mb-4">
                <h3 class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ tier.name }}
                </h3>
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {{ tier.description }}
                </p>
              </div>

              <!-- Price -->
              <div class="mb-6">
                <div class="flex items-baseline">
                  <span class="text-4xl font-extrabold text-gray-900 dark:text-white">
                    {{ tier.price }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-gray-500">
                  {{ tier.priceDetail }}
                </p>
              </div>

              <!-- Current Badge -->
              <div
                v-if="tier.current"
                class="mb-4 rounded-lg bg-success/10 px-3 py-2 text-center text-sm font-medium text-success"
              >
                ✓ 您当前的套餐
              </div>

              <!-- CTA Button -->
              <Button
                :variant="tier.ctaVariant"
                size="lg"
                full-width
                class="mb-6"
                @click="handleCTA(tier)"
              >
                {{ tier.cta }}
              </Button>

              <!-- Features -->
              <div class="flex-1">
                <h4 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  功能特性：
                </h4>
                <ul class="space-y-2">
                  <li
                    v-for="(feature, index) in tier.features"
                    :key="index"
                    class="flex items-start text-sm text-gray-600 dark:text-gray-300"
                  >
                    <span>{{ feature }}</span>
                  </li>
                </ul>

                <!-- Limitations -->
                <div
                  v-if="tier.limitations"
                  class="mt-4"
                >
                  <h4 class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-400">
                    限制：
                  </h4>
                  <ul class="space-y-1">
                    <li
                      v-for="(limitation, index) in tier.limitations"
                      :key="index"
                      class="text-xs text-gray-500 dark:text-gray-500"
                    >
                      {{ limitation }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <!-- FAQ Section -->
      <div class="mt-16">
        <h2 class="mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white">
          💬 常见问题
        </h2>
        <div class="grid gap-6 md:grid-cols-2">
          <Card>
            <div class="p-6">
              <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                如何升级到Pro套餐？
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                登录后点击"升级到Pro"按钮，选择月付或年付，通过Stripe安全支付即可立即激活。支持信用卡、PayPal等多种支付方式。
              </p>
            </div>
          </Card>

          <Card>
            <div class="p-6">
              <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                可以随时取消订阅吗？
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                可以！在个人中心随时取消订阅，取消后会继续享受服务至当前计费周期结束，不会产生额外费用。
              </p>
            </div>
          </Card>

          <Card>
            <div class="p-6">
              <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                数据安全如何保障？
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                我们采用端到端加密，临时文件自动删除，符合GDPR和CCPA标准。Pro和Enterprise用户享受DPA数据处理协议保护。
              </p>
            </div>
          </Card>

          <Card>
            <div class="p-6">
              <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                企业套餐有什么优势？
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                Enterprise提供API访问、无限文件大小、专属技术支持、SLA保证，适合需要集成到业务系统的企业客户。
              </p>
            </div>
          </Card>
        </div>
      </div>

      <!-- Trust Section -->
      <div class="mt-16 rounded-2xl bg-gradient-to-r from-primary/10 to-purple-500/10 p-8 text-center">
        <h3 class="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          🔒 值得信赖的PDF处理平台
        </h3>
        <p class="mb-6 text-gray-600 dark:text-gray-300">
          已为全球 <strong>100,000+</strong> 用户处理 <strong>10,000,000+</strong> 个PDF文件
        </p>
        <div class="flex flex-wrap justify-center gap-6">
          <div class="text-center">
            <div class="text-3xl font-bold text-primary">99.9%</div>
            <div class="text-sm text-gray-600">服务可用性</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-success">4.9/5</div>
            <div class="text-sm text-gray-600">用户评分</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-warning">&lt; 2s</div>
            <div class="text-sm text-gray-600">平均处理时间</div>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="mt-16 text-center">
        <p class="mb-4 text-lg text-gray-600 dark:text-gray-300">
          还没有账户？
        </p>
        <Button
          variant="primary"
          size="lg"
          @click="router.push('/auth/register')"
        >
          免费注册，立即开始
        </Button>
      </div>
    </div>
  </div>
</template>
