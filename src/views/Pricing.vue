<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  BadgeCheck,
  Crown,
  LockKeyhole,
  Receipt,
  Rocket,
  Sparkles,
  Users,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'

const router = useRouter()
const userStore = useUserStore()
const { t, locale } = useI18n()
const activeLocale = computed(() => locale.value)

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
  audience: string
  icon: unknown
  iconTone: string
}

const isLoggedIn = computed(() => userStore.isAuthenticated)
const currentTier = computed(() => userStore.user?.role || 'free')

const enterprisePrice = computed(() => {
  if (locale.value === 'zh') return '按需'
  if (locale.value === 'es') return 'A medida'
  return 'Custom'
})

const fitCards = computed(() => [
  {
    title: t('marketing.pricingPage.fit.freeTitle'),
    description: t('marketing.pricingPage.fit.freeDescription'),
    icon: Sparkles,
    tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  },
  {
    title: t('marketing.pricingPage.fit.proTitle'),
    description: t('marketing.pricingPage.fit.proDescription'),
    icon: Crown,
    tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  },
  {
    title: t('marketing.pricingPage.fit.enterpriseTitle'),
    description: t('marketing.pricingPage.fit.enterpriseDescription'),
    icon: Users,
    tone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  },
])

const pricingTiers = computed<PricingTier[]>(() => [
  {
    id: 'free',
    name: t('marketing.pricingPage.tiers.free.name'),
    price: '$0',
    priceDetail: t('marketing.pricingPage.tiers.free.priceDetail'),
    description: t('marketing.pricingPage.tiers.free.description'),
    audience: t('marketing.pricingPage.tiers.free.audience'),
    icon: Sparkles,
    iconTone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    features: [
      t('marketing.pricingPage.tiers.free.features.0'),
      t('marketing.pricingPage.tiers.free.features.1'),
      t('marketing.pricingPage.tiers.free.features.2'),
      t('marketing.pricingPage.tiers.free.features.3'),
    ],
    limitations: [
      t('marketing.pricingPage.tiers.free.limitations.0'),
      t('marketing.pricingPage.tiers.free.limitations.1'),
    ],
    cta: currentTier.value === 'free' ? t('marketing.pricingPage.currentPlan') : t('marketing.pricingPage.tiers.free.ctaDefault'),
    ctaVariant: 'outline',
    current: currentTier.value === 'free',
  },
  {
    id: 'pro',
    name: t('marketing.pricingPage.tiers.pro.name'),
    price: '$9.9',
    priceDetail: t('marketing.pricingPage.tiers.pro.priceDetail'),
    description: t('marketing.pricingPage.tiers.pro.description'),
    audience: t('marketing.pricingPage.tiers.pro.audience'),
    icon: Crown,
    iconTone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    features: [
      t('marketing.pricingPage.tiers.pro.features.0'),
      t('marketing.pricingPage.tiers.pro.features.1'),
      t('marketing.pricingPage.tiers.pro.features.2'),
      t('marketing.pricingPage.tiers.pro.features.3'),
      t('marketing.pricingPage.tiers.pro.features.4'),
    ],
    limitations: [t('marketing.pricingPage.tiers.pro.limitations.0')],
    cta: currentTier.value === 'pro' ? t('marketing.pricingPage.currentPlan') : t('marketing.pricingPage.tiers.pro.ctaDefault'),
    ctaVariant: 'primary',
    popular: true,
    current: currentTier.value === 'pro',
  },
  {
    id: 'enterprise',
    name: t('marketing.pricingPage.tiers.enterprise.name'),
    price: enterprisePrice.value,
    priceDetail: t('marketing.pricingPage.tiers.enterprise.priceDetail'),
    description: t('marketing.pricingPage.tiers.enterprise.description'),
    audience: t('marketing.pricingPage.tiers.enterprise.audience'),
    icon: Users,
    iconTone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
    features: [
      t('marketing.pricingPage.tiers.enterprise.features.0'),
      t('marketing.pricingPage.tiers.enterprise.features.1'),
      t('marketing.pricingPage.tiers.enterprise.features.2'),
      t('marketing.pricingPage.tiers.enterprise.features.3'),
    ],
    limitations: [t('marketing.pricingPage.tiers.enterprise.limitations.0')],
    cta: currentTier.value === 'enterprise' ? t('marketing.pricingPage.currentPlan') : t('marketing.pricingPage.tiers.enterprise.ctaDefault'),
    ctaVariant: 'outline',
    current: currentTier.value === 'enterprise',
  },
])

