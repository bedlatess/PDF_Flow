<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileText,
  ScanText,
  Sparkles,
  TextCursorInput,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import ToolPageShell from '@/components/tools/ToolPageShell.vue'
import ToolNoticeBar from '@/components/tools/ToolNoticeBar.vue'
import { formatFileSize } from '@/utils/file-validator'
import { historyManager } from '@/utils/history-manager'
import { extractTextFromPDF, type ExtractedTextResult } from '@/utils/pdf/textExtraction'

const { t, tm } = useI18n()

type ToolPageCopy = Record<string, any>

const selectedFile = ref<File | null>(null)
const result = ref<ExtractedTextResult | null>(null)
const isProcessing = ref(false)
const progress = ref(0)
const status = ref('')
const errorMessage = ref('')
const copied = ref(false)

const copy = computed<ToolPageCopy>(() => tm('tools.extractText.page') as ToolPageCopy)

const hasText = computed(() => result.value?.pages.some((page) => page.text.trim().length > 0) ?? false)
const canExtract = computed(() => !!selectedFile.value && !isProcessing.value)

const handleFilesSelected = (files: File[]) => {
  const file = files[0]
  if (!file) return

  selectedFile.value = file
  result.value = null
  errorMessage.value = ''
  copied.value = false
  progress.value = 0
  status.value = ''
}

const removeFile = () => {
  selectedFile.value = null
  result.value = null
  errorMessage.value = ''
  copied.value = false
  progress.value = 0
  status.value = ''
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const extractText = async () => {
  if (!selectedFile.value) return

  isProcessing.value = true
  progress.value = 20
  status.value = copy.value.processing
  errorMessage.value = ''
  copied.value = false

  try {
    progress.value = 60
    const extracted = await extractTextFromPDF(selectedFile.value, {
      pageLabel: (pageNumber) => t('tools.extractText.page.pageLabel', { page: pageNumber }),
    })
    result.value = extracted
    progress.value = 100
    status.value = copy.value.ready

    historyManager.addHistory({
      type: 'extractText',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: new Blob([extracted.text], { type: 'text/plain;charset=utf-8' }).size,
    })
  } catch {
    result.value = null
    errorMessage.value = copy.value.errorFailed
  } finally {
    isProcessing.value = false
  }
}

const copyResult = async () => {
  if (!result.value?.text) return

  try {
    await navigator.clipboard.writeText(result.value.text)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 1800)
  } catch {
    errorMessage.value = copy.value.copyFailed
  }
}

