<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import Button from '@/components/common/Button.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import PDFViewer from '@/components/pdf/PDFViewer.vue'
import { compressPDF, estimateCompressionRatio, formatCompressionInfo, type CompressionQuality, type CompressionResult } from '@/utils/pdf/compress'
import { memoryManager } from '@/utils/memory-manager'
import { usePDFWorker } from '@/composables/usePDFWorker'
import { useCloudProcessing } from '@/composables/useCloudProcessing'
import { fileAPI } from '@/services/api'
import CloudToggle from '@/components/common/CloudToggle.vue'
import { historyManager } from '@/utils/history-manager'

const { t } = useI18n()

const selectedFile = ref<File | null>(null)
const selectedQuality = ref<CompressionQuality>('medium')
const useCloud = ref(false)
const isProcessing = ref(false)
const processingProgress = ref(0)
const processingStatus = ref('')
const showSuccessModal = ref(false)
const showPDFViewer = ref(false)
const resultUrl = ref('')
const resultFileName = ref('')
const compressionResult = ref<CompressionResult | null>(null)
const errorMessage = ref('')

const { destroyWorker } = usePDFWorker()
const { cloudProgress, cloudPhase, processInCloud } = useCloudProcessing()

const qualityOptions: { value: CompressionQuality; label: string; description: string }[] = [
  { value: 'high', label: '高质量', description: '轻度压缩，保持最佳质量（约 10% 压缩）' },
  { value: 'medium', label: '平衡', description: '中度压缩，平衡质量和大小（约 20% 压缩）' },
  { value: 'low', label: '高压缩', description: '强度压缩，最小文件大小（约 30% 压缩）' },
]

const estimatedRatio = computed(() => {
  if (!selectedFile.value) return 0
  return estimateCompressionRatio(selectedFile.value.size, selectedQuality.value)
})

const estimatedSize = computed(() => {
  if (!selectedFile.value) return 0
  const ratio = estimatedRatio.value / 100
  return selectedFile.value.size * (1 - ratio)
})

const compressionInfo = computed(() => {
  if (!compressionResult.value) return null
  return formatCompressionInfo(compressionResult.value)
})

