<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  Building2,
  CheckCircle2,
  Cloud,
  Copy,
  CreditCard,
  Crown,
  FileText,
  LockKeyhole,
  QrCode,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import DiagnosticAlert from '@/components/common/DiagnosticAlert.vue'
import ProBadge from '@/components/common/ProBadge.vue'
import { useUserStore } from '@/stores/user'
import { formatUserFacingError, type FormattedUserError } from '@/utils/error-messages'
import type { PaymentProviderKey, PaymentProviderOption } from '@/services/api'

type PlanId = 'free' | 'pro' | 'enterprise'
type ButtonVariant = 'primary' | 'outline' | 'ghost'

interface Plan {
  id: PlanId
  name: string
  eyebrow: string
  price: string
  period: string
  description: string
  bestFor: string
  features: string[]
  notes: string[]
  cta: string
  variant: ButtonVariant
  highlighted?: boolean
  current?: boolean
}

interface PricingProofCopy {
  title: string
  body: string
}

interface PricingPageCopy {
  eyebrow: string
  title: string
  description: string
  freeName: string
  freeEyebrow: string
  freePeriod: string
  freeDescription: string
  freeBestFor: string
  freeCta: string
  proName: string
  proEyebrow: string
  proPeriod: string
  proDescription: string
  proBestFor: string
  proCta: string
  enterpriseName: string
  enterpriseEyebrow: string
  enterprisePrice: string
  enterprisePeriod: string
  enterpriseDescription: string
  enterpriseBestFor: string
  enterpriseCta: string
  currentPlan: string
  popular: string
  featuresLabel: string
  notesLabel: string
  cloudTitle: string
  cloudBody: string
  promiseTitle: string
  promiseBody: string
  faqTitle: string
  faqSubtitle: string
  ctaTitle: string
  ctaBody: string
  authHint: string
  paymentFailed: string
  paymentFailedTitle: string
  paymentFailedHint: string
  paymentMethodTitle: string
  paymentMethodSubtitle: string
  paymentProvidersLoading: string
  paymentProvidersRetry: string
  paymentProvidersFailedTitle: string
  paymentProvidersFailedMessage: string
  paymentProvidersFailedHint: string
  paymentNoProviders: string
  paymentProviderUnavailable: string
  paymentRedirectBadge: string
  paymentQrBadge: string
  paymentSubscriptionBadge: string
  paymentOneTimeBadge: string
  paymentQrTitle: string
  paymentQrMessage: string
  paymentQrCodeLabel: string
  paymentQrOpen: string
  paymentQrCopy: string
  paymentQrCopied: string
  paymentQrCopyFailed: string
  viewFeatures: string
  freeFeatures: string[]
  freeNotes: string[]
  proFeatures: string[]
  proNotes: string[]
  enterpriseFeatures: string[]
  enterpriseNotes: string[]
  proofCards: PricingProofCopy[]
  faq: [question: string, answer: string][]
}

const router = useRouter()
const userStore = useUserStore()
const { tm } = useI18n()
const checkoutLoadingPlan = ref<PlanId | null>(null)
const checkoutError = ref<FormattedUserError | null>(null)
const paymentProviders = ref<PaymentProviderOption[]>([])
const paymentProvidersLoading = ref(false)
const paymentProvidersError = ref<FormattedUserError | null>(null)
const selectedPaymentProvider = ref<PaymentProviderKey | null>(null)
const paymentCodeCopyState = ref<'idle' | 'copied' | 'failed'>('idle')
const qrCheckoutResult = ref<{
  provider: PaymentProviderKey
  displayName: string
  qrCodeUrl: string
  checkoutUrl: string
  merchantOrderId: string
  expiresAt?: string | null
} | null>(null)

const QR_PAYMENT_PROVIDERS = new Set<PaymentProviderKey>([
  'wechat',
  'tokenpay',
  'bepusdt',
  'epusdt',
  'okpay',
])

