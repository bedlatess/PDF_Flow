<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-slate-900 dark:text-white mb-2">
          {{ t('enterprise.dashboard.title') }}
        </h1>
        <p class="text-slate-600 dark:text-slate-400">
          {{ t('enterprise.dashboard.subtitle') }}
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <Skeleton class="h-32 w-full" />
        <Skeleton class="h-64 w-full" />
        <Skeleton class="h-96 w-full" />
      </div>

      <!-- Dashboard Content -->
      <div v-else class="space-y-6">
        <!-- Overview Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            :title="t('enterprise.stats.apiKeys')"
            :value="dashboardStats?.active_api_keys || 0"
            :subtitle="`${dashboardStats?.total_api_keys || 0} ${t('enterprise.stats.total')}`"
            icon="key"
            color="blue"
          />
          <StatCard
            :title="t('enterprise.stats.requests30d')"
            :value="formatNumber(dashboardStats?.total_requests_30d || 0)"
            :subtitle="t('enterprise.stats.last30Days')"
            icon="activity"
            color="green"
          />
          <StatCard
            :title="t('enterprise.stats.tokens')"
            :value="formatNumber(dashboardStats?.current_month_tokens || 0)"
            :subtitle="t('enterprise.stats.thisMonth')"
            icon="zap"
            color="purple"
          />
          <StatCard
            :title="t('enterprise.stats.cost')"
            :value="`$${((dashboardStats?.current_month_cost_cents || 0) / 100).toFixed(2)}`"
            :subtitle="t('enterprise.stats.thisMonth')"
            icon="dollar-sign"
            color="orange"
          />
        </div>

        <!-- Tabs -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div class="border-b border-slate-200 dark:border-slate-700">
            <nav class="flex space-x-1 px-6" aria-label="Tabs">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="activeTab = tab.id"
                :class="[
                  'px-4 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                {{ tab.label }}
              </button>
            </nav>
          </div>

          <div class="p-6">
            <!-- API Keys Tab -->
            <div v-if="activeTab === 'api-keys'">
              <APIKeysManager />
            </div>

            <!-- Usage Tab -->
            <div v-else-if="activeTab === 'usage'">
              <UsageStats />
            </div>

            <!-- Webhooks Tab -->
            <div v-else-if="activeTab === 'webhooks'">
              <WebhookManager />
            </div>

            <!-- Billing Tab -->
            <div v-else-if="activeTab === 'billing'">
              <BillingStats />
            </div>

            <!-- Documentation Tab -->
            <div v-else-if="activeTab === 'docs'">
              <APIDocumentation />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { enterpriseAPI } from '@/services/api'
import Skeleton from '@/components/common/Skeleton.vue'
import StatCard from '@/components/enterprise/StatCard.vue'
import APIKeysManager from '@/components/enterprise/APIKeysManager.vue'
import UsageStats from '@/components/enterprise/UsageStats.vue'
import WebhookManager from '@/components/enterprise/WebhookManager.vue'
import BillingStats from '@/components/enterprise/BillingStats.vue'
import APIDocumentation from '@/components/enterprise/APIDocumentation.vue'

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const activeTab = ref('api-keys')
const dashboardStats = ref<any>(null)

const tabs = computed(() => [
  { id: 'api-keys', label: t('enterprise.tabs.apiKeys') },
  { id: 'usage', label: t('enterprise.tabs.usage') },
  { id: 'webhooks', label: t('enterprise.tabs.webhooks') },
  { id: 'billing', label: t('enterprise.tabs.billing') },
  { id: 'docs', label: t('enterprise.tabs.documentation') }
])

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

const loadDashboardStats = async () => {
  try {
    const response = await enterpriseAPI.getDashboardStats()
    dashboardStats.value = response
  } catch (error: any) {
    console.error('Failed to load dashboard stats:', error)

    // Redirect if not enterprise user
    if (error.response?.status === 403) {
      router.push('/pricing')
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Check if user is enterprise
  if (!userStore.isEnterpriseTier) {
    router.push('/pricing')
    return
  }

  loadDashboardStats()
})
</script>
