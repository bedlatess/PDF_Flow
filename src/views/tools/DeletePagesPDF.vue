<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Scissors } from 'lucide-vue-next'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import PageSelector from '@/components/pdf/PageSelector.vue'
import PDFViewer from '@/components/pdf/PDFViewer.vue'
import ToolPageShell from '@/components/tools/ToolPageShell.vue'
import { getPDFPageCount } from '@/utils/pdf/merge'
import { deletePDFPages, parsePageRanges } from '@/utils/pdf/split'
import { memoryManager } from '@/utils/memory-manager'
import { historyManager } from '@/utils/history-manager'

const { t, tm } = useI18n()

type ToolPageCopy = Record<string, any>

const selectedFile = ref<File | null>(null)
const totalPages = ref(0)
const pageRanges = ref('')
const selectedFromVisual = ref(false)
const showPageSelector = ref(false)
const showPDFViewer = ref(false)
const showSuccessModal = ref(false)
const isProcessing = ref(false)
const processingProgress = ref(0)
const processingStatus = ref('')
const resultUrl = ref('')
const errorMessage = ref('')

const copy = computed<ToolPageCopy>(() => ({
  ...(tm('tools.deletePages.page') as ToolPageCopy),
  rangeLabel: t('tools.deletePages.page.rangeLabel', { count: totalPages.value }),
}))

const selectedPageNumbers = computed(() =>
  totalPages.value > 0 ? parsePageRanges(pageRanges.value, totalPages.value) : []
)

const remainingPages = computed(() =>
  Math.max(totalPages.value - selectedPageNumbers.value.length, 0)
)

