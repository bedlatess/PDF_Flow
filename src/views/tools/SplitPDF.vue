<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import Button from '@/components/common/Button.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import PageSelector from '@/components/pdf/PageSelector.vue'
import PDFViewer from '@/components/pdf/PDFViewer.vue'
import CloudToggle from '@/components/common/CloudToggle.vue'
import { getPDFPageCount } from '@/utils/pdf/merge'
import { memoryManager } from '@/utils/memory-manager'
import { usePDFWorker } from '@/composables/usePDFWorker'
import { useCloudProcessing } from '@/composables/useCloudProcessing'
import { fileAPI } from '@/services/api'
import { historyManager } from '@/utils/history-manager'

const { t } = useI18n()

const selectedFile = ref<File | null>(null)
const totalPages = ref(0)
const pageRanges = ref('')
const useVisualSelector = ref(false)
const useCloud = ref(false)
const showPageSelector = ref(false)
const showPDFViewer = ref(false)
const isProcessing = ref(false)
const processingProgress = ref(0)
const processingStatus = ref('')
const showSuccessModal = ref(false)
const resultUrl = ref('')
const errorMessage = ref('')

const { submitTask, getTask, waitForTask, destroyWorker } = usePDFWorker()
const { cloudProgress, cloudPhase, processInCloud } = useCloudProcessing()

const handleFilesSelected = async (files: File[]) => {
  try {
    selectedFile.value = files[0]
    totalPages.value = await getPDFPageCount(files[0])
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load PDF'
  }
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const clearAll = () => {
  selectedFile.value = null
  totalPages.value = 0
  pageRanges.value = ''
  useVisualSelector.value = false
  showPageSelector.value = false
  errorMessage.value = ''
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
}

// 打开可视化选择器
const openPageSelector = () => {
  showPageSelector.value = true
}

// 页面选择确认
const handlePageSelect = (pages: number[]) => {
  if (pages.length === 0) {
    errorMessage.value = '请至少选择一页'
    return
  }

  // 将页面数组转换为范围字符串
  pageRanges.value = formatPagesAsRanges(pages)
  showPageSelector.value = false
  useVisualSelector.value = true
}

// 取消选择
const handlePageSelectCancel = () => {
  showPageSelector.value = false
}

// 打开 PDF 预览
const handlePreview = () => {
  showPDFViewer.value = true
}

// 关闭 PDF 预览
const handleCloseViewer = () => {
  showPDFViewer.value = false
}

// 将页面数组格式化为范围字符串（如 [1,2,3,5,7,8,9] -> "1-3,5,7-9"）
const formatPagesAsRanges = (pages: number[]): string => {
  if (pages.length === 0) return ''

  const sorted = [...pages].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let end = sorted[0]

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      if (start === end) {
        ranges.push(`${start}`)
      } else if (end === start + 1) {
        ranges.push(`${start},${end}`)
      } else {
        ranges.push(`${start}-${end}`)
      }
      if (i < sorted.length) {
        start = sorted[i]
        end = sorted[i]
      }
    }
  }

  return ranges.join(',')
}

const extractPages = async () => {
  if (!selectedFile.value) return
  if (!pageRanges.value.trim()) {
    errorMessage.value = '请输入要提取的页面范围（如 1-3,5,7-9）'
    return
  }

  // 云端处理路径
  if (useCloud.value) {
    await splitInCloud()
    return
  }

  isProcessing.value = true
  processingProgress.value = 0
  processingStatus.value = '准备处理...'
  errorMessage.value = ''

  try {
    processingStatus.value = '正在提取页面...'
    const taskId = await submitTask('split', {
      file: selectedFile.value,
      options: { ranges: pageRanges.value },
    })

    // 轮询任务进度
    const progressInterval = setInterval(() => {
      const task = getTask(taskId)
      if (task) {
        processingProgress.value = task.progress
        if (task.progress < 100) {
          processingStatus.value = `处理中... ${Math.round(task.progress)}%`
        }
      }
    }, 100)

    const blob = await waitForTask(taskId) as Blob
    clearInterval(progressInterval)

    processingProgress.value = 100
    processingStatus.value = '处理完成！'

    resultUrl.value = memoryManager.createTemporaryURL(blob)

    // 添加到历史记录
    historyManager.addHistory({
      type: 'split',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: blob.size,
    })

    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '拆分 PDF 失败'
  } finally {
    isProcessing.value = false
    processingProgress.value = 0
    processingStatus.value = ''
  }
}

