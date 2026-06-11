<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Layers3 } from 'lucide-vue-next'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import PageThumbnail from '@/components/pdf/PageThumbnail.vue'
import PDFViewer from '@/components/pdf/PDFViewer.vue'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import ToolHeader from '@/components/tools/ToolHeader.vue'
import { getPDFPageCount } from '@/utils/pdf/merge'
import { reorderPDFPages } from '@/utils/pdf/split'
import { memoryManager } from '@/utils/memory-manager'
import { historyManager } from '@/utils/history-manager'

interface PageItem {
  pageNumber: number
}

const { locale } = useI18n()

const selectedFile = ref<File | null>(null)
const pageItems = ref<PageItem[]>([])
const draggingIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
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
      title: '整理 PDF 页面',
      subtitle: '拖拽调整页面顺序，导出排好版的新 PDF。',
      badge: '本地工具',
      workspaceLabel: '页面工作台',
      workspaceTitle: '拖拽页面，排好顺序',
      workspaceDesc: '适合提交合同、报告、扫描件前调整页面顺序。所有处理都在浏览器本地完成，原文件不会被覆盖。',
      outputLabel: '输出确认',
      outputTitle: '确认顺序后生成新文件',
      outputTips: [
        '拖拽缩略图可以直接调整页面位置。',
        '移动端或不方便拖拽时，可以使用上移、下移按钮。',
        '导出时会包含全部页面，只改变页面顺序。',
      ],
      reverse: '反转顺序',
      reset: '恢复原顺序',
      moveUp: '上移',
      moveDown: '下移',
      generate: '生成整理后的 PDF',
      successTitle: '页面顺序已整理',
      successMessage: '新的 PDF 已经生成，可以立即下载。',
      download: '下载结果',
      errorLoad: '无法读取这份 PDF，请重新选择文件后再试。',
      errorNoChange: '当前页面顺序还没有变化，请先调整顺序后再生成。',
      errorFailed: '整理页面失败，请重新选择文件后再试。',
      statusPreparing: '正在准备页面...',
      statusProcessing: '正在生成新 PDF...',
      statusDone: '处理完成',
      pageCount: '页面数量',
      firstPage: '当前首页',
      lastPage: '当前末页',
      dragHint: '拖动卡片或使用按钮调整顺序',
      page: '第 {page} 页',
    }
  : {
      title: 'Organize PDF Pages',
      subtitle: 'Drag pages into the right order and export a new PDF.',
      badge: 'Local tool',
      workspaceLabel: 'Page workspace',
      workspaceTitle: 'Drag pages into order',
      workspaceDesc: 'Useful before submitting contracts, reports, or scanned files. Processing runs locally in your browser and never overwrites the original file.',
      outputLabel: 'Output check',
      outputTitle: 'Confirm the order, then create a new file',
      outputTips: [
        'Drag thumbnails to move pages directly.',
        'On mobile or when dragging is inconvenient, use the move up and move down buttons.',
        'The result keeps every page and only changes the order.',
      ],
      reverse: 'Reverse order',
      reset: 'Reset order',
      moveUp: 'Move up',
      moveDown: 'Move down',
      generate: 'Generate organized PDF',
      successTitle: 'Pages organized',
      successMessage: 'Your new PDF is ready to download.',
      download: 'Download result',
      errorLoad: 'Could not read this PDF. Please choose the file again and try once more.',
      errorNoChange: 'The page order has not changed yet. Move at least one page before generating.',
      errorFailed: 'Failed to organize pages. Please choose the file again and try once more.',
      statusPreparing: 'Preparing pages...',
      statusProcessing: 'Creating new PDF...',
      statusDone: 'Completed',
      pageCount: 'Pages',
      firstPage: 'First page',
      lastPage: 'Last page',
      dragHint: 'Drag cards or use the move buttons',
      page: 'Page {page}',
    })

const totalPages = computed(() => pageItems.value.length)
const orderedPages = computed(() => pageItems.value.map((item) => item.pageNumber))
const hasOrderChanged = computed(() =>
  orderedPages.value.some((pageNumber, index) => pageNumber !== index + 1)
)

const clearResult = () => {
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
}

const handleFilesSelected = async (files: File[]) => {
  try {
    clearResult()
    selectedFile.value = files[0]
    const count = await getPDFPageCount(files[0])
    pageItems.value = Array.from({ length: count }, (_, index) => ({ pageNumber: index + 1 }))
    errorMessage.value = ''
  } catch (error) {
    selectedFile.value = null
    pageItems.value = []
    errorMessage.value = error instanceof Error ? error.message : copy.value.errorLoad
  }
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const clearAll = () => {
  selectedFile.value = null
  pageItems.value = []
  draggingIndex.value = null
  dragOverIndex.value = null
  showPDFViewer.value = false
  errorMessage.value = ''
  clearResult()
}

const moveItem = (fromIndex: number, toIndex: number) => {
  if (fromIndex === toIndex || toIndex < 0 || toIndex >= pageItems.value.length) return

  const nextItems = [...pageItems.value]
  const [item] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, item)
  pageItems.value = nextItems
  errorMessage.value = ''
}

