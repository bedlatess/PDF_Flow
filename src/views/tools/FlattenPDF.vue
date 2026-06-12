<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BadgeCheck,
  Download,
  FileCheck2,
  Layers3,
  ShieldAlert,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import ToolPageShell from '@/components/tools/ToolPageShell.vue'
import ToolNoticeBar from '@/components/tools/ToolNoticeBar.vue'
import { flattenPDF } from '@/utils/pdf/flatten'
import { getPDFPageCount } from '@/utils/pdf/merge'
import { historyManager } from '@/utils/history-manager'
import { memoryManager } from '@/utils/memory-manager'

const { tm } = useI18n()

type ToolPageCopy = Record<string, any>

const selectedFile = ref<File | null>(null)
const pageCount = ref(0)
const fieldCount = ref<number | null>(null)
const isProcessing = ref(false)
const progress = ref(0)
const status = ref('')
const resultUrl = ref('')
const resultSize = ref(0)
const errorMessage = ref('')

const copy = computed<ToolPageCopy>(() => tm('tools.flatten.page') as ToolPageCopy)

const canFlatten = computed(() => !!selectedFile.value && !isProcessing.value)

const handleFilesSelected = async (files: File[]) => {
  try {
    clearResult()
    selectedFile.value = files[0]
    pageCount.value = await getPDFPageCount(files[0])
    fieldCount.value = null
    errorMessage.value = ''
  } catch {
    selectedFile.value = null
    pageCount.value = 0
    errorMessage.value = copy.value.errorLoad
  }
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const clearResult = () => {
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
  resultSize.value = 0
}

const removeFile = () => {
  selectedFile.value = null
  pageCount.value = 0
  fieldCount.value = null
  errorMessage.value = ''
  clearResult()
}

const flatten = async () => {
  if (!selectedFile.value) return

  isProcessing.value = true
  progress.value = 20
  status.value = copy.value.processing
  errorMessage.value = ''
  clearResult()

  try {
    progress.value = 65
    const result = await flattenPDF(selectedFile.value)
    fieldCount.value = result.fieldCount
    resultSize.value = result.blob.size
    progress.value = 100
    status.value = copy.value.done
    resultUrl.value = memoryManager.createTemporaryURL(result.blob)

    historyManager.addHistory({
      type: 'flatten',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: result.blob.size,
    })
  } catch {
    errorMessage.value = copy.value.errorFailed
  } finally {
    isProcessing.value = false
  }
}

const formatFileSize = (bytes: number) => {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

const downloadResult = () => {
  if (!resultUrl.value || !selectedFile.value) return
  const link = document.createElement('a')
  link.href = resultUrl.value
  link.download = selectedFile.value.name.replace(/\.pdf$/i, '') + '-flattened.pdf'
  link.click()
}

onUnmounted(clearResult)
</script>

<template>
  <ToolPageShell
      :title="copy.title"
      :subtitle="copy.subtitle"
      :badge="copy.badge"
      accent="blue"
    width="lg"
  >

      <template #badgeIcon>
        <Layers3 class="h-4 w-4" />
      </template>
      <ToolNoticeBar variant="blue">
        <template #icon>
          <ShieldAlert class="h-5 w-5" />
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
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-300">
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
                  <Layers3 class="h-12 w-12" />
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
            </div>
          </Card>

          <Card class="overflow-hidden rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
                <div>
                  <h3 class="text-xl font-semibold text-slate-900 dark:text-white">
                    {{ copy.localTitle }}
                  </h3>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {{ copy.localDesc }}
                  </p>
                </div>
                <div class="grid gap-3">
                  <div
                    v-for="(step, index) in [copy.step1, copy.step2, copy.step3]"
                    :key="step"
                    class="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-950">
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
                  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-300">
                    {{ copy.resultLabel }}
                  </p>
                  <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                    {{ resultUrl ? copy.successTitle : copy.waitingTitle }}
                  </h2>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {{ resultUrl ? copy.successMessage : copy.waitingBody }}
                  </p>
                </div>
                <Button
                  v-if="resultUrl"
                  variant="primary"
                  size="sm"
                  @click="downloadResult"
                >
                  <Download class="mr-2 h-4 w-4" />
                  {{ copy.download }}
                </Button>
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <div class="rounded-md border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {{ copy.pages }}
                  </p>
                  <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {{ pageCount || '-' }}
                  </p>
                </div>
                <div class="rounded-md border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {{ copy.fieldLabel }}
                  </p>
                  <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {{ fieldCount ?? '-' }}
                  </p>
                </div>
                <div class="rounded-md border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {{ copy.outputSize }}
                  </p>
                  <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {{ formatFileSize(resultSize) }}
                  </p>
                </div>
              </div>

              <ProgressBar
                v-if="isProcessing || resultUrl"
                :progress="progress"
                :label="status"
                variant="primary"
                size="md"
              />

              <div
                v-if="fieldCount === 0 && resultUrl"
                class="rounded-md border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10"
              >
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                  {{ copy.noFieldsTitle }}
                </h3>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.noFieldsBody }}
                </p>
              </div>

              <div class="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="primary"
                  size="lg"
                  :loading="isProcessing"
                  :disabled="!canFlatten"
                  full-width
                  @click="flatten"
                >
                  <FileCheck2 class="mr-2 h-4 w-4" />
                  {{ isProcessing ? copy.processing : copy.action }}
                </Button>
                <Button
                  v-if="resultUrl"
                  variant="outline"
                  size="lg"
                  full-width
                  @click="downloadResult"
                >
                  <Download class="mr-2 h-4 w-4" />
                  {{ copy.download }}
                </Button>
              </div>
            </div>
          </Card>

          <Card
            v-if="resultUrl"
            class="rounded-lg border border-emerald-200 bg-emerald-50/90 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:shadow-none"
          >
            <div class="flex items-start gap-4">
              <BadgeCheck class="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
              <div>
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                  {{ copy.successTitle }}
                </h3>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.successMessage }}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
  </ToolPageShell>
</template>
