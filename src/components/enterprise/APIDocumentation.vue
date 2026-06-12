<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
          {{ t('enterprise.docs.eyebrow') }}
        </p>
        <h2 class="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
          {{ t('enterprise.docs.title') }}
        </h2>
        <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {{ t('enterprise.docs.intro') }}
        </p>
      </div>

      <div class="grid min-w-0 grid-cols-1 gap-2 text-xs sm:grid-cols-3 lg:w-[26rem]">
        <div
          v-for="signal in signals"
          :key="signal.label"
          class="rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        >
          <p class="font-medium text-slate-900 dark:text-white">{{ signal.label }}</p>
          <p class="mt-1 break-words text-slate-500 dark:text-slate-400">{{ signal.value }}</p>
        </div>
      </div>
    </div>

    <section class="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
      <div class="flex items-start gap-3">
        <ShieldCheck class="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
        <div class="min-w-0">
          <h3 class="text-base font-semibold text-slate-950 dark:text-white">
            {{ t('enterprise.docs.authentication') }}
          </h3>
          <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {{ t('enterprise.docs.authDescription') }}
          </p>
        </div>
      </div>

      <CodeBlock class="mt-4" :code="authExample" />
    </section>

    <section class="space-y-3">
      <div class="flex items-center gap-2">
        <FileText class="h-5 w-5 text-sky-600 dark:text-sky-300" />
        <h3 class="text-lg font-semibold text-slate-950 dark:text-white">
          {{ t('enterprise.docs.endpoints') }}
        </h3>
      </div>

      <div class="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
        <div
          v-for="endpoint in endpoints"
          :key="endpoint.path"
          class="grid gap-3 border-b border-slate-200 bg-white p-4 last:border-b-0 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[7rem_minmax(0,1fr)_9rem]"
        >
          <div>
            <span
              :class="[
                'inline-flex rounded px-2 py-1 font-mono text-xs font-semibold',
                endpoint.method === 'POST'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
              ]"
            >
              {{ endpoint.method }}
            </span>
          </div>
          <div class="min-w-0">
            <code class="block break-all text-sm font-semibold text-slate-950 dark:text-slate-100">
              {{ endpoint.path }}
            </code>
            <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {{ endpoint.description }}
            </p>
          </div>
          <div class="flex items-start md:justify-end">
            <span class="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {{ endpoint.mode }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div class="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div class="flex items-center gap-2">
          <Clock class="h-5 w-5 text-amber-600 dark:text-amber-300" />
          <h3 class="text-base font-semibold text-slate-950 dark:text-white">
            {{ t('enterprise.docs.workflow') }}
          </h3>
        </div>
        <ol class="mt-4 space-y-3">
          <li
            v-for="(step, index) in workflowSteps"
            :key="step"
            class="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300"
          >
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
              {{ index + 1 }}
            </span>
            <span>{{ step }}</span>
          </li>
        </ol>
      </div>

      <div class="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div class="flex items-center gap-2">
          <Webhook class="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
          <h3 class="text-base font-semibold text-slate-950 dark:text-white">
            {{ t('enterprise.docs.webhooks') }}
          </h3>
        </div>
        <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {{ t('enterprise.docs.webhooksDescription') }}
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="event in webhookEvents"
            :key="event"
            class="rounded border border-slate-200 px-2 py-1 font-mono text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            {{ event }}
          </span>
        </div>
        <p class="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {{ t('enterprise.docs.signatureDescription') }}
        </p>
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div class="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div class="flex items-center gap-2">
          <Activity class="h-5 w-5 text-slate-700 dark:text-slate-300" />
          <h3 class="text-base font-semibold text-slate-950 dark:text-white">
            {{ t('enterprise.docs.rateLimits') }}
          </h3>
        </div>
        <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <li v-for="item in rateLimitItems" :key="item" class="flex gap-2">
            <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>

      <div class="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
        <div class="flex items-start gap-3">
          <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <h3 class="text-base font-semibold text-amber-950 dark:text-amber-100">
              {{ t('enterprise.docs.paymentBoundary') }}
            </h3>
            <p class="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100/80">
              {{ t('enterprise.docs.paymentBoundaryDescription') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div class="flex items-center gap-2">
        <KeyRound class="h-5 w-5 text-slate-700 dark:text-slate-300" />
        <h3 class="text-base font-semibold text-slate-950 dark:text-white">
          {{ t('enterprise.docs.errorHandling') }}
        </h3>
      </div>
      <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {{ t('enterprise.docs.errorHandlingDescription') }}
      </p>

      <CodeBlock class="mt-4" :code="errorExample" />
    </section>

    <section class="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
      <p class="text-sm text-slate-600 dark:text-slate-300">
        {{ t('enterprise.docs.needHelp') }}
      </p>
      <p class="mt-2 flex items-center gap-2 text-sm">
        <Mail class="h-4 w-4 text-sky-600 dark:text-sky-300" />
        <a
          href="mailto:enterprise@pdf-flow.com"
          class="break-all font-medium text-sky-700 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
        >
          enterprise@pdf-flow.com
        </a>
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Activity,
  AlertTriangle,
  Clock,
  FileText,
  KeyRound,
  Mail,
  ShieldCheck,
  Webhook,
} from 'lucide-vue-next'

const { t } = useI18n()

const signals = computed(() => [
  { label: t('enterprise.docs.baseUrl'), value: t('enterprise.docs.baseUrlValue') },
  { label: t('enterprise.docs.apiKey'), value: t('enterprise.docs.apiKeyValue') },
  { label: t('enterprise.docs.asyncJobs'), value: t('enterprise.docs.asyncJobsValue') },
])

const endpoints = computed(() => [
  {
    method: 'POST',
    path: '/api/v1/files/upload',
    description: t('enterprise.docs.uploadDescription'),
    mode: t('enterprise.docs.modeUpload'),
  },
  {
    method: 'POST',
    path: '/api/v1/files/merge',
    description: t('enterprise.docs.mergeDescription'),
    mode: t('enterprise.docs.modeAsync'),
  },
  {
    method: 'POST',
    path: '/api/v1/files/split',
    description: t('enterprise.docs.splitDescription'),
    mode: t('enterprise.docs.modeAsync'),
  },
  {
    method: 'POST',
    path: '/api/v1/files/ocr',
    description: t('enterprise.docs.ocrDescription'),
    mode: t('enterprise.docs.modeCloud'),
  },
  {
    method: 'GET',
    path: '/api/v1/files/jobs/:job_id',
    description: t('enterprise.docs.jobStatusDescription'),
    mode: t('enterprise.docs.modePoll'),
  },
  {
    method: 'GET',
    path: '/api/v1/files/download/:job_id',
    description: t('enterprise.docs.downloadDescription'),
    mode: t('enterprise.docs.modeDownload'),
  },
] as const)

const workflowSteps = computed(() => [
  t('enterprise.docs.workflowUpload'),
  t('enterprise.docs.workflowProcess'),
  t('enterprise.docs.workflowNotify'),
  t('enterprise.docs.workflowDownload'),
])

const webhookEvents = ['job.completed', 'job.failed', 'quota.warning', 'quota.exceeded']

const rateLimitItems = computed(() => [
  t('enterprise.docs.rateLimitDefault'),
  t('enterprise.docs.rateLimitCustom'),
  t('enterprise.docs.rateLimitHeaders'),
])

const authExample = `curl https://api.pdf-flow.com/api/v1/files/upload \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@document.pdf"`

const errorExample = `{
  "detail": "Uploaded file type is not supported",
  "error_code": "INVALID_FILE_TYPE",
  "status_code": 400,
  "request_id": "req_01J..."
}`

const CodeBlock = defineComponent({
  props: {
    code: {
      type: String,
      required: true,
    },
  },
  setup(props, { attrs }) {
    return () =>
      h(
        'div',
        {
          ...attrs,
          class: ['overflow-x-auto rounded-md bg-slate-950 p-4', attrs.class],
        },
        h('pre', { class: 'min-w-max text-sm leading-6 text-slate-100' }, h('code', props.code))
      )
  },
})
</script>
