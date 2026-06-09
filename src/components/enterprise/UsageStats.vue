<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-bold text-slate-900 dark:text-white">
      {{ t('enterprise.usage.title') }}
    </h2>

    <!-- Stats Overview -->
    <div v-if="usageStats" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <p class="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
          {{ t('enterprise.usage.totalRequests') }}
        </p>
        <p class="text-3xl font-bold text-blue-600 dark:text-blue-400">
          {{ usageStats.total_requests.toLocaleString() }}
        </p>
        <p class="text-xs text-blue-700 dark:text-blue-500 mt-1">
          {{ usageStats.successful_requests }} {{ t('enterprise.usage.successful') }} /
          {{ usageStats.failed_requests }} {{ t('enterprise.usage.failed') }}
        </p>
      </div>

      <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
        <p class="text-sm font-medium text-green-900 dark:text-green-300 mb-1">
          {{ t('enterprise.usage.filesProcessed') }}
        </p>
        <p class="text-3xl font-bold text-green-600 dark:text-green-400">
          {{ usageStats.total_files_processed.toLocaleString() }}
        </p>
        <p class="text-xs text-green-700 dark:text-green-500 mt-1">
          {{ formatBytes(usageStats.total_bytes_processed) }} {{ t('enterprise.usage.totalSize') }}
        </p>
      </div>

      <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
        <p class="text-sm font-medium text-purple-900 dark:text-purple-300 mb-1">
          {{ t('enterprise.usage.tokensUsed') }}
        </p>
        <p class="text-3xl font-bold text-purple-600 dark:text-purple-400">
          {{ usageStats.total_tokens_used.toLocaleString() }}
        </p>
        <p class="text-xs text-purple-700 dark:text-purple-500 mt-1">
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
          class="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {{ t('enterprise.usage.endDate') }}
        </label>
        <input
          v-model="endDate"
          type="date"
          class="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
        />
      </div>
      <Button @click="loadUsageStats" class="mt-6">
        {{ t('enterprise.usage.apply') }}
      </Button>
    </div>

    <!-- Daily Breakdown Chart -->
    <div v-if="usageStats?.daily_breakdown.length > 0" class="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
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
          <div class="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-8 relative overflow-hidden">
            <div
              class="bg-blue-500 h-full rounded-full flex items-center px-3"
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
    <div v-if="usageStats && Object.keys(usageStats.endpoint_breakdown).length > 0" class="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        {{ t('enterprise.usage.endpointBreakdown') }}
      </h3>
      <div class="space-y-3">
        <div
          v-for="[endpoint, count] in Object.entries(usageStats.endpoint_breakdown)"
          :key="endpoint"
          class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
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

const { t } = useI18n()

const usageStats = ref<any>(null)
const startDate = ref('')
const endDate = ref('')

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
    const params: any = {}
    if (startDate.value) params.start_date = new Date(startDate.value).toISOString()
    if (endDate.value) params.end_date = new Date(endDate.value).toISOString()

    const response = await enterpriseAPI.getUsageStats(params)
    usageStats.value = response
  } catch (error) {
    console.error('Failed to load usage stats:', error)
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
