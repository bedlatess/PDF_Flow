<template>
  <div class="space-y-6 prose dark:prose-invert max-w-none">
    <h2>{{ t('enterprise.docs.title') }}</h2>

    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <p class="text-sm text-blue-900 dark:text-blue-300 mb-0">
        {{ t('enterprise.docs.intro') }}
      </p>
    </div>

    <h3>{{ t('enterprise.docs.authentication') }}</h3>
    <p>{{ t('enterprise.docs.authDescription') }}</p>

    <div class="bg-slate-900 rounded-lg p-4 overflow-x-auto">
      <pre class="text-sm text-slate-100 mb-0"><code>curl https://api.pdf-flow.com/api/v1/files/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@document.pdf"</code></pre>
    </div>

    <h3>{{ t('enterprise.docs.endpoints') }}</h3>

    <div class="space-y-4">
      <!-- Upload File -->
      <div class="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-mono rounded">
            POST
          </span>
          <code class="text-sm">/api/v1/files/upload</code>
        </div>
        <p class="text-sm text-slate-600 dark:text-slate-400">
          {{ t('enterprise.docs.uploadDescription') }}
        </p>
      </div>

      <!-- Merge PDFs -->
      <div class="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-mono rounded">
            POST
          </span>
          <code class="text-sm">/api/v1/files/merge</code>
        </div>
        <p class="text-sm text-slate-600 dark:text-slate-400">
          {{ t('enterprise.docs.mergeDescription') }}
        </p>
      </div>

      <!-- Split PDF -->
      <div class="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-mono rounded">
            POST
          </span>
          <code class="text-sm">/api/v1/files/split</code>
        </div>
        <p class="text-sm text-slate-600 dark:text-slate-400">
          {{ t('enterprise.docs.splitDescription') }}
        </p>
      </div>

      <!-- OCR -->
      <div class="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-mono rounded">
            POST
          </span>
          <code class="text-sm">/api/v1/files/ocr</code>
        </div>
        <p class="text-sm text-slate-600 dark:text-slate-400">
          {{ t('enterprise.docs.ocrDescription') }}
        </p>
      </div>

      <!-- Get Job Status -->
      <div class="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-mono rounded">
            GET
          </span>
          <code class="text-sm">/api/v1/files/jobs/:job_id</code>
        </div>
        <p class="text-sm text-slate-600 dark:text-slate-400">
          {{ t('enterprise.docs.jobStatusDescription') }}
        </p>
      </div>

      <!-- Download Result -->
      <div class="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-mono rounded">
            GET
          </span>
          <code class="text-sm">/api/v1/files/download/:job_id</code>
        </div>
        <p class="text-sm text-slate-600 dark:text-slate-400">
          {{ t('enterprise.docs.downloadDescription') }}
        </p>
      </div>
    </div>

    <h3>{{ t('enterprise.docs.webhooks') }}</h3>
    <p>{{ t('enterprise.docs.webhooksDescription') }}</p>

    <div class="bg-slate-900 rounded-lg p-4 overflow-x-auto">
      <pre class="text-sm text-slate-100 mb-0"><code>{
  "event_type": "job.completed",
  "event_id": "evt_123456",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "job_id": "job_789",
    "status": "completed",
    "result_url": "https://..."
  },
  "signature": "hmac_sha256_signature"
}</code></pre>
    </div>

    <h3>{{ t('enterprise.docs.rateLimits') }}</h3>
    <p>{{ t('enterprise.docs.rateLimitsDescription') }}</p>

    <ul>
      <li>{{ t('enterprise.docs.rateLimitDefault') }}</li>
      <li>{{ t('enterprise.docs.rateLimitCustom') }}</li>
      <li>{{ t('enterprise.docs.rateLimitHeaders') }}</li>
    </ul>

    <h3>{{ t('enterprise.docs.errorHandling') }}</h3>
    <p>{{ t('enterprise.docs.errorHandlingDescription') }}</p>

    <div class="bg-slate-900 rounded-lg p-4 overflow-x-auto">
      <pre class="text-sm text-slate-100 mb-0"><code>{
  "detail": "Error message",
  "error_code": "INVALID_FILE_TYPE",
  "status_code": 400
}</code></pre>
    </div>

    <div class="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mt-6">
      <p class="text-sm text-slate-600 dark:text-slate-400 mb-2">
        {{ t('enterprise.docs.needHelp') }}
      </p>
      <p class="text-sm mb-0">
        📧 <a href="mailto:enterprise@pdf-flow.com" class="text-blue-600 dark:text-blue-400 hover:underline">
          enterprise@pdf-flow.com
        </a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
