<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">
          {{ t('enterprise.apiKeys.title') }}
        </h2>
        <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {{ t('enterprise.apiKeys.description') }}
        </p>
      </div>
      <Button @click="showCreateModal = true" class="flex items-center gap-2">
        <Plus class="w-4 h-4" />
        {{ t('enterprise.apiKeys.create') }}
      </Button>
    </div>

    <!-- API Keys List -->
    <div v-if="loading" class="space-y-4">
      <Skeleton v-for="i in 3" :key="i" class="h-24 w-full" />
    </div>

    <div v-else-if="apiKeys.length === 0" class="text-center py-12">
      <Key class="w-16 h-16 mx-auto text-slate-400 mb-4" />
      <p class="text-slate-600 dark:text-slate-400 mb-4">
        {{ t('enterprise.apiKeys.empty') }}
      </p>
      <Button @click="showCreateModal = true">
        {{ t('enterprise.apiKeys.createFirst') }}
      </Button>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="key in apiKeys"
        :key="key.id"
        class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                {{ key.name }}
              </h3>
              <span
                :class="[
                  'px-2 py-1 text-xs font-medium rounded-full',
                  key.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                ]"
              >
                {{ key.is_active ? t('enterprise.apiKeys.active') : t('enterprise.apiKeys.inactive') }}
              </span>
            </div>

            <div class="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <code class="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded font-mono">
                {{ key.key_prefix }}...
              </code>
              <span>{{ t('enterprise.apiKeys.created') }}: {{ formatDate(key.created_at) }}</span>
              <span v-if="key.last_used_at">
                {{ t('enterprise.apiKeys.lastUsed') }}: {{ formatDate(key.last_used_at) }}
              </span>
              <span v-else class="text-slate-400">
                {{ t('enterprise.apiKeys.neverUsed') }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              @click="toggleKeyStatus(key)"
              :disabled="updatingKey === key.id"
            >
              {{ key.is_active ? t('enterprise.apiKeys.disable') : t('enterprise.apiKeys.enable') }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              @click="confirmDelete(key)"
              :disabled="deletingKey === key.id"
              class="text-red-600 hover:text-red-700"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create API Key Modal -->
    <Modal v-model="showCreateModal" :title="t('enterprise.apiKeys.createModal.title')">
        <form @submit.prevent="createAPIKey" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {{ t('enterprise.apiKeys.createModal.name') }}
            </label>
            <input
              v-model="newKeyForm.name"
              type="text"
              required
              class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
              :placeholder="t('enterprise.apiKeys.createModal.namePlaceholder')"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {{ t('enterprise.apiKeys.createModal.rateLimit') }}
            </label>
            <input
              v-model.number="newKeyForm.rate_limit"
              type="number"
              min="-1"
              class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
              :placeholder="t('enterprise.apiKeys.createModal.rateLimitPlaceholder')"
            />
            <p class="text-xs text-slate-500 mt-1">
              {{ t('enterprise.apiKeys.createModal.rateLimitHelp') }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {{ t('enterprise.apiKeys.createModal.expiration') }}
            </label>
            <select
              v-model.number="newKeyForm.expires_in_days"
              class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
            >
              <option :value="null">{{ t('enterprise.apiKeys.createModal.neverExpire') }}</option>
              <option :value="30">30 {{ t('enterprise.apiKeys.createModal.days') }}</option>
              <option :value="90">90 {{ t('enterprise.apiKeys.createModal.days') }}</option>
              <option :value="180">180 {{ t('enterprise.apiKeys.createModal.days') }}</option>
              <option :value="365">365 {{ t('enterprise.apiKeys.createModal.days') }}</option>
            </select>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" @click="showCreateModal = false">
              {{ t('common.cancel') }}
            </Button>
            <Button type="submit" :disabled="creating">
              {{ creating ? t('common.creating') : t('common.create') }}
            </Button>
          </div>
        </form>
    </Modal>

    <!-- Show API Key Modal (after creation) -->
    <Modal
      :model-value="!!newlyCreatedKey"
      :title="t('enterprise.apiKeys.createdModal.title')"
      @update:model-value="(value) => { if (!value) newlyCreatedKey = null }"
      @close="newlyCreatedKey = null"
    >
        <div class="space-y-4">
          <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p class="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
              注意：{{ t('enterprise.apiKeys.createdModal.warning') }}
            </p>
            <p class="text-xs text-yellow-700 dark:text-yellow-300">
              {{ t('enterprise.apiKeys.createdModal.warningDetail') }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {{ t('enterprise.apiKeys.createdModal.yourKey') }}
            </label>
            <div class="flex items-center gap-2">
              <code class="flex-1 bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-lg font-mono text-sm break-all">
                {{ newlyCreatedKey }}
              </code>
              <Button @click="copyToClipboard(newlyCreatedKey!)" size="sm">
                <Copy class="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div class="flex justify-end mt-6">
            <Button @click="newlyCreatedKey = null">
              {{ t('common.close') }}
            </Button>
          </div>
        </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Key, Trash2, Copy } from 'lucide-vue-next'
import { enterpriseAPI } from '@/services/api'
import Button from '@/components/common/Button.vue'
import Modal from '@/components/common/Modal.vue'
import Skeleton from '@/components/common/Skeleton.vue'

const { t } = useI18n()

const loading = ref(true)
const creating = ref(false)
const updatingKey = ref<number | null>(null)
const deletingKey = ref<number | null>(null)
const showCreateModal = ref(false)
const newlyCreatedKey = ref<string | null>(null)
const apiKeys = ref<any[]>([])

const newKeyForm = ref({
  name: '',
  rate_limit: -1,
  expires_in_days: null as number | null
})

const loadAPIKeys = async () => {
  try {
    loading.value = true
    const response = await enterpriseAPI.listAPIKeys()
    apiKeys.value = response.keys
  } catch (error) {
    console.error('Failed to load API keys:', error)
  } finally {
    loading.value = false
  }
}

const createAPIKey = async () => {
  try {
    creating.value = true
    const response = await enterpriseAPI.createAPIKey(newKeyForm.value)

    // Store the newly created key to show in modal
    newlyCreatedKey.value = response.api_key!

    // Reset form and close modal
    newKeyForm.value = { name: '', rate_limit: -1, expires_in_days: null }
    showCreateModal.value = false

    // Reload keys
    await loadAPIKeys()
  } catch (error) {
    console.error('Failed to create API key:', error)
  } finally {
    creating.value = false
  }
}

const toggleKeyStatus = async (key: any) => {
  try {
    updatingKey.value = key.id
    await enterpriseAPI.updateAPIKey(key.id, { is_active: !key.is_active })
    await loadAPIKeys()
  } catch (error) {
    console.error('Failed to update API key:', error)
  } finally {
    updatingKey.value = null
  }
}

const confirmDelete = async (key: any) => {
  if (!confirm(t('enterprise.apiKeys.confirmDelete', { name: key.name }))) {
    return
  }

  try {
    deletingKey.value = key.id
    await enterpriseAPI.deleteAPIKey(key.id)
    await loadAPIKeys()
  } catch (error) {
    console.error('Failed to delete API key:', error)
  } finally {
    deletingKey.value = null
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    alert(t('enterprise.apiKeys.copied'))
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

onMounted(() => {
  loadAPIKeys()
})
</script>
