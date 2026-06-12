<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ClipboardCopy,
  Loader2,
  MessageSquare,
  X,
} from 'lucide-vue-next'
import { feedbackAPI } from '@/services/api'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import { formatUserFacingError, type FormattedUserError } from '@/utils/error-messages'

type FeedbackWidgetError = FormattedUserError & {
  tone?: 'danger' | 'warning'
}

const { t } = useI18n()
const settingsStore = useSettingsStore()
const userStore = useUserStore()

const MAX_MESSAGE_LENGTH = 4000

const open = ref(false)
const submitting = ref(false)
const copied = ref(false)
const copyFailed = ref(false)
const errorState = ref<FeedbackWidgetError | null>(null)
const resultId = ref<number | null>(null)
const diagnosticSeed = ref('')

const form = ref({
  title: '',
  message: '',
  email: '',
  category: 'bug',
  severity: 'normal',
})

const createDiagnosticCode = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `PDF-${date}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

const diagnosticCode = computed(() => diagnosticSeed.value || createDiagnosticCode())
const messageLength = computed(() => form.value.message.length)
const messageRemaining = computed(() => MAX_MESSAGE_LENGTH - messageLength.value)
const currentPath = computed(() =>
  typeof window === 'undefined' ? '/' : `${window.location.pathname}${window.location.search}`
)

const categoryOptions = computed(() => [
  { value: 'bug', label: t('feedbackWidget.categories.bug') },
  { value: 'ui', label: t('feedbackWidget.categories.ui') },
  { value: 'account', label: t('feedbackWidget.categories.account') },
  { value: 'suggestion', label: t('feedbackWidget.categories.suggestion') },
])

const severityOptions = computed(() => [
  { value: 'normal', label: t('feedbackWidget.severities.normal') },
  { value: 'high', label: t('feedbackWidget.severities.high') },
  { value: 'critical', label: t('feedbackWidget.severities.critical') },
])

const currentDiagnostics = () => ({
  path: window.location.pathname,
  url: window.location.href,
  locale: settingsStore.locale,
  theme: settingsStore.theme,
  viewport: `${window.innerWidth}x${window.innerHeight}`,
  userAgent: navigator.userAgent,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  timestamp: new Date().toISOString(),
  authState: userStore.isAuthenticated ? `signed-in:${userStore.user?.role || 'unknown'}` : 'guest',
})

const diagnosticSummary = computed(() =>
  [
    resultId.value ? t('feedbackWidget.summary.feedbackId', { id: resultId.value }) : null,
    t('feedbackWidget.summary.diagnosticCode', { code: diagnosticCode.value }),
    t('feedbackWidget.summary.page', {
      page: typeof window === 'undefined' ? currentPath.value : window.location.href,
    }),
  ]
    .filter(Boolean)
    .join('\n')
)

const resetForm = () => {
  diagnosticSeed.value = createDiagnosticCode()
  form.value = {
    title: '',
    message: '',
    email: userStore.user?.email || '',
    category: 'bug',
    severity: 'normal',
  }
  copied.value = false
  copyFailed.value = false
  errorState.value = null
  resultId.value = null
}

const show = () => {
  resetForm()
  open.value = true
}

const close = () => {
  open.value = false
}

const validateForm = () => {
  const title = form.value.title.trim()
  const message = form.value.message.trim()

  if (!title || !message) {
    errorState.value = {
      title: t('feedbackWidget.validation.requiredTitle'),
      message: t('feedbackWidget.validation.requiredMessage'),
      diagnosticCode: diagnosticCode.value,
      supportHint: t('feedbackWidget.validation.requiredHint'),
      tone: 'warning',
    }
    return false
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    errorState.value = {
      title: t('feedbackWidget.validation.tooLongTitle'),
      message: t('feedbackWidget.validation.tooLongMessage', { count: MAX_MESSAGE_LENGTH }),
      diagnosticCode: diagnosticCode.value,
      supportHint: t('feedbackWidget.validation.tooLongHint'),
      tone: 'warning',
    }
    return false
  }

  return true
}

const submitFeedback = async () => {
  if (!validateForm()) return

  submitting.value = true
  copied.value = false
  copyFailed.value = false
  errorState.value = null

  try {
    const response = await feedbackAPI.create({
      title: form.value.title.trim(),
      message: form.value.message.trim(),
      email: form.value.email.trim() || undefined,
      category: form.value.category,
      severity: form.value.severity,
      page_url: window.location.href,
      diagnostic_code: diagnosticCode.value,
      diagnostics: currentDiagnostics(),
    })
    resultId.value = response.id
  } catch (error) {
    errorState.value = formatUserFacingError(error, {
      area: 'GENERAL',
      fallbackTitle: t('feedbackWidget.submitFailedTitle'),
      fallbackMessage: t('feedbackWidget.submitFailedMessage'),
    })
  } finally {
    submitting.value = false
  }
}

const copySummary = async () => {
  copied.value = false
  copyFailed.value = false

  try {
    await navigator.clipboard.writeText(diagnosticSummary.value)
    copied.value = true
  } catch {
    copyFailed.value = true
  }
}
</script>

<template>
  <button
    v-if="!open"
    type="button"
    class="fixed bottom-5 right-5 z-[70] inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-lg shadow-slate-200/70 transition hover:border-sky-200 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/25 dark:hover:border-sky-500/40 dark:hover:text-sky-300"
    @click="show"
  >
    <MessageSquare class="h-4 w-4 text-sky-600 dark:text-sky-300" />
    {{ t('feedbackWidget.launcher') }}
  </button>

  <div
    v-if="open"
    class="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/35 px-3 py-4 sm:items-center sm:px-4"
    @click.self="close"
  >
    <section
      class="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950"
      role="dialog"
      aria-modal="true"
      :aria-label="t('feedbackWidget.dialogLabel')"
    >
      <header class="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div class="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <Bug class="h-3.5 w-3.5" />
            {{ t('feedbackWidget.badge') }}
          </div>
          <h2 class="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
            {{ t('feedbackWidget.title') }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {{ t('feedbackWidget.description') }}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          :aria-label="t('feedbackWidget.close')"
          @click="close"
        >
          <X class="h-5 w-5" />
        </button>
      </header>

      <div class="min-h-0 overflow-y-auto p-5">
        <div
          v-if="resultId"
          class="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-100"
        >
          <CheckCircle2 class="h-8 w-8" />
          <h3 class="mt-3 text-lg font-semibold">
            {{ t('feedbackWidget.successTitle') }}
          </h3>
          <p class="mt-2 text-sm leading-6">
            {{ t('feedbackWidget.successMessage', { id: resultId, code: diagnosticCode }) }}
          </p>

          <div class="mt-4 rounded-md border border-emerald-200/80 bg-white/70 p-3 text-xs leading-5 text-emerald-950 dark:border-emerald-900/40 dark:bg-slate-950/40 dark:text-emerald-100">
            <pre class="whitespace-pre-wrap break-words font-sans">{{ diagnosticSummary }}</pre>
          </div>

          <div class="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
              @click="copySummary"
            >
              <ClipboardCopy class="h-4 w-4" />
              {{ copied ? t('feedbackWidget.copied') : t('feedbackWidget.copyReference') }}
            </button>
            <button
              type="button"
              class="inline-flex min-h-10 items-center justify-center rounded-md border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 dark:border-emerald-900/50 dark:bg-slate-950 dark:text-emerald-100"
              @click="close"
            >
              {{ t('common.close') }}
            </button>
          </div>

          <p
            v-if="copyFailed"
            class="mt-3 text-sm leading-6 text-amber-800 dark:text-amber-100"
          >
            {{ t('feedbackWidget.copyFailed') }}
          </p>
        </div>

        <form
          v-else
          class="space-y-4"
          @submit.prevent="submitFeedback"
        >
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {{ t('feedbackWidget.categoryLabel') }}
              </span>
              <select
                v-model="form.category"
                class="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option
                  v-for="option in categoryOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="block">
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {{ t('feedbackWidget.severityLabel') }}
              </span>
              <select
                v-model="form.severity"
                class="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option
                  v-for="option in severityOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>

          <label class="block">
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {{ t('feedbackWidget.titleLabel') }}
            </span>
            <input
              v-model="form.title"
              type="text"
              maxlength="160"
              :placeholder="t('feedbackWidget.titlePlaceholder')"
              class="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
          </label>

          <label class="block">
            <span class="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>{{ t('feedbackWidget.messageLabel') }}</span>
              <span
                class="text-xs font-medium"
                :class="messageRemaining < 0 ? 'text-rose-500' : messageRemaining < 300 ? 'text-amber-600 dark:text-amber-300' : 'text-slate-400'"
              >
                {{ messageLength }}/{{ MAX_MESSAGE_LENGTH }}
              </span>
            </span>
            <textarea
              v-model="form.message"
              rows="5"
              :maxlength="MAX_MESSAGE_LENGTH"
              :placeholder="t('feedbackWidget.messagePlaceholder')"
              class="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {{ t('feedbackWidget.messageHint', { count: MAX_MESSAGE_LENGTH }) }}
            </p>
          </label>

          <label class="block">
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {{ t('feedbackWidget.emailLabel') }}
            </span>
            <input
              v-model="form.email"
              type="email"
              :placeholder="t('feedbackWidget.emailPlaceholder')"
              class="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
          </label>

          <div class="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <p class="font-semibold text-slate-800 dark:text-slate-100">
              {{ t('feedbackWidget.diagnosticTitle') }}
            </p>
            <p class="mt-1 break-words">
              {{ t('feedbackWidget.diagnosticLine', { code: diagnosticCode, path: currentPath }) }}
            </p>
            <p class="mt-1 text-slate-500 dark:text-slate-400">
              {{ t('feedbackWidget.privacyHint') }}
            </p>
          </div>

          <div
            v-if="errorState"
            class="rounded-lg border px-4 py-3 text-sm leading-6"
            :class="errorState.tone === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100'
              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-100'"
          >
            <div class="flex gap-3">
              <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" />
              <div class="min-w-0">
                <p class="font-semibold">{{ errorState.title }}</p>
                <p class="mt-1">{{ errorState.message }}</p>
                <p class="mt-1 text-xs opacity-80">
                  {{ errorState.supportHint }}
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400"
            :disabled="submitting"
          >
            <Loader2
              v-if="submitting"
              class="h-4 w-4 animate-spin"
            />
            {{ submitting ? t('feedbackWidget.submitting') : t('feedbackWidget.submit') }}
          </button>
        </form>
      </div>
    </section>
  </div>
</template>
