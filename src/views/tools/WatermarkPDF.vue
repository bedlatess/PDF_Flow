<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import Button from '@/components/common/Button.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import PDFViewer from '@/components/pdf/PDFViewer.vue'
import { memoryManager } from '@/utils/memory-manager'
import { historyManager } from '@/utils/history-manager'
import { addWatermark, type WatermarkPosition } from '@/utils/pdf/watermark'

const { t } = useI18n()

const selectedFile = ref<File | null>(null)
const watermarkText = ref('CONFIDENTIAL')
const opacity = ref(0.3)
const rotation = ref(45)
const fontSize = ref(40)
const position = ref<WatermarkPosition>('center')
const watermarkColor = ref('#808080')

const isProcessing = ref(false)
const processingProgress = ref(0)
const processingStatus = ref('')
const showSuccessModal = ref(false)
const showPDFViewer = ref(false)
const resultUrl = ref('')
const errorMessage = ref('')

const positionOptions: { value: WatermarkPosition; labelKey: string }[] = [
  { value: 'center', labelKey: 'tools.watermark.posCenter' },
  { value: 'tile', labelKey: 'tools.watermark.posTile' },
  { value: 'top', labelKey: 'tools.watermark.posTop' },
  { value: 'bottom', labelKey: 'tools.watermark.posBottom' },
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

/** 将 #rrggbb 转为 {r,g,b} */
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const normalized = hex.replace('#', '')
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

const applyWatermark = async () => {
  if (!selectedFile.value) return
  if (!watermarkText.value.trim()) {
    errorMessage.value = t('tools.watermark.errorNoText')
    return
  }

  isProcessing.value = true
  processingProgress.value = 20
  processingStatus.value = t('tools.watermark.processing')
  errorMessage.value = ''

  try {
    processingProgress.value = 50
    const blob = await addWatermark(selectedFile.value, {
      text: watermarkText.value,
      opacity: opacity.value,
      rotation: rotation.value,
      fontSize: fontSize.value,
      color: hexToRgb(watermarkColor.value),
      position: position.value,
    })

    processingProgress.value = 100
    processingStatus.value = t('common.processing')
    resultUrl.value = memoryManager.createTemporaryURL(blob)

    historyManager.addHistory({
      type: 'watermark',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: blob.size,
    })

    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t('tools.watermark.errorFailed')
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
  link.download = `watermarked-${new Date().toISOString().slice(0, 10)}.pdf`
  link.click()
  showSuccessModal.value = false
}

const handlePreview = () => {
  showPDFViewer.value = true
}

const handleCloseViewer = () => {
  showPDFViewer.value = false
}

onUnmounted(() => {
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
          {{ t('tools.watermark.title') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-300">
          {{ t('tools.watermark.desc') }}
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

        <!-- 隐私提示 -->
        <div
          class="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400"
        >
          🔒 {{ t('tools.watermark.localHint') }}
        </div>

        <!-- 水印设置 -->
        <div class="space-y-5 rounded-lg bg-white p-6 dark:bg-gray-800">
          <!-- 文字 -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
              {{ t('tools.watermark.text') }}
            </label>
            <input
              v-model="watermarkText"
              type="text"
              :placeholder="t('tools.watermark.textPlaceholder')"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <!-- 位置 -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
              {{ t('tools.watermark.position') }}
            </label>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="option in positionOptions"
                :key="option.value"
                :class="[
                  'rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all',
                  position === option.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 text-gray-700 hover:border-primary/50 dark:border-gray-600 dark:text-gray-300',
                ]"
                @click="position = option.value"
              >
                {{ t(option.labelKey) }}
              </button>
            </div>
          </div>

          <!-- 不透明度 -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
              {{ t('tools.watermark.opacity') }}: {{ Math.round(opacity * 100) }}%
            </label>
            <input
              v-model.number="opacity"
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              class="w-full accent-primary"
            />
          </div>

          <!-- 旋转 + 字号 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                {{ t('tools.watermark.rotation') }}: {{ rotation }}°
              </label>
              <input
                v-model.number="rotation"
                type="range"
                min="0"
                max="90"
                step="5"
                class="w-full accent-primary"
              />
            </div>
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                {{ t('tools.watermark.fontSize') }}: {{ fontSize }}
              </label>
              <input
                v-model.number="fontSize"
                type="range"
                min="12"
                max="100"
                step="2"
                class="w-full accent-primary"
              />
            </div>
          </div>

          <!-- 颜色 -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
              {{ t('tools.watermark.color') }}
            </label>
            <input
              v-model="watermarkColor"
              type="color"
              class="h-10 w-20 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
            />
          </div>
        </div>

        <div class="space-y-4">
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
            @click="applyWatermark"
          >
            {{ isProcessing ? t('common.processing') : t('tools.watermark.apply') }}
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
        :title="t('tools.watermark.successTitle')"
        size="md"
      >
        <div class="text-center">
          <p class="mb-6 text-gray-600 dark:text-gray-300">
            {{ t('tools.watermark.successMessage') }}
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