const handleFilesSelected = async (files: File[]) => {
  try {
    clearResult()
    selectedFile.value = files[0]
    totalPages.value = await getPDFPageCount(files[0])
    pageRanges.value = ''
    selectedFromVisual.value = false
    errorMessage.value = ''
  } catch (error) {
    selectedFile.value = null
    totalPages.value = 0
    errorMessage.value = error instanceof Error ? error.message : copy.value.errorLoad
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
}

const clearAll = () => {
  selectedFile.value = null
  totalPages.value = 0
  pageRanges.value = ''
  selectedFromVisual.value = false
  showPageSelector.value = false
  showPDFViewer.value = false
  errorMessage.value = ''
  clearResult()
}

const formatPagesAsRanges = (pages: number[]) => {
  if (pages.length === 0) return ''

  const sorted = [...pages].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let end = sorted[0]

  for (let index = 1; index <= sorted.length; index += 1) {
    if (index < sorted.length && sorted[index] === end + 1) {
      end = sorted[index]
      continue
    }

    ranges.push(start === end ? `${start}` : `${start}-${end}`)

    if (index < sorted.length) {
      start = sorted[index]
      end = sorted[index]
    }
  }

  return ranges.join(',')
}

const handlePageSelect = (pages: number[]) => {
  if (pages.length === 0) {
    errorMessage.value = copy.value.errorNoPages
    return
  }

  pageRanges.value = formatPagesAsRanges(pages)
  selectedFromVisual.value = true
  showPageSelector.value = false
  errorMessage.value = ''
}

const validateSelection = () => {
  if (!pageRanges.value.trim()) {
    errorMessage.value = copy.value.errorNoRange
    return false
  }

  if (selectedPageNumbers.value.length === 0) {
    errorMessage.value = copy.value.errorNoPages
    return false
  }

  if (selectedPageNumbers.value.length >= totalPages.value) {
    errorMessage.value = copy.value.errorAllPages
    return false
  }

  return true
}

const deletePages = async () => {
  if (!selectedFile.value || !validateSelection()) return

  isProcessing.value = true
  processingProgress.value = 10
  processingStatus.value = copy.value.statusPreparing
  errorMessage.value = ''
  clearResult()

  try {
    processingProgress.value = 45
    processingStatus.value = copy.value.statusProcessing
    const blob = await deletePDFPages(selectedFile.value, selectedPageNumbers.value)

    processingProgress.value = 100
    processingStatus.value = copy.value.statusDone
    resultUrl.value = memoryManager.createTemporaryURL(blob)

    historyManager.addHistory({
      type: 'deletePages',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: blob.size,
    })

    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : copy.value.errorFailed
  } finally {
    isProcessing.value = false
    processingProgress.value = 0
    processingStatus.value = ''
  }
}

const downloadResult = () => {
  if (!resultUrl.value) return
  const link = document.createElement('a')
  link.href = resultUrl.value
  link.download = `pages-removed-${new Date().toISOString().slice(0, 10)}.pdf`
  link.click()
  showSuccessModal.value = false
}

onUnmounted(clearResult)
</script>

<template>
  <ToolPageShell
      :title="copy.title"
      :subtitle="copy.subtitle"
      :badge="copy.badge"
      accent="pink"
    width="md"
  >

      <template #badgeIcon>
        <Scissors class="h-4 w-4" />
      </template>
      <div
        v-if="errorMessage"
        class="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 shadow-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-100"
      >
        {{ errorMessage }}
      </div>

      <DragDropZone
        v-if="!selectedFile"
        accept="pdf"
        :multiple="false"
        @files-selected="handleFilesSelected"
        @error="handleError"
      />

      <div
        v-else
        class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
      >
        <div class="space-y-6">
          <FilePreview
            :file="selectedFile"
            @remove="clearAll"
            @preview="showPDFViewer = true"
          />

          <Card class="rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">
                  {{ copy.setupLabel }}
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {{ copy.setupTitle }}
                </h2>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.setupDesc }}
                </p>
              </div>

              <div>
                <label
                  for="delete-pages-range"
                  class="mb-2 block text-sm font-medium text-slate-900 dark:text-white"
                >
                  {{ copy.rangeLabel }}
                </label>
                <div class="flex gap-2">
                  <input
                    id="delete-pages-range"
                    v-model="pageRanges"
                    type="text"
                    :placeholder="copy.rangePlaceholder"
                    :class="[
                      'flex-1 rounded-md border px-4 py-3 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10 dark:bg-slate-900 dark:text-white',
                      selectedFromVisual ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-500/10' : 'border-slate-300 dark:border-slate-700',
                    ]"
                    @input="selectedFromVisual = false"
                  >
                  <Button
                    variant="outline"
                    size="md"
                    @click="showPageSelector = true"
                  >
                    {{ copy.visualSelect }}
                  </Button>
                </div>
                <p class="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">
                  {{ copy.rangeHint }}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card class="rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
          <div class="space-y-5">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">
                {{ copy.outputLabel }}
              </p>
              <h3 class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                {{ copy.outputTitle }}
              </h3>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-[22px] border border-rose-100 bg-rose-50/80 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">
                  {{ copy.removeLabel }}
                </p>
                <p class="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                  {{ selectedPageNumbers.length }}
                </p>
              </div>
              <div class="rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                  {{ copy.keepLabel }}
                </p>
                <p class="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                  {{ remainingPages }}
                </p>
              </div>
            </div>

            <div class="rounded-md border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <ul class="space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <li
                  v-for="tip in copy.outputTips"
                  :key="tip"
                >
                  {{ tip }}
                </li>
              </ul>
            </div>

            <ProgressBar
              v-if="isProcessing"
              :progress="processingProgress"
              :label="processingStatus"
              variant="primary"
              size="md"
            />

            <Button
              variant="danger"
              size="lg"
              :loading="isProcessing"
              full-width
              @click="deletePages"
            >
              {{ isProcessing ? copy.statusProcessing : copy.delete }}
            </Button>
          </div>
        </Card>
      </div>

      <Modal
        v-model="showPageSelector"
        :title="copy.modalTitle"
        size="xl"
      >
        <PageSelector
          v-if="selectedFile && showPageSelector"
          :file="selectedFile"
          :total-pages="totalPages"
          @confirm="handlePageSelect"
          @cancel="showPageSelector = false"
        />
      </Modal>

      <Modal
        v-model="showPDFViewer"
        title=""
        size="full"
      >
        <PDFViewer
          v-if="selectedFile && showPDFViewer"
          :file="selectedFile"
          @close="showPDFViewer = false"
        />
      </Modal>

      <Modal
        v-model="showSuccessModal"
        :title="copy.successTitle"
        size="md"
      >
        <div class="text-center">
          <p class="mb-6 text-slate-600 dark:text-slate-300">
            {{ copy.successMessage }}
          </p>
          <Button
            variant="primary"
            size="lg"
            full-width
            @click="downloadResult"
          >
            {{ copy.download }}
          </Button>
        </div>
      </Modal>
  </ToolPageShell>
</template>
