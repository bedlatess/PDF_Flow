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
import ToolHeader from '@/components/tools/ToolHeader.vue'
import { getPDFPageCount } from '@/utils/pdf/merge'
import { deletePDFPages, parsePageRanges } from '@/utils/pdf/split'
import { memoryManager } from '@/utils/memory-manager'
import { historyManager } from '@/utils/history-manager'

const { locale } = useI18n()

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

const isZh = computed(() => locale.value.toLowerCase().startsWith('zh'))

const copy = computed(() => isZh.value
  ? {
      title: '删除 PDF 页面',
      subtitle: '移除不需要的页面，生成一份干净的新 PDF。',
      badge: '本地工具',
      setupLabel: '页面清理',
      setupTitle: '选择要删除的页面',
      setupDesc: '输入页码范围，或打开可视化选择器直接点选要移除的页面。处理会在浏览器本地完成，原文件不会被覆盖。',
      rangeLabel: `要删除的页面，共 ${totalPages.value} 页`,
      rangePlaceholder: '例如：2,4-6,9',
      rangeHint: '用逗号分隔单页或范围。示例 2,4-6 表示删除第 2、4、5、6 页。',
      visualSelect: '可视化选择',
      outputLabel: '输出确认',
      outputTitle: '生成移除页面后的新文件',
      outputTips: [
        '适合删除空白页、扫描错误页、重复页或不需要公开的页面。',
        '不会修改原 PDF，只会生成一份新的结果文件。',
        '为了避免误操作，不能一次删除全部页面。',
      ],
      delete: '删除选中页面',
      modalTitle: '选择要删除的页面',
      successTitle: '页面已删除',
      successMessage: '新的 PDF 已经生成，可以立即下载。',
      download: '下载结果',
      errorLoad: '无法读取这份 PDF，请重新选择文件后再试。',
      errorNoRange: '请输入要删除的页面，例如 2,4-6,9。',
      errorNoPages: '请至少选择一个要删除的页面。',
      errorAllPages: '不能删除全部页面，请至少保留一页。',
      errorFailed: '删除页面失败，请检查页码后再试。',
      statusPreparing: '正在准备文件...',
      statusProcessing: '正在删除页面...',
      statusDone: '处理完成',
    }
  : {
      title: 'Delete PDF Pages',
      subtitle: 'Remove unwanted pages and create a clean new PDF.',
      badge: 'Local tool',
      setupLabel: 'Page cleanup',
      setupTitle: 'Choose pages to remove',
      setupDesc: 'Enter page ranges or open the visual selector to pick the pages you want to remove. Processing runs locally in your browser and never overwrites the original file.',
      rangeLabel: `${totalPages.value} pages available`,
      rangePlaceholder: 'Example: 2,4-6,9',
      rangeHint: 'Separate single pages or ranges with commas. Example: 2,4-6 removes pages 2, 4, 5, and 6.',
      visualSelect: 'Visual selector',
      outputLabel: 'Output check',
      outputTitle: 'Create a new file without those pages',
      outputTips: [
        'Useful for removing blank pages, scanning mistakes, duplicate pages, or pages you do not want to share.',
        'The original PDF stays unchanged. A new result file is created.',
        'To prevent mistakes, you cannot delete every page at once.',
      ],
      delete: 'Delete selected pages',
      modalTitle: 'Choose pages to delete',
      successTitle: 'Pages deleted',
      successMessage: 'Your new PDF is ready to download.',
      download: 'Download result',
      errorLoad: 'Could not read this PDF. Please choose the file again and try once more.',
      errorNoRange: 'Enter the pages to delete, for example 2,4-6,9.',
      errorNoPages: 'Select at least one page to delete.',
      errorAllPages: 'You cannot delete every page. Keep at least one page.',
      errorFailed: 'Failed to delete pages. Please check the page range and try again.',
      statusPreparing: 'Preparing file...',
      statusProcessing: 'Deleting pages...',
      statusDone: 'Completed',
    })

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
  <div class="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-950 dark:to-rose-950/20">
    <ToolHeader
      :title="copy.title"
      :subtitle="copy.subtitle"
      :badge="copy.badge"
      accent="pink"
    >
      <template #badgeIcon>
        <Scissors class="h-4 w-4" />
      </template>
    </ToolHeader>

    <section class="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-6">
      <div
        v-if="errorMessage"
        class="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 shadow-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-100"
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

          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-rose-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
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
                <label class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">
                  {{ copy.rangeLabel }}
                </label>
                <div class="flex gap-2">
                  <input
                    v-model="pageRanges"
                    type="text"
                    :placeholder="copy.rangePlaceholder"
                    :class="[
                      'flex-1 rounded-2xl border px-4 py-3 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10 dark:bg-slate-900 dark:text-white',
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

        <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-rose-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
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
                  {{ isZh ? '将删除' : 'Remove' }}
                </p>
                <p class="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                  {{ selectedPageNumbers.length }}
                </p>
              </div>
              <div class="rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                  {{ isZh ? '将保留' : 'Keep' }}
                </p>
                <p class="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                  {{ remainingPages }}
                </p>
              </div>
            </div>

            <div class="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
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
    </section>
  </div>
</template>