const faqItems = computed(() => [
  {
    icon: Rocket,
    title: t('marketing.pricingPage.faq.upgrade.q'),
    body: t('marketing.pricingPage.faq.upgrade.a'),
  },
  {
    icon: Receipt,
    title: t('marketing.pricingPage.faq.cancel.q'),
    body: t('marketing.pricingPage.faq.cancel.a'),
  },
  {
    icon: LockKeyhole,
    title: t('marketing.pricingPage.faq.security.q'),
    body: t('marketing.pricingPage.faq.security.a'),
  },
  {
    icon: BadgeCheck,
    title: t('marketing.pricingPage.faq.enterprise.q'),
    body: t('marketing.pricingPage.faq.enterprise.a'),
  },
])

const handleCTA = async (tier: PricingTier) => {
  if (tier.current) {
    router.push('/auth/profile')
    return
  }

  if (tier.id === 'free') {
    router.push('/')
    return
  }

  if (tier.id === 'pro') {
    if (!isLoggedIn.value) {
      router.push('/auth/login?redirect=/pricing')
      return
    }

    try {
      const { paymentAPI } = await import('@/services/api')
      const response = await paymentAPI.createCheckoutSession({
        plan: 'monthly',
        success_url: `${window.location.origin}/payment/success`,
        cancel_url: `${window.location.origin}/payment/cancel`,
      })
      window.location.href = response.checkout_url
    } catch (error) {
      console.error('Failed to create checkout session:', error)
      alert(t('marketing.pricingPage.alerts.paymentStartFailed'))
    }
    return
  }

  if (tier.id === 'enterprise') {
    window.location.href = 'mailto:sales@pdf-flow.com?subject=Enterprise Plan Inquiry'
  }
}
</script>