const currentTier = computed(() => userStore.user?.role || 'free')

const copy = computed(() => tm('pricing.page') as PricingPageCopy)

const plans = computed<Plan[]>(() => [
  {
    id: 'free',
    name: copy.value.freeName,
    eyebrow: copy.value.freeEyebrow,
    price: '$0',
    period: copy.value.freePeriod,
    description: copy.value.freeDescription,
    bestFor: copy.value.freeBestFor,
    features: copy.value.freeFeatures,
    notes: copy.value.freeNotes,
    cta: currentTier.value === 'free' ? copy.value.currentPlan : copy.value.freeCta,
    variant: 'outline',
    current: currentTier.value === 'free',
  },
  {
    id: 'pro',
    name: copy.value.proName,
    eyebrow: copy.value.proEyebrow,
    price: '$9.9',
    period: copy.value.proPeriod,
    description: copy.value.proDescription,
    bestFor: copy.value.proBestFor,
    features: copy.value.proFeatures,
    notes: copy.value.proNotes,
    cta: currentTier.value === 'pro' ? copy.value.currentPlan : copy.value.proCta,
    variant: 'primary',
    highlighted: true,
    current: currentTier.value === 'pro',
  },
  {
    id: 'enterprise',
    name: copy.value.enterpriseName,
    eyebrow: copy.value.enterpriseEyebrow,
    price: copy.value.enterprisePrice,
    period: copy.value.enterprisePeriod,
    description: copy.value.enterpriseDescription,
    bestFor: copy.value.enterpriseBestFor,
    features: copy.value.enterpriseFeatures,
    notes: copy.value.enterpriseNotes,
    cta: currentTier.value === 'enterprise' || currentTier.value === 'admin'
      ? copy.value.currentPlan
      : copy.value.enterpriseCta,
    variant: 'outline',
    current: currentTier.value === 'enterprise' || currentTier.value === 'admin',
  },
])

const proofIcons = [Zap, Cloud, ShieldCheck]
const proofCards = computed(() => copy.value.proofCards.map((card, index) => ({
  ...card,
  icon: proofIcons[index] || ShieldCheck,
})))

const enabledPaymentProviders = computed(() =>
  paymentProviders.value.filter((provider) => provider.enabled),
)

const selectedPaymentProviderOption = computed(() =>
  paymentProviders.value.find((provider) => provider.key === selectedPaymentProvider.value) || null,
)

const paymentActionDisabled = computed(() =>
  paymentProvidersLoading.value || !selectedPaymentProvider.value || enabledPaymentProviders.value.length === 0,
)

const providerBadge = (provider: PaymentProviderOption) => {
  if (QR_PAYMENT_PROVIDERS.has(provider.key)) {
    return copy.value.paymentQrBadge
  }

  return copy.value.paymentRedirectBadge
}

const providerSettlementLabel = (provider: PaymentProviderOption) =>
  provider.supports_subscription ? copy.value.paymentSubscriptionBadge : copy.value.paymentOneTimeBadge

const selectPaymentProvider = (provider: PaymentProviderOption) => {
  if (!provider.enabled) {
    return
  }

  selectedPaymentProvider.value = provider.key
  qrCheckoutResult.value = null
  paymentCodeCopyState.value = 'idle'
}

const loadPaymentProviders = async () => {
  paymentProvidersLoading.value = true
  paymentProvidersError.value = null

  try {
    const { paymentAPI } = await import('@/services/api')
    const response = await paymentAPI.listProviders()
    paymentProviders.value = response.providers
    const enabled = response.providers.filter((provider) => provider.enabled)
    const currentStillEnabled = enabled.some((provider) => provider.key === selectedPaymentProvider.value)
    if (!currentStillEnabled) {
      selectedPaymentProvider.value = enabled[0]?.key || null
    }
  } catch (error) {
    const formatted = formatUserFacingError(error, {
      area: 'GENERAL',
      fallbackTitle: copy.value.paymentProvidersFailedTitle,
      fallbackMessage: copy.value.paymentProvidersFailedMessage,
    })
    paymentProvidersError.value = {
      ...formatted,
      title: copy.value.paymentProvidersFailedTitle,
      message: copy.value.paymentProvidersFailedMessage,
    }
    paymentProviders.value = []
    selectedPaymentProvider.value = null
  } finally {
    paymentProvidersLoading.value = false
  }
}

