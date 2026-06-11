<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Hash } from 'lucide-vue-next'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import PDFViewer from '@/components/pdf/PDFViewer.vue'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import ToolHeader from '@/components/tools/ToolHeader.vue'
import { getPDFPageCount } from '@/utils/pdf/merge'
import { addPageNumbers, type PageNumberPosition } from '@/utils/pdf/pageNumbers'
import { memoryManager } from '@/utils/memory-manager'
import { historyManager } from '@/utils/history-manager'

const { locale } = useI18n()

const selectedFile = ref<File | null>(null)
const totalPages = ref(0)
const position = ref<PageNumberPosition>('bottom-center')
const startNumber = ref(1)
const startOnPage = ref(1)
const prefix = ref('')
const suffix = ref('')
const includeTotal = ref(false)
const fontSize = ref(12)
const opacity = ref(0.9)
const pageNumberColor = ref('#3f3f46')

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
      title: '添加 PDF 页码',
      subtitle: '为合同、报告和讲义添加统一页码。',
      badge: '本地工具',
      setupLabel: '页码样式',
      setupTitle: '设置编号格式和位置',
      setupDesc: '页码会直接写入新的 PDF 文件，适合归档、打印、提交或分享前统一文档格式。',
      outputLabel: '输出确认',
      outputTitle: '确认页码后生成新文件',
      outputTips: [
        '可以从指定页面开始添加页码，封面无需编号时很实用。',
        '支持中文前后缀，例如“第 1 页”。',
        '处理会在浏览器本地完成，原文件不会被覆盖。',
      ],
      position: '页码位置',
      startNumber: '起始编号',
      startOnPage: '从第几页开始添加',
      prefix: '前缀',
      suffix: '后缀',
      includeTotal: '显示总页数',
      fontSize: '字号',
      opacity: '透明度',
      color: '颜色',
      sample: '页码示例',
      generate: '添加页码',
      successTitle: '页码已添加',
      successMessage: '带页码的 PDF 已经生成，可以立即下载。',
      download: '下载结果',
      errorLoad: '无法读取这份 PDF，请重新选择文件后再试。',
      errorStartPage: '开始添加页码的页数不能超过 PDF 总页数。',
      errorFailed: '添加页码失败，请检查设置后再试。',
      statusPreparing: '正在准备页面...',
      statusProcessing: '正在写入页码...',
      statusDone: '处理完成',
      placeholders: {
        prefix: '例如：第 ',
        suffix: '例如： 页',
      },
      positions: [
        { value: 'bottom-center' as PageNumberPosition, label: '底部居中' },
        { value: 'bottom-left' as PageNumberPosition, label: '左下角' },
        { value: 'bottom-right' as PageNumberPosition, label: '右下角' },
        { value: 'top-center' as PageNumberPosition, label: '顶部居中' },
        { value: 'top-left' as PageNumberPosition, label: '左上角' },
        { value: 'top-right' as PageNumberPosition, label: '右上角' },
      ],
    }
  : {
      title: 'Add PDF Page Numbers',
      subtitle: 'Add consistent page numbers to contracts, reports, and handouts.',
      badge: 'Local tool',
      setupLabel: 'Numbering style',
      setupTitle: 'Set the format and position',
      setupDesc: 'Page numbers are written into a new PDF, which is useful before archiving, printing, submitting, or sharing a document.',
      outputLabel: 'Output check',
      outputTitle: 'Confirm the numbering, then create a new file',
      outputTips: [
        'Start numbering on a later page when the cover should stay unnumbered.',
        'Use prefix and suffix text to match your document style.',
        'Processing runs locally in your browser. The original file stays unchanged.',
      ],
      position: 'Position',
      startNumber: 'Start number',
      startOnPage: 'Start on page',
      prefix: 'Prefix',
      suffix: 'Suffix',
      includeTotal: 'Show total pages',
      fontSize: 'Font size',
      opacity: 'Opacity',
      color: 'Color',
      sample: 'Preview',
      generate: 'Add page numbers',
      successTitle: 'Page numbers added',
      successMessage: 'Your numbered PDF is ready to download.',
      download: 'Download result',
      errorLoad: 'Could not read this PDF. Please choose the file again and try once more.',
      errorStartPage: 'The start page cannot be greater than the total number of PDF pages.',
      errorFailed: 'Failed to add page numbers. Please check the settings and try again.',
      statusPreparing: 'Preparing pages...',
      statusProcessing: 'Writing page numbers...',
      statusDone: 'Completed',
      placeholders: {
        prefix: 'Example: Page ',
        suffix: '',
      },
      positions: [
        { value: 'bottom-center' as PageNumberPosition, label: 'Bottom center' },
        { value: 'bottom-left' as PageNumberPosition, label: 'Bottom left' },
        { value: 'bottom-right' as PageNumberPosition, label: 'Bottom right' },
        { value: 'top-center' as PageNumberPosition, label: 'Top center' },
        { value: 'top-left' as PageNumberPosition, label: 'Top left' },
        { value: 'top-right' as PageNumberPosition, label: 'Top right' },
      ],
    })

watch(isZh, (zh) => {
  if (!selectedFile.value && !prefix.value && !suffix.value) {
    prefix.value = zh ? '第 ' : ''
    suffix.value = zh ? ' 页' : ''
  }
}, { immediate: true })

const stampedPageCount = computed(() =>
  Math.max(totalPages.value - startOnPage.value + 1, 0)
)

const sampleText = computed(() => {
  const number = startNumber.value || 1
  return includeTotal.value
    ? `${prefix.value}${number} / ${stampedPageCount.value || totalPages.value || 1}${suffix.value}`
    : `${prefix.value}${number}${suffix.value}`
})