/**
 * 云端拆分：上传 → 提交拆分任务 → 轮询 → 下载
 */
const splitInCloud = async () => {
  if (!selectedFile.value) return
  isProcessing.value = true
  errorMessage.value = ''

  try {
    // 解析页面范围字符串为二维数组 [[1,3], [5], [7,9]]
    const ranges = pageRanges.value.split(',').map(range => {
      const parts = range.trim().split('-').map(Number)
      return parts.length === 1 ? [parts[0], parts[0]] : parts
    })

    const blob = await processInCloud(selectedFile.value, (fileId) =>
      fileAPI.splitPDF(fileId, ranges)
    )

    resultUrl.value = memoryManager.createTemporaryURL(blob)

    // 添加到历史记录
    historyManager.addHistory({
      type: 'split',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: blob.size,
    })

    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '云端拆分失败'
  } finally {
    isProcessing.value = false
  }
}

const downloadResult = () => {
  if (!resultUrl.value) return
  const link = document.createElement('a')
  link.href = resultUrl.value
  link.download = `split-${new Date().toISOString().slice(0, 10)}.pdf`
  link.click()
  showSuccessModal.value = false
}

// 清理资源
onUnmounted(() => {
  destroyWorker()
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
  }
})
</script>

<template>
  <div class="tool-page-container min-h-screen bg-background-light p-8 dark:bg-background-dark">
    <div class="mx-auto max-w-4xl">
      <div class="mb-8">
        <h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          {{ t('tools.split.title') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-300">
          {{ t('tools.split.desc') }}
        </p>
      </div>

      <div
        v-if="errorMessage"
        class="mb-4 rounded-lg bg-error-light p-4 text-error-dark dark:bg-error/20 dark:text-error"
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
        <FilePreview
          :file="selectedFile"
          @remove="clearAll"
          @preview="handlePreview"
        />

        <!-- 本地 / 云端处理切换 -->
        <CloudToggle v-model="useCloud" />

        <div class="rounded-lg bg-white p-6 dark:bg-gray-800">
          <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            页面范围（共 {{ totalPages }} 页）
          </label>
          <div class="flex gap-2">
            <input
              v-model="pageRanges"
              type="text"
              placeholder="例如: 1-3,5,7-9"
              :class="[
                'flex-1 rounded-lg border px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:bg-gray-700 dark:text-white',
                useVisualSelector
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 dark:border-gray-600',
              ]"
            >
            <Button
              variant="outline"
              size="md"
              @click="openPageSelector"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
                />
              </svg>
              <span class="ml-2">可视化选择</span>
            </Button>
          </div>
          <p class="mt-2 text-xs text-gray-500">
            用逗号分隔单页或范围，例如 1-3,5 表示提取第 1、2、3、5 页，或点击"可视化选择"直观选择页面
          </p>
        </div>

        <div class="space-y-4">
          <!-- Progress Bar -->
          <ProgressBar
            v-if="isProcessing"
            :progress="processingProgress"
            :label="processingStatus"
            variant="primary"
            size="md"
          />

          <!-- Extract Button -->
          <Button
            variant="primary"
            size="lg"
            :loading="isProcessing"
            full-width
            @click="extractPages"
          >
            {{ isProcessing ? t('common.processing') : '提取页面' }}
          </Button>
        </div>
      </div>

      <!-- Page Selector Modal -->
      <Modal
        v-model="showPageSelector"
        title="选择要提取的页面"
        size="xl"
      >
        <PageSelector
          v-if="selectedFile && showPageSelector"
          :file="selectedFile"
          :total-pages="totalPages"
          @confirm="handlePageSelect"
          @cancel="handlePageSelectCancel"
        />
      </Modal>

      <!-- PDF Viewer Modal -->
      <Modal
        v-model="showPDFViewer"
        title=""
        size="full"
      >
        <PDFViewer
          v-if="selectedFile && showPDFViewer"
          :file="selectedFile"
          @close="handleCloseViewer"
        />
      </Modal>

      <!-- Success Modal -->
      <Modal
        v-model="showSuccessModal"
        title="拆分完成！"
        size="md"
      >
        <div class="text-center">
          <p class="mb-6 text-gray-600 dark:text-gray-300">
            页面已成功提取
          </p>
          <Button
            variant="primary"
            size="lg"
            full-width
            @click="downloadResult"
          >
            {{ t('common.download') }}
          </Button>
        </div>
      </Modal>
    </div>
  </div>
</template>
