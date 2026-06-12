<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">
          {{ t('enterprise.webhooks.title') }}
        </h2>
        <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {{ t('enterprise.webhooks.description') }}
        </p>
      </div>
      <Button @click="showCreateModal = true" class="flex items-center gap-2">
        <Plus class="w-4 h-4" />
        {{ t('enterprise.webhooks.create') }}
      </Button>
    </div>

    <!-- Webhooks List -->
    <div v-if="loading" class="space-y-4">
      <Skeleton v-for="i in 2" :key="i" class="h-32 w-full" />
    </div>

    <div
      v-else-if="errorState"
      class="space-y-3"
    >
      <DiagnosticAlert
        :title="errorState.title"
        :message="errorState.message"
        :diagnostic-code="errorState.diagnosticCode"
        :support-hint="t('enterprise.webhooks.failureHint')"
        tone="warning"
      />
      <Button
        variant="outline"
        size="sm"
        :loading="loading"
        @click="loadWebhooks"
      >
        {{ t('enterprise.webhooks.retry') }}
      </Button>
    </div>

    <div v-else-if="webhooks.length === 0" class="text-center py-12">
      <Webhook class="w-16 h-16 mx-auto text-slate-400 mb-4" />
      <p class="text-slate-600 dark:text-slate-400 mb-4">
        {{ t('enterprise.webhooks.empty') }}
      </p>
      <Button @click="showCreateModal = true">
        {{ t('enterprise.webhooks.createFirst') }}
      </Button>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="webhook in webhooks"
        :key="webhook.id"
        class="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <code class="text-sm font-mono text-slate-700 dark:text-slate-300">
                {{ webhook.url }}
              </code>
              <span
                :class="[
                  'px-2 py-1 text-xs font-medium rounded-full',
                  webhook.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                ]"
              >
                {{ webhook.is_active ? t('enterprise.webhooks.active') : t('enterprise.webhooks.inactive') }}
              </span>
            </div>

            <div class="flex flex-wrap gap-2 mb-2">
              <span
                v-for="event in webhook.events"
                :key="event"
                class="rounded bg-sky-100 px-2 py-1 text-xs text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
              >
                {{ event }}
              </span>
            </div>

            <div class="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              <span>
                {{ t('enterprise.webhooks.deliveries') }}:
                {{ webhook.successful_deliveries }} / {{ webhook.total_deliveries }}
              </span>
              <span v-if="webhook.last_triggered_at">
                {{ t('enterprise.webhooks.lastTriggered') }}: {{ formatDate(webhook.last_triggered_at) }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              @click="toggleWebhookStatus(webhook)"
              :disabled="updatingWebhook === webhook.id"
              :loading="updatingWebhook === webhook.id"
            >
              {{ webhook.is_active ? t('enterprise.webhooks.disable') : t('enterprise.webhooks.enable') }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              :aria-label="t('enterprise.webhooks.deleteButtonLabel', { url: webhook.url })"
              @click="confirmDelete(webhook)"
              :disabled="deletingWebhook === webhook.id"
              :loading="deletingWebhook === webhook.id"
              class="text-red-600 hover:text-red-700"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Webhook Modal -->
    <Modal v-model="showCreateModal" :title="t('enterprise.webhooks.createModal.title')">
        <form @submit.prevent="createWebhook" class="space-y-4">
          <DiagnosticAlert
            v-if="actionError"
            :title="actionError.title"
            :message="actionError.message"
            :diagnostic-code="actionError.diagnosticCode"
            :support-hint="t('enterprise.webhooks.failureHint')"
            tone="warning"
          />

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {{ t('enterprise.webhooks.createModal.url') }}
            </label>
            <input
              v-model="newWebhookForm.url"
              type="url"
              required
              class="w-full rounded-md border border-slate-300 px-4 py-2 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              placeholder="https://your-server.com/webhook"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {{ t('enterprise.webhooks.createModal.events') }}
            </label>
            <div class="space-y-2">
              <label
                v-for="event in availableEvents"
                :key="event"
                class="flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  :value="event"
                  v-model="newWebhookForm.events"
                  class="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span class="text-sm text-slate-700 dark:text-slate-300">{{ event }}</span>
              </label>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {{ t('enterprise.webhooks.createModal.secret') }}
            </label>
            <input
              v-model="newWebhookForm.secret"
              type="text"
              class="w-full rounded-md border border-slate-300 px-4 py-2 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              :placeholder="t('enterprise.webhooks.createModal.secretPlaceholder')"
            />
            <p class="text-xs text-slate-500 mt-1">
              {{ t('enterprise.webhooks.createModal.secretHelp') }}
            </p>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" @click="showCreateModal = false">
              {{ t('common.cancel') }}
            </Button>
            <Button type="submit" :disabled="creating || newWebhookForm.events.length === 0" :loading="creating">
              {{ creating ? t('common.creating') : t('common.create') }}
            </Button>
          </div>
        </form>
    </Modal>

    <ConfirmationDialog
      v-model="showDeleteConfirmation"
      :title="t('enterprise.webhooks.deleteDialog.title')"
      :summary="
        t('enterprise.webhooks.deleteDialog.summary', {
          url: pendingDeleteWebhook?.url || '',
        })
      "
      :details="deleteDialogDetails"
      :confirm-label="t('enterprise.webhooks.deleteDialog.confirm')"
      :cancel-label="t('common.cancel')"
      :loading="pendingDeleteWebhook ? deletingWebhook === pendingDeleteWebhook.id : false"
      @confirm="deletePendingWebhook"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Webhook, Trash2 } from 'lucide-vue-next'
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
const updatingWebhook = ref<number | null>(null)
const deletingWebhook = ref<number | null>(null)
const showCreateModal = ref(false)
const webhooks = ref<any[]>([])
const errorState = ref<FormattedUserError | null>(null)
const actionError = ref<FormattedUserError | null>(null)
const pendingDeleteWebhook = ref<any | null>(null)
const showDeleteConfirmation = ref(false)

const availableEvents = [
  'job.completed',
  'job.failed',
  'rate_limit.exceeded',
  'quota.warning',
  'quota.exceeded'
]

const newWebhookForm = ref({
  url: '',
  events: [] as string[],
  secret: '',
  is_active: true
})
const deleteDialogDetails = computed(() => [
  t('enterprise.webhooks.deleteDialog.detailDelivery'),
  t('enterprise.webhooks.deleteDialog.detailHistory'),
  t('enterprise.webhooks.deleteDialog.detailRecovery'),
])

const loadWebhooks = async () => {
  try {
    loading.value = true
    errorState.value = null
    const response = await enterpriseAPI.listWebhooks()
    webhooks.value = response.webhooks
  } catch (error) {
    errorState.value = formatUserFacingError(error, {
      area: 'ENTERPRISE',
      fallbackTitle: t('enterprise.webhooks.loadFailedTitle'),
      fallbackMessage: t('enterprise.webhooks.loadFailedMessage'),
    })
  } finally {
    loading.value = false
  }
}

const createWebhook = async () => {
  try {
    creating.value = true
    actionError.value = null
    await enterpriseAPI.createWebhook(newWebhookForm.value)

    // Reset form and close modal
    newWebhookForm.value = { url: '', events: [], secret: '', is_active: true }
    showCreateModal.value = false

    // Reload webhooks
    await loadWebhooks()
  } catch (error) {
    actionError.value = formatUserFacingError(error, {
      area: 'ENTERPRISE',
      fallbackTitle: t('enterprise.webhooks.createFailedTitle'),
      fallbackMessage: t('enterprise.webhooks.createFailedMessage'),
    })
  } finally {
    creating.value = false
  }
}

const toggleWebhookStatus = async (webhook: any) => {
  try {
    updatingWebhook.value = webhook.id
    errorState.value = null
    await enterpriseAPI.updateWebhook(webhook.id, { is_active: !webhook.is_active })
    await loadWebhooks()
  } catch (error) {
    errorState.value = formatUserFacingError(error, {
      area: 'ENTERPRISE',
      fallbackTitle: t('enterprise.webhooks.updateFailedTitle'),
      fallbackMessage: t('enterprise.webhooks.updateFailedMessage'),
    })
  } finally {
    updatingWebhook.value = null
  }
}

const confirmDelete = async (webhook: any) => {
  actionError.value = null
  errorState.value = null
  pendingDeleteWebhook.value = webhook
  showDeleteConfirmation.value = true
}

const deletePendingWebhook = async () => {
  const webhook = pendingDeleteWebhook.value
  if (!webhook) return

  try {
    deletingWebhook.value = webhook.id
    errorState.value = null
    await enterpriseAPI.deleteWebhook(webhook.id)
    showDeleteConfirmation.value = false
    pendingDeleteWebhook.value = null
    await loadWebhooks()
  } catch (error) {
    errorState.value = formatUserFacingError(error, {
      area: 'ENTERPRISE',
      fallbackTitle: t('enterprise.webhooks.deleteFailedTitle'),
      fallbackMessage: t('enterprise.webhooks.deleteFailedMessage'),
    })
  } finally {
    deletingWebhook.value = null
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

onMounted(() => {
  loadWebhooks()
})
</script>
