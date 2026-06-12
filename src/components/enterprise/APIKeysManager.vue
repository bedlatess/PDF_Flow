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

    <div
      v-else-if="errorState"
      class="space-y-3"
    >
      <DiagnosticAlert
        :title="errorState.title"
        :message="errorState.message"
        :diagnostic-code="errorState.diagnosticCode"
        :support-hint="t('enterprise.apiKeys.failureHint')"
        tone="warning"
      />
      <Button
        variant="outline"
        size="sm"
        :loading="loading"
        @click="loadAPIKeys"
      >
        {{ t('enterprise.apiKeys.retry') }}
      </Button>
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
        class="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"
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
              :loading="updatingKey === key.id"
            >
              {{ key.is_active ? t('enterprise.apiKeys.disable') : t('enterprise.apiKeys.enable') }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              :aria-label="t('enterprise.apiKeys.deleteButtonLabel', { name: key.name })"
              @click="confirmDelete(key)"
              :disabled="deletingKey === key.id"
              :loading="deletingKey === key.id"
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
          <DiagnosticAlert
            v-if="actionError"
            :title="actionError.title"
            :message="actionError.message"
            :diagnostic-code="actionError.diagnosticCode"
            :support-hint="t('enterprise.apiKeys.failureHint')"
            tone="warning"
          />

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {{ t('enterprise.apiKeys.createModal.name') }}
            </label>
            <input
              v-model="newKeyForm.name"
              type="text"
              required
              class="w-full rounded-md border border-slate-300 px-4 py-2 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
              class="w-full rounded-md border border-slate-300 px-4 py-2 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
              class="w-full rounded-md border border-slate-300 px-4 py-2 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
            <Button type="submit" :disabled="creating" :loading="creating">
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
          <div class="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <p class="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
              {{ t('enterprise.apiKeys.createdModal.warning') }}
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
              <code class="flex-1 rounded-md bg-slate-100 px-4 py-3 font-mono text-sm break-all dark:bg-slate-800">
                {{ newlyCreatedKey }}
              </code>
              <Button @click="copyToClipboard(newlyCreatedKey!)" size="sm">
                <Copy class="w-4 h-4" />
              </Button>
            </div>
            <p
              v-if="copyMessage"
              class="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300"
            >
              {{ copyMessage }}
            </p>
            <DiagnosticAlert
              v-if="copyError"
              class="mt-3"
              :title="copyError.title"
              :message="copyError.message"
              :diagnostic-code="copyError.diagnosticCode"
              :support-hint="t('enterprise.apiKeys.copyFailureHint')"
              tone="warning"
            />
          </div>

          <div class="flex justify-end mt-6">
            <Button @click="newlyCreatedKey = null">
              {{ t('common.close') }}
            </Button>
          </div>
        </div>
    </Modal>

    <ConfirmationDialog
      v-model="showDeleteConfirmation"
      :title="t('enterprise.apiKeys.deleteDialog.title')"
      :summary="
        t('enterprise.apiKeys.deleteDialog.summary', {
          name: pendingDeleteKey?.name || '',
        })
      "
      :details="deleteDialogDetails"
      :confirm-label="t('enterprise.apiKeys.deleteDialog.confirm')"
      :cancel-label="t('common.cancel')"
      :loading="pendingDeleteKey ? deletingKey === pendingDeleteKey.id : false"
      @confirm="deletePendingKey"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Key, Trash2, Copy } from 'lucide-vue-next'
import { enterpriseAPI } from '@/services/api'
import Button from '@/components/common/Button.vue'
import ConfirmationDialog from '@/components/common/ConfirmationDialog.vue'
import DiagnosticAlert from '@/components/common/DiagnosticAlert.vue'
import Modal from '@/components/common/Modal.vue'
import Skeleton from '@/components/common/Skeleton.vue'
import { formatUserFacingError, type FormattedUserError } from '@/utils/error-messages'

const { t } = useI18n()

