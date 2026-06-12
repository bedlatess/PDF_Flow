<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-bold text-slate-900 dark:text-white">
      {{ t('enterprise.billing.title') }}
    </h2>

    <div
      v-if="errorState"
      class="space-y-3"
    >
      <DiagnosticAlert
        :title="errorState.title"
        :message="errorState.message"
        :diagnostic-code="errorState.diagnosticCode"
        :support-hint="t('enterprise.billing.failureHint')"
        tone="warning"
      />
      <Button
        variant="outline"
        size="sm"
        :loading="loading"
        @click="loadBillingStats"
      >
        {{ t('enterprise.billing.retry') }}
      </Button>
    </div>

    <div v-if="loading" class="space-y-4">
      <Skeleton class="h-44 w-full" />
      <Skeleton class="h-28 w-full" />
    </div>

    <!-- Current Period Stats -->
    <div v-if="billingStats" class="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        {{ t('enterprise.billing.currentPeriod') }}
      </h3>
      <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
        {{ formatDate(billingStats.current_period_start) }} - {{ formatDate(billingStats.current_period_end) }}
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Token Usage -->
        <div>
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {{ t('enterprise.billing.tokenUsage') }}
          </p>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-slate-600 dark:text-slate-400">{{ t('enterprise.billing.used') }}</span>
              <span class="font-semibold text-slate-900 dark:text-white">
                {{ billingStats.tokens_used.toLocaleString() }}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-600 dark:text-slate-400">{{ t('enterprise.billing.included') }}</span>
              <span class="font-semibold text-slate-900 dark:text-white">
                {{ billingStats.tokens_included.toLocaleString() }}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-600 dark:text-slate-400">{{ t('enterprise.billing.overage') }}</span>
              <span class="font-semibold" :class="billingStats.tokens_overage > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-white'">
                {{ billingStats.tokens_overage.toLocaleString() }}
              </span>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="mt-3 bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="usagePercentage >= 100 ? 'bg-red-500' : usagePercentage >= 80 ? 'bg-orange-500' : 'bg-green-500'"
              :style="{ width: `${Math.min(usagePercentage, 100)}%` }"
            />
          </div>
          <p class="text-xs text-slate-500 mt-1">
            {{ usagePercentage.toFixed(1) }}% {{ t('enterprise.billing.ofIncluded') }}
          </p>
        </div>

        <!-- Cost Breakdown -->
        <div>
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {{ t('enterprise.billing.costBreakdown') }}
          </p>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-slate-600 dark:text-slate-400">{{ t('enterprise.billing.subscription') }}</span>
              <span class="font-semibold text-slate-900 dark:text-white">
                ${{ (billingStats.subscription_cost / 100).toFixed(2) }}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-600 dark:text-slate-400">{{ t('enterprise.billing.overageCost') }}</span>
              <span class="font-semibold" :class="billingStats.overage_cost > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-white'">
                ${{ (billingStats.overage_cost / 100).toFixed(2) }}
              </span>
            </div>
            <div class="flex justify-between text-base font-bold border-t border-slate-300 dark:border-slate-600 pt-2 mt-2">
              <span class="text-slate-900 dark:text-white">{{ t('enterprise.billing.total') }}</span>
              <span class="text-sky-700 dark:text-sky-300">
                ${{ (billingStats.total_cost / 100).toFixed(2) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Next Billing -->
    <div v-if="billingStats" class="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        {{ t('enterprise.billing.nextBilling') }}
      </h3>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">
            {{ t('enterprise.billing.nextBillingDate') }}
          </p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white">
            {{ formatDate(billingStats.next_billing_date) }}
          </p>
        </div>
        <div class="text-right">
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">
            {{ t('enterprise.billing.estimatedBill') }}
          </p>
          <p class="text-2xl font-bold text-sky-700 dark:text-sky-300">
            ${{ (billingStats.estimated_next_bill / 100).toFixed(2) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Pricing Information -->
    <div v-if="pricing" class="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        {{ t('enterprise.billing.pricingInfo') }}
      </h3>
      <div class="space-y-3">
        <div class="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
          <span class="text-sm text-slate-600 dark:text-slate-400">
            {{ t('enterprise.billing.includedTokens') }}
          </span>
          <span class="font-semibold text-slate-900 dark:text-white">
            {{ pricing.enterprise_included_tokens.toLocaleString() }} {{ t('enterprise.billing.tokens') }}
          </span>
        </div>
        <div class="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
          <span class="text-sm text-slate-600 dark:text-slate-400">
            {{ t('enterprise.billing.overagePrice') }}
          </span>
          <span class="font-semibold text-slate-900 dark:text-white">
            ${{ (pricing.overage_price_per_1k_tokens / 100).toFixed(2) }} / 1K {{ t('enterprise.billing.tokens') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Warning Messages -->
    <div v-if="billingStats && usagePercentage >= 80" class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <AlertTriangle class="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
        <div>
          <p class="font-semibold text-orange-900 dark:text-orange-300 mb-1">
            {{ usagePercentage >= 100 ? t('enterprise.billing.quotaExceeded') : t('enterprise.billing.quotaWarning') }}
          </p>
          <p class="text-sm text-orange-800 dark:text-orange-400">
            {{ usagePercentage >= 100
              ? t('enterprise.billing.quotaExceededMessage')
              : t('enterprise.billing.quotaWarningMessage', { percent: usagePercentage.toFixed(0) })
            }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle } from 'lucide-vue-next'
import { enterpriseAPI } from '@/services/api'
import Button from '@/components/common/Button.vue'
import DiagnosticAlert from '@/components/common/DiagnosticAlert.vue'
import Skeleton from '@/components/common/Skeleton.vue'
import { formatUserFacingError, type FormattedUserError } from '@/utils/error-messages'

const { t } = useI18n()

const billingStats = ref<any>(null)
const pricing = ref<any>(null)
const loading = ref(false)
const errorState = ref<FormattedUserError | null>(null)

const usagePercentage = computed(() => {
  if (!billingStats.value) return 0
  return (billingStats.value.tokens_used / billingStats.value.tokens_included) * 100
})

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const loadBillingStats = async () => {
  try {
    loading.value = true
    errorState.value = null
    const [statsResponse, pricingResponse] = await Promise.all([
      enterpriseAPI.getBillingStats(),
      enterpriseAPI.getPricing()
    ])
    billingStats.value = statsResponse
    pricing.value = pricingResponse
  } catch (error) {
    errorState.value = formatUserFacingError(error, {
      area: 'ENTERPRISE',
      fallbackTitle: t('enterprise.billing.loadFailedTitle'),
      fallbackMessage: t('enterprise.billing.loadFailedMessage'),
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadBillingStats()
})
</script>