const downloadResult = () => {
  if (!selectedFile.value || !result.value?.text) return

  const blob = new Blob([result.value.text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = selectedFile.value.name.replace(/\.pdf$/i, '') + '-text.txt'
  link.click()
  URL.revokeObjectURL(url)
}

onUnmounted(() => {
  copied.value = false
})
</script>

<template>
  <ToolPageShell
      :title="copy.title"
      :subtitle="copy.subtitle"
      :badge="copy.badge"
      accent="cyan"
    width="lg"
  >

      <template #badgeIcon>
        <TextCursorInput class="h-4 w-4" />
      </template>
      <ToolNoticeBar variant="blue">
        <template #icon>
          <ScanText class="h-5 w-5" />
        </template>
        {{ copy.notice }}
      </ToolNoticeBar>

      <div
        v-if="errorMessage"
        class="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 shadow-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-100"
      >
        {{ errorMessage }}
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div class="space-y-6">
          <Card class="rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-6">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600">
                  {{ copy.uploadLabel }}
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {{ selectedFile ? copy.uploadTitleReady : copy.uploadTitleIdle }}
                </h2>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ selectedFile ? copy.uploadDescriptionReady : copy.uploadDescriptionIdle }}
                </p>
              </div>

              <DragDropZone
                v-if="!selectedFile"
                accept="pdf"
                :multiple="false"
                :max-files="1"
                @files-selected="handleFilesSelected"
                @error="handleError"
              >
                <template #icon>
                  <FileText class="h-12 w-12" />
                </template>
                <template #title>
                  {{ copy.dropTitle }}
                </template>
                <template #subtitle>
                  {{ copy.dropSubtitle }}
                </template>
              </DragDropZone>

              <FilePreview
                v-else
                :file="selectedFile"
                @remove="removeFile"
              />

              <ProgressBar
                v-if="isProcessing || result"
                :progress="progress"
                :label="status"
                variant="primary"
                size="md"
              />

              <div class="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="primary"
                  size="lg"
                  :loading="isProcessing"
                  :disabled="!canExtract"
                  full-width
                  @click="extractText"
                >
                  <TextCursorInput class="mr-2 h-4 w-4" />
                  {{ isProcessing ? copy.processing : copy.action }}
                </Button>
                <Button
                  v-if="selectedFile"
                  variant="ghost"
                  size="lg"
                  full-width
                  @click="removeFile"
                >
                  {{ copy.remove }}
                </Button>
              </div>
            </div>
          </Card>

          <Card class="overflow-hidden rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
                <div>
                  <h3 class="text-xl font-semibold text-slate-900 dark:text-white">
                    {{ copy.localTitle }}
                  </h3>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {{ copy.localBody }}
                  </p>
                </div>
                <div class="grid gap-3">
                  <div
                    v-for="(step, index) in [copy.step1, copy.step2, copy.step3]"
                    :key="step"
                    class="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">
                      {{ index + 1 }}
                    </span>
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {{ step }}
                    </span>
                  </div>
                </div>
            </div>
          </Card>
        </div>

        <div class="space-y-6">
          <Card class="rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600">
                    {{ copy.textPreview }}
                  </p>
                  <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                    {{ result ? copy.resultTitle : copy.textPreview }}
                  </h2>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {{ result ? copy.resultBody : copy.notice }}
                  </p>
                </div>
                <div
                  v-if="result"
                  class="flex shrink-0 gap-2"
                >
                  <Button
                    v-if="hasText"
                    variant="outline"
                    size="sm"
                    @click="copyResult"
                  >
                    <ClipboardCopy class="mr-2 h-4 w-4" />
                    {{ copied ? copy.copied : copy.copyText }}
                  </Button>
                  <Button
                    v-if="hasText"
                    variant="primary"
                    size="sm"
                    @click="downloadResult"
                  >
                    <Download class="mr-2 h-4 w-4" />
                    {{ copy.download }}
                  </Button>
                </div>
              </div>

              <div
                v-if="selectedFile"
                class="grid gap-3 sm:grid-cols-3"
              >
                <div class="rounded-md border border-cyan-100 bg-cyan-50/80 p-4 dark:border-cyan-500/20 dark:bg-cyan-500/10">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                    {{ copy.pageCount }}
                  </p>
                  <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {{ result?.pageCount || '-' }}
                  </p>
                </div>
                <div class="rounded-md border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {{ copy.characters }}
                  </p>
                  <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {{ result?.characterCount || '-' }}
                  </p>
                </div>
                <div class="rounded-md border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {{ copy.fileSize }}
                  </p>
                  <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {{ formatFileSize(selectedFile.size) }}
                  </p>
                </div>
              </div>

              <div
                v-if="result && !hasText"
                class="rounded-md border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/20 dark:bg-amber-500/10"
              >
                <div class="flex items-start gap-3">
                  <Sparkles class="mt-1 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-200" />
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                      {{ copy.emptyTitle }}
                    </h3>
                    <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {{ copy.emptyBody }}
                    </p>
                  </div>
                </div>
              </div>

              <div
                v-else-if="hasText"
                class="max-h-[620px] overflow-auto rounded-md border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-inner dark:border-slate-800"
              >
                <pre class="whitespace-pre-wrap break-words text-sm leading-7">{{ result?.text }}</pre>
              </div>

              <div
                v-else
                class="rounded-md border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center dark:border-slate-700 dark:bg-slate-950/35"
              >
                <FileText class="mx-auto h-12 w-12 text-cyan-500" />
                <p class="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {{ copy.uploadDescriptionReady }}
                </p>
              </div>
            </div>
          </Card>

          <Card
            v-if="hasText"
            class="rounded-lg border border-emerald-200 bg-emerald-50/90 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:shadow-none"
          >
            <div class="flex items-start gap-4">
              <CheckCircle2 class="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
              <div class="space-y-3">
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                  {{ copy.ready }}
                </h3>
                <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.resultBody }}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
  </ToolPageShell>
</template>