const loading = ref(true)
const creating = ref(false)
const updatingKey = ref<number | null>(null)
const deletingKey = ref<number | null>(null)
const showCreateModal = ref(false)
const newlyCreatedKey = ref<string | null>(null)
const apiKeys = ref<any[]>([])
const errorState = ref<FormattedUserError | null>(null)
const actionError = ref<FormattedUserError | null>(null)
const copyError = ref<FormattedUserError | null>(null)
const copyMessage = ref('')
const pendingDeleteKey = ref<any | null>(null)
const showDeleteConfirmation = ref(false)

const newKeyForm = ref({
  name: '',
  rate_limit: -1,
  expires_in_days: null as number | null
})
const deleteDialogDetails = computed(() => [
  t('enterprise.apiKeys.deleteDialog.detailAccess'),
  t('enterprise.apiKeys.deleteDialog.detailAudit'),
  t('enterprise.apiKeys.deleteDialog.detailRecovery'),
])

const loadAPIKeys = async () => {
  try {
    loading.value = true
    errorState.value = null
    const response = await enterpriseAPI.listAPIKeys()
    apiKeys.value = response.keys
  } catch (error) {
    errorState.value = formatUserFacingError(error, {
      area: 'ENTERPRISE',
      fallbackTitle: t('enterprise.apiKeys.loadFailedTitle'),
      fallbackMessage: t('enterprise.apiKeys.loadFailedMessage'),
    })
  } finally {
    loading.value = false
  }
}

const createAPIKey = async () => {
  try {
    creating.value = true
    actionError.value = null
    const response = await enterpriseAPI.createAPIKey(newKeyForm.value)

    // Store the newly created key to show in modal
    newlyCreatedKey.value = response.api_key!

    // Reset form and close modal
    newKeyForm.value = { name: '', rate_limit: -1, expires_in_days: null }
    showCreateModal.value = false

    // Reload keys
    await loadAPIKeys()
  } catch (error) {
    actionError.value = formatUserFacingError(error, {
      area: 'ENTERPRISE',
      fallbackTitle: t('enterprise.apiKeys.createFailedTitle'),
      fallbackMessage: t('enterprise.apiKeys.createFailedMessage'),
    })
  } finally {
    creating.value = false
  }
}

const toggleKeyStatus = async (key: any) => {
  try {
    updatingKey.value = key.id
    errorState.value = null
    await enterpriseAPI.updateAPIKey(key.id, { is_active: !key.is_active })
    await loadAPIKeys()
  } catch (error) {
    errorState.value = formatUserFacingError(error, {
      area: 'ENTERPRISE',
      fallbackTitle: t('enterprise.apiKeys.updateFailedTitle'),
      fallbackMessage: t('enterprise.apiKeys.updateFailedMessage'),
    })
  } finally {
    updatingKey.value = null
  }
}

const confirmDelete = async (key: any) => {
  actionError.value = null
  errorState.value = null
  pendingDeleteKey.value = key
  showDeleteConfirmation.value = true
}

const deletePendingKey = async () => {
  const key = pendingDeleteKey.value
  if (!key) return

  try {
    deletingKey.value = key.id
    errorState.value = null
    await enterpriseAPI.deleteAPIKey(key.id)
    showDeleteConfirmation.value = false
    pendingDeleteKey.value = null
    await loadAPIKeys()
  } catch (error) {
    errorState.value = formatUserFacingError(error, {
      area: 'ENTERPRISE',
      fallbackTitle: t('enterprise.apiKeys.deleteFailedTitle'),
      fallbackMessage: t('enterprise.apiKeys.deleteFailedMessage'),
    })
  } finally {
    deletingKey.value = null
  }
}

const copyToClipboard = async (text: string) => {
  try {
    copyError.value = null
    await navigator.clipboard.writeText(text)
    copyMessage.value = t('enterprise.apiKeys.copied')
  } catch (error) {
    copyMessage.value = ''
    copyError.value = formatUserFacingError(error, {
      area: 'ENTERPRISE',
      fallbackTitle: t('enterprise.apiKeys.copyFailedTitle'),
      fallbackMessage: t('enterprise.apiKeys.copyFailedMessage'),
    })
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

onMounted(() => {
  loadAPIKeys()
})
</script>
