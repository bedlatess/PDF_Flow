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
        class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
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
                class="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded"
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
            >
              {{ webhook.is_active ? t('enterprise.webhooks.disable') : t('enterprise.webhooks.enable') }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              @click="confirmDelete(webhook)"
              class="text-red-600 hover:text-red-700"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Webhook Modal -->
    <Modal :open="showCreateModal" @close="showCreateModal = false">
      <template #title>{{ t('enterprise.webhooks.createModal.title') }}</template>
      <template #content>
        <form @submit.prevent="createWebhook" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {{ t('enterprise.webhooks.createModal.url') }}
            </label>
            <input
              v-model="newWebhookForm.url"
              type="url"
              required
              class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
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
                  class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
              class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
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
            <Button type="submit" :disabled="creating || newWebhookForm.events.length === 0">
              {{ creating ? t('common.creating') : t('common.create') }}
            </Button>
          </div>
        </form>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Webhook, Trash2 } from 'lucide-vue-next'
import { enterpriseAPI } from '@/services/api'
import Button from '@/components/common/Button.vue'
import Modal from '@/components/common/Modal.vue'
import Skeleton from '@/components/common/Skeleton.vue'

const { t } = useI18n()

const loading = ref(true)
const creating = ref(false)
const showCreateModal = ref(false)
const webhooks = ref<any[]>([])

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

const loadWebhooks = async () => {
  try {
    loading.value = true
    const response = await enterpriseAPI.listWebhooks()
    webhooks.value = response.webhooks
  } catch (error) {
    console.error('Failed to load webhooks:', error)
  } finally {
    loading.value = false
  }
}

const createWebhook = async () => {
  try {
    creating.value = true
    await enterpriseAPI.createWebhook(newWebhookForm.value)

    // Reset form and close modal
    newWebhookForm.value = { url: '', events: [], secret: '', is_active: true }
    showCreateModal.value = false

    // Reload webhooks
    await loadWebhooks()
  } catch (error) {
    console.error('Failed to create webhook:', error)
  } finally {
    creating.value = false
  }
}

const toggleWebhookStatus = async (webhook: any) => {
  try {
    await enterpriseAPI.updateWebhook(webhook.id, { is_active: !webhook.is_active })
    await loadWebhooks()
  } catch (error) {
    console.error('Failed to update webhook:', error)
  }
}

const confirmDelete = async (webhook: any) => {
  if (!confirm(t('enterprise.webhooks.confirmDelete', { url: webhook.url }))) {
    return
  }

  try {
    await enterpriseAPI.deleteWebhook(webhook.id)
    await loadWebhooks()
  } catch (error) {
    console.error('Failed to delete webhook:', error)
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

onMounted(() => {
  loadWebhooks()
})
</script>