<template>
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_28%),radial-gradient(circle_at_100%_0%,rgba(14,165,233,0.1),transparent_24%),linear-gradient(180deg,#f8fffd_0%,#f8fafc_100%)] px-4 pb-20 pt-16 dark:bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_28%),radial-gradient(circle_at_100%_0%,rgba(14,165,233,0.1),transparent_24%),linear-gradient(180deg,#02110f_0%,#0f172a_100%)] sm:px-6 lg:px-8"
    :data-locale="activeLocale"
  >
    <div class="mx-auto max-w-7xl">
      <section class="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div class="rounded-[36px] border border-white/70 bg-white/86 p-8 shadow-2xl shadow-emerald-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/74 dark:shadow-none sm:p-10">
          <div class="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Sparkles class="h-4 w-4" />
            Pricing Brief
          </div>

          <h1 class="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {{ t('marketing.pricingPage.title') }}
          </h1>
          <p class="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ t('marketing.pricingPage.description') }}
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            <span class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <BadgeCheck class="h-4 w-4" />
              {{ t('marketing.pricingPage.badges.refund') }}
            </span>
            <span class="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
              <Receipt class="h-4 w-4" />
              {{ t('marketing.pricingPage.badges.cancel') }}
            </span>
            <span class="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              <LockKeyhole class="h-4 w-4" />
              {{ t('marketing.pricingPage.badges.security') }}
            </span>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <article
            v-for="card in fitCards"
            :key="card.title"
            class="rounded-[30px] border border-white/70 bg-white/82 p-6 shadow-lg shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/68 dark:shadow-none"
          >
            <div :class="['flex h-11 w-11 items-center justify-center rounded-2xl', card.tone]">
              <component :is="card.icon" class="h-5 w-5" />
            </div>
            <h2 class="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
              {{ card.title }}
            </h2>
            <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {{ card.description }}
            </p>
          </article>
        </div>
      </section>

      <section class="mt-10 grid gap-6 xl:grid-cols-3">
        <Card
          v-for="tier in pricingTiers"
          :key="tier.name"
          :class="[
            'relative overflow-hidden rounded-[34px] border border-white/70 bg-white/84 shadow-2xl shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/72 dark:shadow-none',
            tier.popular ? 'xl:-translate-y-3 xl:shadow-emerald-200/60 dark:xl:shadow-none' : '',
          ]"
          padding="none"
        >
          <div class="p-7">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div :class="['inline-flex h-12 w-12 items-center justify-center rounded-2xl', tier.iconTone]">
                  <component :is="tier.icon" class="h-5 w-5" />
                </div>
                <h2 class="mt-5 text-2xl font-semibold text-slate-950 dark:text-white">
                  {{ tier.name }}
                </h2>
                <p class="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {{ tier.audience }}
                </p>
              </div>

              <span
                v-if="tier.popular"
                class="rounded-full bg-[linear-gradient(135deg,#10b981_0%,#0ea5e9_100%)] px-3 py-1 text-xs font-semibold text-white shadow-lg"
              >
                {{ t('marketing.pricingPage.popular') }}
              </span>
            </div>

            <p class="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {{ tier.description }}
            </p>

            <div class="mt-6 rounded-[26px] bg-slate-50/90 px-5 py-5 dark:bg-slate-950/55">
              <div class="flex items-end gap-2">
                <span class="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {{ tier.price }}
                </span>
              </div>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {{ tier.priceDetail }}
              </p>
            </div>

            <div
              v-if="tier.current"
              class="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
            >
              {{ t('marketing.pricingPage.currentPlan') }}
            </div>

            <Button
              :variant="tier.ctaVariant"
              size="lg"
              full-width
              class="mt-5 rounded-2xl py-3.5"
              @click="handleCTA(tier)"
            >
              {{ tier.cta }}
            </Button>

            <div class="mt-6 space-y-5">
              <div>
                <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {{ t('marketing.pricingPage.featuresLabel') }}
                </h3>
                <ul class="mt-4 space-y-3">
                  <li
                    v-for="feature in tier.features"
                    :key="feature"
                    class="flex items-start gap-3"
                  >
                    <span class="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                      <BadgeCheck class="h-3.5 w-3.5" />
                    </span>
                    <span class="text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {{ feature }}
                    </span>
                  </li>
                </ul>
              </div>

              <div
                v-if="tier.limitations"
                class="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/45"
              >
                <h4 class="text-sm font-semibold text-slate-900 dark:text-white">
                  {{ t('marketing.pricingPage.limitationsLabel') }}
                </h4>
                <ul class="mt-3 space-y-2">
                  <li
                    v-for="limitation in tier.limitations"
                    :key="limitation"
                    class="text-xs leading-6 text-slate-500 dark:text-slate-400"
                  >
                    {{ limitation }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section class="mt-12 rounded-[36px] border border-white/70 bg-white/84 p-8 shadow-2xl shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/72 dark:shadow-none sm:p-10">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              FAQ
            </p>
            <h2 class="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
              {{ t('marketing.pricingPage.faqTitle') }}
            </h2>
          </div>
          <p class="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            {{ t('marketing.pricingPage.trust.description') }}
          </p>
        </div>

        <div class="mt-8 grid gap-4 md:grid-cols-2">
          <article
            v-for="item in faqItems"
            :key="item.title"
            class="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 dark:border-slate-800 dark:bg-slate-950/50"
          >
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white">
              <component :is="item.icon" class="h-5 w-5" />
            </div>
            <h3 class="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
              {{ item.title }}
            </h3>
            <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {{ item.body }}
            </p>
          </article>
        </div>
      </section>

      <section class="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="rounded-[36px] bg-[linear-gradient(135deg,#0f172a_0%,#0ea5e9_48%,#14b8a6_100%)] p-8 text-white shadow-2xl shadow-sky-900/15 sm:p-10">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
            Enterprise
          </p>
          <h2 class="mt-4 text-3xl font-semibold sm:text-4xl">
            {{ t('marketing.pricingPage.trust.title') }}
          </h2>
          <p class="mt-4 max-w-2xl text-sm leading-7 text-white/84 sm:text-base">
            {{ t('marketing.pricingPage.trust.description') }}
          </p>
          <div class="mt-8 flex flex-wrap gap-6">
            <div>
              <div class="text-3xl font-semibold">99.9%</div>
              <div class="mt-1 text-sm text-white/72">{{ t('marketing.pricingPage.trust.metrics.availability') }}</div>
            </div>
            <div>
              <div class="text-3xl font-semibold">4.9/5</div>
              <div class="mt-1 text-sm text-white/72">{{ t('marketing.pricingPage.trust.metrics.feedback') }}</div>
            </div>
            <div>
              <div class="text-3xl font-semibold">&lt; 2s</div>
              <div class="mt-1 text-sm text-white/72">{{ t('marketing.pricingPage.trust.metrics.processing') }}</div>
            </div>
          </div>
        </div>

        <div class="rounded-[36px] border border-white/70 bg-white/84 p-8 shadow-2xl shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/72 dark:shadow-none sm:p-10">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Join
          </p>
          <h2 class="mt-4 text-3xl font-semibold text-slate-950 dark:text-white">
            {{ t('marketing.pricingPage.bottomPrompt') }}
          </h2>
          <p class="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {{ t('marketing.pricingPage.bottomAction') }}
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="lg"
              class="rounded-full px-6"
              @click="router.push('/auth/register')"
            >
              {{ t('auth.signUp') }}
            </Button>
            <Button
              variant="outline"
              size="lg"
              class="rounded-full px-6"
              @click="router.push('/features')"
            >
              {{ t('nav.features') }}
            </Button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