const handleCTA = async (plan: Plan) => {
  checkoutError.value = null
  paymentCodeCopyState.value = 'idle'

  if (plan.current) {
    router.push('/auth/profile')
    return
  }

  if (plan.id === 'free') {
    router.push('/')
    return
  }

  if (plan.id === 'enterprise') {
    window.location.href = 'mailto:sales@pdf-flow.com?subject=PDF-Flow Enterprise'
    return
  }

  if (!userStore.isAuthenticated) {
    router.push('/auth/login?redirect=/pricing')
    return
  }

  try {
    checkoutLoadingPlan.value = plan.id
    qrCheckoutResult.value = null

    if (!selectedPaymentProvider.value) {
      await loadPaymentProviders()
    }

    if (!selectedPaymentProvider.value) {
      checkoutError.value = {
        title: copy.value.paymentProvidersFailedTitle,
        message: copy.value.paymentNoProviders,
        diagnosticCode: 'PF-GENERAL-PAYMENT-PROVIDER',
        supportHint: copy.value.paymentProvidersFailedHint,
      }
      checkoutLoadingPlan.value = null
      return
    }

    const { paymentAPI } = await import('@/services/api')
    const response = await paymentAPI.createCheckoutSession({
      plan: 'monthly',
      success_url: `${window.location.origin}/payment/success`,
      cancel_url: `${window.location.origin}/payment/cancel`,
      provider: selectedPaymentProvider.value,
    })

    if (response.qr_code_url) {
      qrCheckoutResult.value = {
        provider: response.provider,
        displayName: selectedPaymentProviderOption.value?.display_name || response.provider,
        qrCodeUrl: response.qr_code_url,
        checkoutUrl: response.checkout_url,
        merchantOrderId: response.merchant_order_id,
        expiresAt: response.expires_at,
      }
      checkoutLoadingPlan.value = null
      return
    }

    window.location.href = response.checkout_url
  } catch (error) {
    checkoutError.value = formatUserFacingError(error, {
      area: 'GENERAL',
      fallbackTitle: copy.value.paymentFailedTitle,
      fallbackMessage: copy.value.paymentFailed,
    })
    checkoutLoadingPlan.value = null
  }
}

const openQrCheckout = () => {
  if (qrCheckoutResult.value?.checkoutUrl) {
    window.location.href = qrCheckoutResult.value.checkoutUrl
  }
}

const copyPaymentCode = async () => {
  if (!qrCheckoutResult.value?.qrCodeUrl) {
    return
  }

  try {
    await navigator.clipboard.writeText(qrCheckoutResult.value.qrCodeUrl)
    paymentCodeCopyState.value = 'copied'
  } catch {
    paymentCodeCopyState.value = 'failed'
  }
}