const handleDragStart = (event: DragEvent, index: number) => {
  draggingIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

const handleDragEnter = (event: DragEvent, index: number) => {
  event.preventDefault()
  if (draggingIndex.value !== null && draggingIndex.value !== index) {
    dragOverIndex.value = index
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDrop = (event: DragEvent, targetIndex: number) => {
  event.preventDefault()
  if (draggingIndex.value === null) return

  moveItem(draggingIndex.value, targetIndex)
  draggingIndex.value = null
  dragOverIndex.value = null
}

const handleDragEnd = () => {
  draggingIndex.value = null
  dragOverIndex.value = null
}

const reverseOrder = () => {
  pageItems.value = [...pageItems.value].reverse()
  errorMessage.value = ''
}

const resetOrder = () => {
  pageItems.value = pageItems.value
    .map((item) => item.pageNumber)
    .sort((a, b) => a - b)
    .map((pageNumber) => ({ pageNumber }))
  errorMessage.value = ''
}

const organizePages = async () => {
  if (!selectedFile.value) return

  if (!hasOrderChanged.value) {
    errorMessage.value = copy.value.errorNoChange
    return
  }

  isProcessing.value = true
  processingProgress.value = 10
  processingStatus.value = copy.value.statusPreparing
  errorMessage.value = ''
  clearResult()

  try {
    processingProgress.value = 45
    processingStatus.value = copy.value.statusProcessing
    const blob = await reorderPDFPages(selectedFile.value, orderedPages.value)

    processingProgress.value = 100
    processingStatus.value = copy.value.statusDone
    resultUrl.value = memoryManager.createTemporaryURL(blob)

    historyManager.addHistory({
      type: 'organize',
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
  link.download = `organized-${new Date().toISOString().slice(0, 10)}.pdf`
  link.click()
  showSuccessModal.value = false
}

onUnmounted(clearResult)
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/20">
    <ToolHeader
      :title="copy.title"
      :subtitle="copy.subtitle"
      :badge="copy.badge"
      accent="emerald"
    >
      <template #badgeIcon>
        <Layers3 class="h-4 w-4" />
      </template>
    </ToolHeader>

    <section class="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-6">
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
        class="space-y-6"
      >
        <div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div class="space-y-6">
            <FilePreview
              :file="selectedFile"
              @remove="clearAll"
              @preview="showPDFViewer = true"
            />

            <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-emerald-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
              <div class="space-y-5">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                    {{ copy.outputLabel }}
                  </p>
                  <h3 class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    {{ copy.outputTitle }}
                  </h3>
                </div>

                <div class="grid grid-cols-3 gap-3">
                  <div class="rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                    <p class="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                      {{ copy.pageCount }}
                    </p>
                    <p class="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {{ totalPages }}
                    </p>
                  </div>
                  <div class="rounded-[22px] border border-cyan-100 bg-cyan-50/80 p-4 dark:border-cyan-500/20 dark:bg-cyan-500/10">
                    <p class="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-600">
                      {{ copy.firstPage }}
                    </p>
                    <p class="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {{ orderedPages[0] || '-' }}
                    </p>
                  </div>
                  <div class="rounded-[22px] border border-amber-100 bg-amber-50/80 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <p class="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
                      {{ copy.lastPage }}
                    </p>
                    <p class="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {{ orderedPages[orderedPages.length - 1] || '-' }}
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
                  variant="primary"
                  size="lg"
                  :loading="isProcessing"
                  full-width
                  @click="organizePages"
                >
                  {{ isProcessing ? copy.statusProcessing : copy.generate }}
                </Button>
              </div>
            </Card>
          </div>

          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-emerald-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                  {{ copy.workspaceLabel }}
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {{ copy.workspaceTitle }}
                </h2>
                <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.workspaceDesc }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  @click="reverseOrder"
                >
                  {{ copy.reverse }}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="resetOrder"
                >
                  {{ copy.reset }}
                </Button>
              </div>
            </div>

            <p class="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
              {{ copy.dragHint }}
            </p>

            <div class="grid max-h-[680px] grid-cols-2 gap-4 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4">
              <article
                v-for="(item, index) in pageItems"
                :key="item.pageNumber"
                :class="[
                  'rounded-[24px] border p-3 transition-all duration-200',
                  dragOverIndex === index ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100 dark:border-emerald-300 dark:bg-emerald-500/10' : 'border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/40',
                  draggingIndex === index ? 'scale-95 opacity-60' : 'opacity-100',
                ]"
                draggable="true"
                @dragstart="handleDragStart($event, index)"
                @dragenter="handleDragEnter($event, index)"
                @dragover="handleDragOver"
                @drop="handleDrop($event, index)"
                @dragend="handleDragEnd"
              >
                <PageThumbnail
                  :file="selectedFile"
                  :page-number="item.pageNumber"
                  draggable
                  @dragstart="handleDragStart($event, index)"
                  @dragend="handleDragEnd"
                />

                <div class="mt-3 flex items-center justify-between gap-2">
                  <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {{ copy.page.replace('{page}', String(item.pageNumber)) }}
                  </span>
                  <div class="flex gap-1">
                    <button
                      class="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                      :disabled="index === 0"
                      type="button"
                      @click="moveItem(index, index - 1)"
                    >
                      {{ copy.moveUp }}
                    </button>
                    <button
                      class="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                      :disabled="index === pageItems.length - 1"
                      type="button"
                      @click="moveItem(index, index + 1)"
                    >
                      {{ copy.moveDown }}
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </Card>
        </div>
      </div>

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