const selectedPositionLabel = computed(() =>
  copy.value.positions.find((item) => item.value === position.value)?.label || ''
)

const handleFilesSelected = async (files: File[]) => {
  try {
    clearResult()
    selectedFile.value = files[0]
    totalPages.value = await getPDFPageCount(files[0])
    startOnPage.value = Math.min(startOnPage.value, totalPages.value)
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
  showPDFViewer.value = false
  errorMessage.value = ''
  clearResult()
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const normalized = hex.replace('#', '')
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

const validateSettings = () => {
  if (startOnPage.value > totalPages.value) {
    errorMessage.value = copy.value.errorStartPage
    return false
  }

  return true
}

const applyPageNumbers = async () => {
  if (!selectedFile.value || !validateSettings()) return

  isProcessing.value = true
  processingProgress.value = 10
  processingStatus.value = copy.value.statusPreparing
  errorMessage.value = ''
  clearResult()

  try {
    processingProgress.value = 45
    processingStatus.value = copy.value.statusProcessing
    const blob = await addPageNumbers(selectedFile.value, {
      startNumber: startNumber.value,
      startOnPage: startOnPage.value,
      prefix: prefix.value,
      suffix: suffix.value,
      includeTotal: includeTotal.value,
      fontSize: fontSize.value,
      opacity: opacity.value,
      color: hexToRgb(pageNumberColor.value),
      position: position.value,
    })

    processingProgress.value = 100
    processingStatus.value = copy.value.statusDone
    resultUrl.value = memoryManager.createTemporaryURL(blob)

    historyManager.addHistory({
      type: 'pageNumbers',
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
  link.download = `numbered-${new Date().toISOString().slice(0, 10)}.pdf`
  link.click()
  showSuccessModal.value = false
}

onUnmounted(clearResult)
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/20">
    <ToolHeader
      :title="copy.title"
      :subtitle="copy.subtitle"
      :badge="copy.badge"
      accent="blue"
    >
      <template #badgeIcon>
        <Hash class="h-4 w-4" />
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
        class="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]"
      >
        <div class="space-y-6">
          <FilePreview
            :file="selectedFile"
            @remove="clearAll"
            @preview="showPDFViewer = true"
          />

          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-blue-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
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
                  {{ copy.position }}
                </label>
                <div class="grid gap-2 sm:grid-cols-2">
                  <button
                    v-for="option in copy.positions"
                    :key="option.value"
                    type="button"
                    :class="[
                      'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition',
                      position === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-300 dark:bg-blue-500/10 dark:text-blue-100'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:border-blue-200 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-300',
                    ]"
                    @click="position = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{{ copy.startNumber }}</span>
                  <input
                    v-model.number="startNumber"
                    type="number"
                    min="0"
                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{{ copy.startOnPage }}</span>
                  <input
                    v-model.number="startOnPage"
                    type="number"
                    min="1"
                    :max="totalPages"
                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                </label>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{{ copy.prefix }}</span>
                  <input
                    v-model="prefix"
                    type="text"
                    :placeholder="copy.placeholders.prefix"
                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{{ copy.suffix }}</span>
                  <input
                    v-model="suffix"
                    type="text"
                    :placeholder="copy.placeholders.suffix"
                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                </label>
              </div>

              <label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                <input
                  v-model="includeTotal"
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                >
                {{ copy.includeTotal }}
              </label>

              <div class="grid gap-4 sm:grid-cols-3">
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{{ copy.fontSize }}</span>
                  <input
                    v-model.number="fontSize"
                    type="number"
                    min="8"
                    max="36"
                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{{ copy.opacity }}</span>
                  <input
                    v-model.number="opacity"
                    type="number"
                    min="0.1"
                    max="1"
                    step="0.1"
                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{{ copy.color }}</span>
                  <input
                    v-model="pageNumberColor"
                    type="color"
                    class="h-[50px] w-full rounded-2xl border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
                  >
                </label>
              </div>
            </div>
          </Card>
        </div>

        <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-blue-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
          <div class="space-y-5">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
                {{ copy.outputLabel }}
              </p>
              <h3 class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                {{ copy.outputTitle }}
              </h3>
            </div>

            <div class="rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 dark:border-blue-500/20 dark:from-blue-500/10 dark:to-cyan-500/10">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-200">
                {{ copy.sample }}
              </p>
              <div class="mt-4 rounded-[22px] border border-white/80 bg-white/85 p-5 shadow-inner dark:border-white/10 dark:bg-slate-950/45">
                <div class="relative mx-auto aspect-[3/4] max-w-[220px] rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <span
                    :class="[
                      'absolute rounded-full bg-white/80 px-2 py-1 text-center font-semibold shadow-sm dark:bg-slate-800/90',
                      position.includes('bottom') ? 'bottom-4' : 'top-4',
                      position.endsWith('left') ? 'left-4' : position.endsWith('right') ? 'right-4' : 'left-1/2 -translate-x-1/2',
                    ]"
                    :style="{ color: pageNumberColor, opacity, fontSize: `${Math.min(fontSize, 18)}px` }"
                  >
                    {{ sampleText }}
                  </span>
                </div>
              </div>
              <p class="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {{ selectedPositionLabel }} · {{ stampedPageCount }} / {{ totalPages }} {{ isZh ? '页会添加页码' : 'pages will be numbered' }}
              </p>
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
              @click="applyPageNumbers"
            >
              {{ isProcessing ? copy.statusProcessing : copy.generate }}
            </Button>
          </div>
        </Card>
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