onMounted(() => {
  void loadPaymentProviders()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-4 pb-20 pt-16 dark:bg-slate-950 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <section class="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
        <div class="rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:shadow-none sm:p-10">
          <div class="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
            <Receipt class="h-4 w-4" />
            {{ copy.eyebrow }}
          </div>
          <h1 class="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {{ copy.title }}
          </h1>
          <p class="mt-5 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ copy.description }}
          </p>

          <div class="mt-8 grid gap-3 sm:grid-cols-3">
            <article
              v-for="card in proofCards"
              :key="card.title"
              class="rounded-md border border-slate-200/80 bg-slate-50/82 p-4 dark:border-slate-800 dark:bg-slate-950/45"
            >
              <div class="flex h-10 w-10 items-center justify-center rounded-md bg-white text-sky-700 shadow-sm dark:bg-slate-900 dark:text-sky-300">
                <component :is="card.icon" class="h-5 w-5" />
              </div>
              <h2 class="mt-4 text-sm font-semibold text-slate-950 dark:text-white">
                {{ card.title }}
              </h2>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {{ card.body }}
              </p>
            </article>
          </div>
        </div>

        <aside class="rounded-lg bg-slate-950 p-8 text-white shadow-sm dark:bg-slate-900 sm:p-10">
          <div class="flex h-14 w-14 items-center justify-center rounded-lg bg-white/12 text-amber-100">
            <Crown class="h-6 w-6" />
          </div>
          <h2 class="mt-6 text-3xl font-semibold">
            {{ copy.promiseTitle }}
          </h2>
          <p class="mt-4 text-sm leading-7 text-white/78">
            {{ copy.promiseBody }}
          </p>
          <div class="mt-6 rounded-md border border-white/12 bg-white/10 p-5">
            <div class="flex items-center gap-2">
              <ProBadge tone="dark" />
              <span class="text-sm font-semibold">{{ copy.proBestFor }}</span>
            </div>
            <p class="mt-3 text-sm leading-7 text-white/76">
              {{ copy.cloudBody }}
            </p>
          </div>
        </aside>
      </section>

      <section class="mt-10 grid gap-6 xl:grid-cols-3">
        <article
          v-for="plan in plans"
          :key="plan.id"
          :class="[
            'relative overflow-hidden rounded-lg border bg-white p-7 shadow-sm dark:bg-slate-900',
            plan.highlighted
              ? 'border-amber-200 dark:border-amber-300/20 dark:shadow-none xl:-translate-y-3'
              : 'border-slate-200 dark:border-white/10 dark:shadow-none',
          ]"
        >
          <div
            v-if="plan.highlighted"
            class="absolute right-5 top-5 rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-sm"
          >
            {{ copy.popular }}
          </div>

          <div class="flex h-12 w-12 items-center justify-center rounded-md bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <ShieldCheck v-if="plan.id === 'free'" class="h-5 w-5" />
            <Crown v-else-if="plan.id === 'pro'" class="h-5 w-5" />
            <Building2 v-else class="h-5 w-5" />
          </div>

          <div class="mt-5 flex flex-wrap items-center gap-2">
            <h2 class="text-2xl font-semibold text-slate-950 dark:text-white">
              {{ plan.name }}
            </h2>
            <ProBadge v-if="plan.id === 'pro'" tone="ivory" />
          </div>
          <p class="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {{ plan.eyebrow }}
          </p>
          <p class="mt-4 min-h-[72px] text-sm leading-7 text-slate-600 dark:text-slate-300">
            {{ plan.description }}
          </p>

          <div class="mt-6 rounded-md bg-slate-50/90 p-5 dark:bg-slate-950/50">
            <div class="flex items-end gap-2">
              <span class="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {{ plan.price }}
              </span>
            </div>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {{ plan.period }}
            </p>
          </div>

          <div
            v-if="plan.current"
            class="mt-5 rounded-md bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            {{ copy.currentPlan }}
          </div>

          <div
            v-if="plan.id === 'pro' && !plan.current"
            class="mt-5 rounded-md border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/45"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <CreditCard class="h-4 w-4 text-amber-600 dark:text-amber-300" />
                  <h3 class="text-sm font-semibold text-slate-950 dark:text-white">
                    {{ copy.paymentMethodTitle }}
                  </h3>
                </div>
                <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {{ copy.paymentMethodSubtitle }}
                </p>
              </div>
              <button
                type="button"
                class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                :aria-label="copy.paymentProvidersRetry"
                :disabled="paymentProvidersLoading"
                @click="loadPaymentProviders"
              >
                <RefreshCw :class="['h-4 w-4', paymentProvidersLoading ? 'animate-spin' : '']" />
              </button>
            </div>

            <DiagnosticAlert
              v-if="paymentProvidersError"
              class="mt-4"
              :title="paymentProvidersError.title"
              :message="paymentProvidersError.message"
              :diagnostic-code="paymentProvidersError.diagnosticCode"
              :support-hint="copy.paymentProvidersFailedHint"
              tone="warning"
            />

            <div
              v-else-if="paymentProvidersLoading"
              class="mt-4 rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
            >
              {{ copy.paymentProvidersLoading }}
            </div>

            <div
              v-else-if="enabledPaymentProviders.length === 0"
              class="mt-4 rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
            >
              {{ copy.paymentNoProviders }}
            </div>

            <div
              v-else
              role="radiogroup"
              :aria-label="copy.paymentMethodTitle"
              class="mt-4 grid gap-2"
            >
              <button
                v-for="provider in paymentProviders"
                :key="provider.key"
                type="button"
                role="radio"
                :aria-checked="selectedPaymentProvider === provider.key"
                :disabled="!provider.enabled"
                :class="[
                  'flex min-h-[64px] w-full items-center justify-between gap-3 rounded-md border px-3 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500',
                  selectedPaymentProvider === provider.key
                    ? 'border-amber-300 bg-amber-50 text-slate-950 dark:border-amber-300/50 dark:bg-amber-400/10 dark:text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800',
                  !provider.enabled ? 'cursor-not-allowed opacity-50' : '',
                ]"
                @click="selectPaymentProvider(provider)"
              >
                <span class="flex min-w-0 items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                    <QrCode v-if="QR_PAYMENT_PROVIDERS.has(provider.key)" class="h-4 w-4" />
                    <CreditCard v-else class="h-4 w-4" />
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-semibold">
                      {{ provider.display_name }}
                    </span>
                    <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                      {{ provider.enabled ? providerSettlementLabel(provider) : copy.paymentProviderUnavailable }}
                    </span>
                  </span>
                </span>
                <span class="shrink-0 rounded-md border border-current/15 px-2.5 py-1 text-xs font-semibold">
                  {{ providerBadge(provider) }}
                </span>
              </button>
            </div>
          </div>

          <Button
            :variant="plan.variant"
            size="lg"
            full-width
            class="mt-5 rounded-md"
            :loading="checkoutLoadingPlan === plan.id"
            :disabled="plan.id === 'pro' && !plan.current && userStore.isAuthenticated && paymentActionDisabled"
            @click="handleCTA(plan)"
          >
            {{ plan.cta }}
          </Button>

          <DiagnosticAlert
            v-if="plan.id === 'pro' && checkoutError"
            class="mt-4"
            :title="checkoutError.title"
            :message="checkoutError.message"
            :diagnostic-code="checkoutError.diagnosticCode"
            :support-hint="copy.paymentFailedHint"
            tone="warning"
          />

          <div
            v-if="plan.id === 'pro' && qrCheckoutResult"
            class="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
          >
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm dark:bg-slate-950 dark:text-emerald-300">
                <QrCode class="h-5 w-5" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold">
                  {{ copy.paymentQrTitle }}
                </p>
                <p class="mt-1 text-sm leading-6 opacity-85">
                  {{ copy.paymentQrMessage }}
                </p>
              </div>
            </div>

            <div class="mt-4 rounded-md border border-emerald-200/80 bg-white p-3 dark:border-emerald-400/20 dark:bg-slate-950/70">
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                {{ copy.paymentQrCodeLabel }} · {{ qrCheckoutResult.displayName }}
              </p>
              <p class="mt-2 break-all font-mono text-xs leading-5 text-slate-700 dark:text-slate-200">
                {{ qrCheckoutResult.qrCodeUrl }}
              </p>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <Button
                v-if="qrCheckoutResult.checkoutUrl"
                variant="outline"
                size="sm"
                class="rounded-md border-emerald-700 text-emerald-800 hover:bg-emerald-700 hover:text-white dark:border-emerald-300 dark:text-emerald-200"
                @click="openQrCheckout"
              >
                {{ copy.paymentQrOpen }}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                class="rounded-md border border-emerald-700/20 bg-white/70 text-emerald-800 hover:bg-white dark:bg-slate-950/40 dark:text-emerald-200"
                @click="copyPaymentCode"
              >
                <Copy class="mr-2 h-4 w-4" />
                {{ paymentCodeCopyState === 'copied' ? copy.paymentQrCopied : copy.paymentQrCopy }}
              </Button>
            </div>

            <p
              v-if="paymentCodeCopyState === 'failed'"
              class="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-200"
            >
              {{ copy.paymentQrCopyFailed }}
            </p>
          </div>

          <div class="mt-7">
            <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {{ copy.featuresLabel }}
            </h3>
            <ul class="mt-4 space-y-3">
              <li
                v-for="feature in plan.features"
                :key="feature"
                class="flex items-start gap-3"
              >
                <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <span class="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ feature }}
                </span>
              </li>
            </ul>
          </div>

          <div class="mt-6 rounded-md border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <h3 class="text-sm font-semibold text-slate-950 dark:text-white">
              {{ copy.notesLabel }}: {{ plan.bestFor }}
            </h3>
            <ul class="mt-3 space-y-2">
              <li
                v-for="note in plan.notes"
                :key="note"
                class="text-xs leading-6 text-slate-500 dark:text-slate-400"
              >
                {{ note }}
              </li>
            </ul>
          </div>
        </article>
      </section>

      <section class="mt-12 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article class="rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:shadow-none sm:p-10">
          <div class="flex h-12 w-12 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
            <Cloud class="h-5 w-5" />
          </div>
          <h2 class="mt-5 text-2xl font-semibold text-slate-950 dark:text-white">
            {{ copy.cloudTitle }}
          </h2>
          <p class="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {{ copy.cloudBody }}
          </p>
        </article>

        <article class="rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:shadow-none sm:p-10">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                {{ copy.faqTitle }}
              </p>
              <h2 class="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                {{ copy.faqSubtitle }}
              </h2>
            </div>
            <div class="flex items-center gap-2 rounded-md bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
              <LockKeyhole class="h-4 w-4" />
              {{ copy.authHint }}
            </div>
          </div>

          <div class="mt-7 grid gap-4 md:grid-cols-2">
            <div
              v-for="[question, answer] in copy.faq"
              :key="question"
              class="rounded-md border border-slate-200/80 bg-slate-50/78 p-5 dark:border-slate-800 dark:bg-slate-950/45"
            >
              <h3 class="font-semibold text-slate-950 dark:text-white">
                {{ question }}
              </h3>
              <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {{ answer }}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section class="mt-12 rounded-lg bg-slate-950 p-8 text-white shadow-sm dark:bg-slate-900 sm:p-10">
        <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div class="inline-flex items-center gap-2 rounded-md bg-white/12 px-4 py-2 text-sm font-semibold">
              <Receipt class="h-4 w-4" />
              {{ copy.eyebrow }}
            </div>
            <h2 class="mt-5 text-3xl font-semibold sm:text-4xl">
              {{ copy.ctaTitle }}
            </h2>
            <p class="mt-4 max-w-3xl text-sm leading-7 text-white/82 sm:text-base">
              {{ copy.ctaBody }}
            </p>
          </div>
          <div class="flex flex-wrap gap-3 lg:justify-end">
            <Button variant="outline" size="lg" class="rounded-md border-white text-white hover:bg-white hover:text-slate-950" @click="router.push('/')">
              {{ copy.freeCta }}
            </Button>
            <Button variant="ghost" size="lg" class="rounded-md border border-white/20 bg-white/10 text-white hover:bg-white/18" @click="router.push('/features')">
              <FileText class="mr-2 h-4 w-4" />
              {{ copy.viewFeatures }}
            </Button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