const handleFilesSelected = (files: File[]) => {
  selectedFile.value = files[0]
  errorMessage.value = ''
  compressionResult.value = null
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const clearAll = () => {
  selectedFile.value = null
  compressionResult.value = null
  errorMessage.value = ''
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
}

const compressFile = async () => {
  if (!selectedFile.value) return

  // 云端处理路径
  if (useCloud.value) {
    await compressInCloud()
    return
  }

  isProcessing.value = true
  processingProgress.value = 0
  processingStatus.value = '准备压缩...'
  errorMessage.value = ''

  try {
    processingProgress.value = 30
    processingStatus.value = '正在压缩 PDF...'

    const result = await compressPDF(selectedFile.value, {
      quality: selectedQuality.value,
      removeMetadata: true,
    })

    processingProgress.value = 100
    processingStatus.value = '压缩完成！'

    compressionResult.value = result
    resultUrl.value = memoryManager.createTemporaryURL(result.compressedBlob)
    const timestamp = new Date().toISOString().slice(0, 10)
    const originalName = selectedFile.value.name.replace('.pdf', '')
    resultFileName.value = `${originalName}-compressed-${timestamp}.pdf`

    // 添加到历史记录
    historyManager.addHistory({
      type: 'compress',
      fileName: selectedFile.value.name,
      fileSize: result.originalSize,
      resultSize: result.compressedSize,
    })

    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '压缩 PDF 失败'
  } finally {
    isProcessing.value = false
    processingProgress.value = 0
    processingStatus.value = ''
  }
}

/**
 * 云端压缩：上传 → 提交任务 → 轮询 → 下载，结果存为可下载 Blob URL。
 * 注意：云端结果为压缩后的 PDF，详细压缩比由后端返回（此处不展示本地估算对比）。
 */
const compressInCloud = async () => {
  if (!selectedFile.value) return
  isProcessing.value = true
  errorMessage.value = ''

  try {
    const blob = await processInCloud(selectedFile.value, (fileId) =>
      fileAPI.compressPDF(fileId, selectedQuality.value)
    )

    const originalSize = selectedFile.value.size
    resultUrl.value = memoryManager.createTemporaryURL(blob)
    const timestamp = new Date().toISOString().slice(0, 10)
    const originalName = selectedFile.value.name.replace('.pdf', '')
    resultFileName.value = `${originalName}-compressed-${timestamp}.pdf`

    // 用返回 blob 大小构造结果信息
    compressionResult.value = {
      originalSize,
      compressedSize: blob.size,
      compressionRatio: originalSize > 0 ? (1 - blob.size / originalSize) * 100 : 0,
      compressedBlob: blob,
    } as CompressionResult

    historyManager.addHistory({
      type: 'compress',
      fileName: selectedFile.value.name,
      fileSize: originalSize,
      resultSize: blob.size,
    })

    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '云端压缩失败'
  } finally {
    isProcessing.value = false
  }
}

const downloadResult = () => {
  if (!resultUrl.value) return
  const link = document.createElement('a')
  link.href = resultUrl.value
  link.download = resultFileName.value
  link.click()
  showSuccessModal.value = false
}

const startNew = () => {
  showSuccessModal.value = false
  clearAll()
}

const handlePreview = () => {
  showPDFViewer.value = true
}

const handleCloseViewer = () => {
  showPDFViewer.value = false
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
      <!-- Header -->
      <div class="mb-8">
        <h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          {{ t('tools.compress.title') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-300">
          {{ t('tools.compress.desc') }}
        </p>
      </div>

      <!-- Error Message -->
      <div
        v-if="errorMessage"
        class="mb-4 rounded-lg bg-error-light p-4 text-error-dark dark:bg-error/20 dark:text-error"
      >
        {{ errorMessage }}
      </div>

      <!-- Drag & Drop Zone -->
      <DragDropZone
        v-if="!selectedFile"
        accept="pdf"
        :multiple="false"
        @files-selected="handleFilesSelected"
        @error="handleError"
      />

      <!-- File Selected -->
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

        <!-- Quality Selection -->
        <div class="rounded-lg bg-white p-6 dark:bg-gray-800">
          <label class="mb-3 block text-sm font-medium text-gray-900 dark:text-white">
            压缩质量
          </label>
          <div class="space-y-3">
            <button
              v-for="option in qualityOptions"
              :key="option.value"
              :class="[
                'w-full rounded-lg border-2 p-4 text-left transition-all',
                selectedQuality === option.value
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 hover:border-primary/50 dark:border-gray-600',
              ]"
              @click="selectedQuality = option.value"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ option.label }}
                  </p>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {{ option.description }}
                  </p>
                </div>
                <div
                  v-if="selectedQuality === option.value"
                  class="flex-shrink-0 text-primary"
                >
                  <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          <!-- Estimated Result -->
          <div class="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
              📊 预估效果
            </p>
            <div class="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p>原始大小: {{ (selectedFile.size / (1024 * 1024)).toFixed(2) }} MB</p>
              <p>预估压缩: {{ estimatedRatio }}%</p>
              <p>预估大小: {{ (estimatedSize / (1024 * 1024)).toFixed(2) }} MB</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-4">
          <!-- 云端进度条（云端模式时替代本地进度） -->
          <div v-if="useCloud && isProcessing" class="space-y-2">
            <ProgressBar
              :progress="cloudProgress"
              :label="t(`cloud.${cloudPhase}`, t('common.processing'))"
              variant="primary"
              size="md"
            />
          </div>
          <!-- 本地进度条 -->
          <ProgressBar
            v-else-if="isProcessing"
            :progress="processingProgress"
            :label="processingStatus"
            variant="primary"
            size="md"
          />

          <!-- Compress Button -->
          <Button
            variant="primary"
            size="lg"
            :loading="isProcessing"
            full-width
            @click="compressFile"
          >
            {{ isProcessing ? t('common.processing') : '压缩 PDF' }}
          </Button>
        </div>
      </div>

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
        title="压缩完成！"
        size="md"
      >
        <div class="text-center">
          <div class="mb-4 flex justify-center">
            <div class="rounded-full bg-success/20 p-3">
              <svg
                class="h-12 w-12 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          <div v-if="compressionInfo" class="mb-6">
            <div class="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-gray-500 dark:text-gray-400">原始大小</p>
                  <p class="mt-1 font-semibold text-gray-900 dark:text-white">
                    {{ compressionInfo.originalSizeText }}
                  </p>
                </div>
                <div>
                  <p class="text-gray-500 dark:text-gray-400">压缩后</p>
                  <p class="mt-1 font-semibold text-gray-900 dark:text-white">
                    {{ compressionInfo.compressedSizeText }}
                  </p>
                </div>
                <div>
                  <p class="text-gray-500 dark:text-gray-400">节省空间</p>
                  <p class="mt-1 font-semibold text-success">
                    {{ compressionInfo.savedSizeText }}
                  </p>
                </div>
                <div>
                  <p class="text-gray-500 dark:text-gray-400">压缩比例</p>
                  <p class="mt-1 font-semibold text-primary">
                    {{ compressionInfo.ratioText }}
                  </p>
                </div>
              </div>
            </div>

            <p class="text-sm text-gray-600 dark:text-gray-300">
              成功压缩 PDF 文件，节省了 {{ compressionInfo.ratioText }} 的存储空间
            </p>
          </div>

          <div class="flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              full-width
              @click="downloadResult"
            >
              {{ t('common.download') }}
            </Button>
            <Button
              variant="outline"
              size="lg"
              full-width
              @click="startNew"
            >
              压缩更多文件
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  </div>
</template>
