<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-bold text-slate-900 dark:text-white">
      {{ t('enterprise.usage.title') }}
    </h2>

    <div
      v-if="errorState"
      class="space-y-3"
    >
      <DiagnosticAlert
        :title="errorState.title"
        :message="errorState.message"
        :diagnostic-code="errorState.diagnosticCode"
        :support-hint="t('enterprise.usage.failureHint')"
        tone="warning"
      />
      <Button
        variant="outline"
        size="sm"
        :loading="loading"
        @click="loadUsageStats"
      >
        {{ t('enterprise.usage.retry') }}
      </Button>
    </div>

    <div v-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Skeleton v-for="i in 3" :key="i" class="h-28 w-full" />
    </div>

    <!-- Stats Overview -->
    <div v-if="usageStats" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <p class="mb-1 text-sm font-medium text-slate-600 dark:text-slate-300">
          {{ t('enterprise.usage.totalRequests') }}
        </p>
        <p class="text-3xl font-bold text-slate-950 dark:text-white">
          {{ usageStats.total_requests.toLocaleString() }}
        </p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {{ usageStats.successful_requests }} {{ t('enterprise.usage.successful') }} /
          {{ usageStats.failed_requests }} {{ t('enterprise.usage.failed') }}
        </p>
      </div>

      <div class="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <p class="mb-1 text-sm font-medium text-slate-600 dark:text-slate-300">
          {{ t('enterprise.usage.filesProcessed') }}
        </p>
        <p class="text-3xl font-bold text-slate-950 dark:text-white">
          {{ usageStats.total_files_processed.toLocaleString() }}
        </p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {{ formatBytes(usageStats.total_bytes_processed) }} {{ t('enterprise.usage.totalSize') }}
        </p>
      </div>

      <div class="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <p class="mb-1 text-sm font-medium text-slate-600 dark:text-slate-300">
          {{ t('enterprise.usage.tokensUsed') }}
        </p>
        <p class="text-3xl font-bold text-slate-950 dark:text-white">
          {{ usageStats.total_tokens_used.toLocaleString() }}
        </p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          ${{ (usageStats.total_cost_cents / 100).toFixed(2) }} {{ t('enterprise.usage.cost') }}
        </p>
      </div>
    </div>

    <!-- Date Range Filter -->
    <div class="flex items-center gap-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {{ t('enterprise.usage.startDate') }}
        </label>
        <input
          v-model="startDate"
          type="date"
          class="rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {{ t('enterprise.usage.endDate') }}
        </label>
        <input
          v-model="endDate"
          type="date"
          class="rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </div>
      <Button @click="loadUsageStats" class="mt-6" :loading="loading">
        {{ t('enterprise.usage.apply') }}
      </Button>
    </div>

    <!-- Daily Breakdown Chart -->
    <div v-if="usageStats?.daily_breakdown.length > 0" class="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        {{ t('enterprise.usage.dailyBreakdown') }}
      </h3>
      <div class="space-y-2">
        <div
          v-for="day in usageStats.daily_breakdown"
          :key="day.date"
          class="flex items-center gap-4"
        >
          <span class="text-sm text-slate-600 dark:text-slate-400 w-24">
            {{ day.date }}
          </span>
            <div class="relative h-8 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
              class="flex h-full items-center rounded-full bg-sky-600 px-3"
              :style="{ width: `${(day.requests / maxDailyRequests) * 100}%` }"
            >
              <span class="text-xs text-white font-medium">
                {{ day.requests }} {{ t('enterprise.usage.requests') }}
              </span>
            </div>
          </div>
          <span class="text-sm text-slate-600 dark:text-slate-400 w-20 text-right">
            {{ day.tokens.toLocaleString() }} {{ t('enterprise.usage.tokens') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Endpoint Breakdown -->
    <div v-if="usageStats && Object.keys(usageStats.endpoint_breakdown).length > 0" class="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        {{ t('enterprise.usage.endpointBreakdown') }}
      </h3>
      <div class="space-y-3">
        <div
          v-for="[endpoint, count] in Object.entries(usageStats.endpoint_breakdown)"
          :key="endpoint"
          class="flex items-center justify-between rounded-md bg-slate-50 p-3 dark:bg-slate-900/50"
        >
          <code class="text-sm font-mono text-slate-700 dark:text-slate-300">
            {{ endpoint }}
          </code>
          <span class="text-sm font-semibold text-slate-900 dark:text-white">
            {{ count }} {{ t('enterprise.usage.requests') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { enterpriseAPI } from '@/services/api'
import Button from '@/components/common/Button.vue'
import DiagnosticAlert from '@/components/common/DiagnosticAlert.vue'
import Skeleton from '@/components/common/Skeleton.vue'
import { formatUserFacingError, type FormattedUserError } from '@/utils/error-messages'

const { t } = useI18n()

const usageStats = ref<any>(null)
const startDate = ref('')
const endDate = ref('')
const loading = ref(false)
const errorState = ref<FormattedUserError | null>(null)

const maxDailyRequests = computed(() => {
  if (!usageStats.value?.daily_breakdown) return 1
  return Math.max(...usageStats.value.daily_breakdown.map((d: any) => d.requests))
})

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

const loadUsageStats = async () => {
  try {
    loading.value = true
    errorState.value = null
    const params: any = {}
    if (startDate.value) params.start_date = new Date(startDate.value).toISOString()
    if (endDate.value) params.end_date = new Date(endDate.value).toISOString()

    const response = await enterpriseAPI.getUsageStats(params)
    usageStats.value = response
  } catch (error) {
    errorState.value = formatUserFacingError(error, {
      area: 'ENTERPRISE',
      fallbackTitle: t('enterprise.usage.loadFailedTitle'),
      fallbackMessage: t('enterprise.usage.loadFailedMessage'),
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Default to last 30 days
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)

  endDate.value = end.toISOString().split('T')[0]
  startDate.value = start.toISOString().split('T')[0]

  loadUsageStats()
})
</script>
