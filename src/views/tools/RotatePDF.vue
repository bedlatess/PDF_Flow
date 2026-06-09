<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import Button from '@/components/common/Button.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import PDFViewer from '@/components/pdf/PDFViewer.vue'
import CloudToggle from '@/components/common/CloudToggle.vue'
import { memoryManager } from '@/utils/memory-manager'
import { usePDFWorker } from '@/composables/usePDFWorker'
import { useCloudProcessing } from '@/composables/useCloudProcessing'
import { fileAPI } from '@/services/api'
import { historyManager } from '@/utils/history-manager'

const { t } = useI18n()

const selectedFile = ref<File | null>(null)
const selectedAngle = ref<90 | 180 | 270>(90)
const useCloud = ref(false)
const isProcessing = ref(false)
const processingProgress = ref(0)
const processingStatus = ref('')
const showSuccessModal = ref(false)
const showPDFViewer = ref(false)
const resultUrl = ref('')
const errorMessage = ref('')

const { submitTask, getTask, waitForTask, destroyWorker } = usePDFWorker()
const { cloudProgress, cloudPhase, processInCloud } = useCloudProcessing()

const angleOptions: { value: 90 | 180 | 270; label: string }[] = [
  { value: 90, label: '90° 顺时针' },
  { value: 180, label: '180°' },
  { value: 270, label: '90° 逆时针' },
]

const handleFilesSelected = (files: File[]) => {
  selectedFile.value = files[0]
  errorMessage.value = ''
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const clearAll = () => {
  selectedFile.value = null
  errorMessage.value = ''
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
}

const rotatePages = async () => {
  if (!selectedFile.value) return

  // 云端处理路径
  if (useCloud.value) {
    await rotateInCloud()
    return
  }

  isProcessing.value = true
  processingProgress.value = 0
  processingStatus.value = '准备处理...'
  errorMessage.value = ''

  try {
    processingStatus.value = '正在旋转页面...'
    const taskId = await submitTask('rotate', {
      file: selectedFile.value,
      options: { angle: selectedAngle.value },
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
      type: 'rotate',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: blob.size,
    })

    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '旋转 PDF 失败'
  } finally {
    isProcessing.value = false
    processingProgress.value = 0
    processingStatus.value = ''
  }
}

/**
 * 云端旋转
 */
const rotateInCloud = async () => {
  if (!selectedFile.value) return
  isProcessing.value = true
  errorMessage.value = ''

  try {
    const blob = await processInCloud(selectedFile.value, (fileId) =>
      fileAPI.rotatePDF(fileId, selectedAngle.value)
    )

    resultUrl.value = memoryManager.createTemporaryURL(blob)

    // 添加到历史记录
    historyManager.addHistory({
      type: 'rotate',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: blob.size,
    })

    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '云端旋转失败'
  } finally {
    isProcessing.value = false
  }
}

const downloadResult = () => {
  if (!resultUrl.value) return
  const link = document.createElement('a')
  link.href = resultUrl.value
  link.download = `rotated-${new Date().toISOString().slice(0, 10)}.pdf`
  link.click()
  showSuccessModal.value = false
}

// 打开 PDF 预览
const handlePreview = () => {
  showPDFViewer.value = true
}

// 关闭 PDF 预览
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
      <div class="mb-8">
        <h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          {{ t('tools.rotate.title') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-300">
          {{ t('tools.rotate.desc') }}
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
          <label class="mb-3 block text-sm font-medium text-gray-900 dark:text-white">
            旋转角度
          </label>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="option in angleOptions"
              :key="option.value"
              :class="[
                'rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all',
                selectedAngle === option.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 text-gray-700 hover:border-primary/50 dark:border-gray-600 dark:text-gray-300',
              ]"
              @click="selectedAngle = option.value"
            >
              {{ option.label }}
            </button>
          </div>
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

          <!-- Rotate Button -->
          <Button
            variant="primary"
            size="lg"
            :loading="isProcessing"
            full-width
            @click="rotatePages"
          >
            {{ isProcessing ? t('common.processing') : '旋转 PDF' }}
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
        title="旋转完成！"
        size="md"
      >
        <div class="text-center">
          <p class="mb-6 text-gray-600 dark:text-gray-300">
            PDF 页面已成功旋转
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
