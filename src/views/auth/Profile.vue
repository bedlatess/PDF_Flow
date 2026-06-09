<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
    <div class="max-w-3xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ t('account.myAccount') }}
        </h1>
      </div>

      <div v-if="userStore.loading && !userStore.user" class="text-center py-12">
        <Loader2 class="animate-spin h-8 w-8 mx-auto text-indigo-600" />
      </div>

      <template v-else-if="userStore.user">
        <!-- Profile Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('account.profile') }}
            </h2>
            <button
              v-if="!editing"
              @click="startEdit"
              class="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              {{ t('account.editProfile') }}
            </button>
          </div>

          <!-- Avatar + Plan -->
          <div class="flex items-center gap-4 mb-6">
            <div class="h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
              <span class="text-2xl font-bold text-indigo-600 dark:text-indigo-300">
                {{ initials }}
              </span>
            </div>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ userStore.user.email }}</p>
              <span
                class="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full"
                :class="planBadgeClass"
              >
                {{ planLabel }}
              </span>
            </div>
          </div>

          <!-- Edit Form -->
          <form v-if="editing" @submit.prevent="saveProfile" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ t('auth.fullName') }}
              </label>
              <input
                v-model="editForm.full_name"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div v-if="updateMessage" class="text-sm text-green-600">{{ updateMessage }}</div>
            <div v-if="userStore.error" class="text-sm text-red-600">{{ userStore.error }}</div>
            <div class="flex gap-3">
              <button
                type="submit"
                :disabled="userStore.loading"
                class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {{ t('account.save') }}
              </button>
              <button
                type="button"
                @click="cancelEdit"
                class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-200"
              >
                {{ t('account.cancel') }}
              </button>
            </div>
          </form>
          <div v-else class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('auth.fullName') }}: {{ userStore.user.full_name || '—' }}
          </div>
        </div>

        <!-- Usage Stats Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {{ t('account.usage') }}
          </h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ userStore.stats?.total_requests ?? 0 }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('account.totalRequests') }}</p>
            </div>
            <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ userStore.stats?.requests_today ?? 0 }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('account.requestsToday') }}</p>
            </div>
            <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ quotaDisplay }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('account.quotaRemaining') }}</p>
            </div>
          </div>

          <!-- Quota progress bar (free tier only) -->
          <div v-if="userStore.isFreeTier && userStore.stats" class="mt-4">
            <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-indigo-600 transition-all"
                :style="{ width: `${userStore.quotaUsagePercentage}%` }"
              ></div>
            </div>
          </div>

          <button
            v-if="userStore.isFreeTier"
            @click="router.push('/pricing')"
            class="mt-4 w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:opacity-90"
          >
            {{ t('account.upgradeToPro') }}
          </button>
        </div>

        <!-- Danger Zone -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-red-100 dark:border-red-900/30">
          <button
            @click="confirmDelete"
            class="text-sm font-medium text-red-600 hover:text-red-700"
          >
            {{ t('account.deleteAccount') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const editing = ref(false)
const updateMessage = ref('')
const editForm = reactive({ full_name: '' })

const initials = computed(() => {
  const name = userStore.user?.full_name || userStore.user?.email || '?'
  return name.charAt(0).toUpperCase()
})

const planLabel = computed(() => {
  const role = userStore.user?.role || 'free'
  return role.charAt(0).toUpperCase() + role.slice(1)
})

const planBadgeClass = computed(() => {
  if (userStore.isEnterpriseTier) return 'bg-purple-100 text-purple-700'
  if (userStore.isProTier) return 'bg-indigo-100 text-indigo-700'
  return 'bg-gray-100 text-gray-700'
})

const quotaDisplay = computed(() => {
  const remaining = userStore.stats?.quota_remaining
  if (remaining === -1 || remaining === undefined) return t('account.unlimited')
  return String(remaining)
})

const startEdit = () => {
  editForm.full_name = userStore.user?.full_name || ''
  editing.value = true
  updateMessage.value = ''
}

const cancelEdit = () => {
  editing.value = false
  userStore.error = null
}

const saveProfile = async () => {
  try {
    await userStore.updateProfile({ full_name: editForm.full_name })
    updateMessage.value = t('account.updateSuccess')
    editing.value = false
  } catch {
    // error handled in store
  }
}

const confirmDelete = async () => {
  if (window.confirm(t('account.deleteConfirm'))) {
    await userStore.deleteAccount()
    router.push('/')
  }
}

onMounted(async () => {
  if (!userStore.isAuthenticated) {
    await userStore.checkAuth()
  } else {
    await userStore.fetchStats()
  }
})
</script>
