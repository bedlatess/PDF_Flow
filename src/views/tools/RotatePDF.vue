<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText } from 'lucide-vue-next'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import PDFViewer from '@/components/pdf/PDFViewer.vue'
import CloudToggle from '@/components/common/CloudToggle.vue'
import { memoryManager } from '@/utils/memory-manager'
import { usePDFWorker } from '@/composables/usePDFWorker'
import { useCloudProcessing } from '@/composables/useCloudProcessing'
import { fileAPI } from '@/services/api'
import { historyManager } from '@/utils/history-manager'
import ToolHeader from '@/components/tools/ToolHeader.vue'

const { t, locale } = useI18n()

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
const { processInCloud } = useCloudProcessing()

const copy = computed(() => locale.value.startsWith('zh')
  ? {
      badge: '本地工具',
      setupLabel: '旋转设置',
      setupTitle: '修正页面方向',
      setupDesc: '适合处理扫描件、拍照 PDF，或方向不一致的页面内容。',
      actionLabel: '输出动作',
      actionTitle: '确认角度后生成新文件',
      actionTips: [
        '90° 和 270° 适合修正横竖方向错误。',
        '180° 适合整页上下颠倒的扫描内容。',
        '处理完成后会生成新的 PDF，不会覆盖原文件。',
      ],
      action: '旋转 PDF',
      successTitle: '旋转完成',
      successMessage: '旋转后的 PDF 已准备好，可以立即下载。',
      errorFailed: '旋转失败，请稍后重试。',
      errorCloudFailed: '云端旋转失败，请稍后再试。',
      statusPreparing: '正在准备处理...',
      statusProcessing: '正在旋转页面...',
      statusProgress: '处理中... {progress}%',
      statusDone: '处理完成',
      angleOptions: [
        { value: 90 as 90, label: '90°', hint: '顺时针' },
        { value: 180 as 180, label: '180°', hint: '上下翻转' },
        { value: 270 as 270, label: '270°', hint: '逆时针' },
      ],
    }
  : {
      badge: 'Local tool',
      setupLabel: 'Rotation setup',
      setupTitle: 'Correct the page direction',
      setupDesc: 'Useful for scanned files, camera-made PDFs, or documents with inconsistent page orientation.',
      actionLabel: 'Output',
      actionTitle: 'Confirm the angle, then generate a new file',
      actionTips: [
        '90° and 270° are useful when pages are sideways.',
        '180° works well for upside-down scans.',
        'A new PDF is generated after processing. The original file stays unchanged.',
      ],
      action: 'Rotate PDF',
      successTitle: 'Rotation complete',
      successMessage: 'Your rotated PDF is ready to download.',
      errorFailed: 'Rotation failed. Please try again later.',
      errorCloudFailed: 'Cloud rotation failed. Please try again later.',
      statusPreparing: 'Preparing...',
      statusProcessing: 'Rotating pages...',
      statusProgress: 'Processing... {progress}%',
      statusDone: 'Completed',
      angleOptions: [
        { value: 90 as 90, label: '90°', hint: 'Clockwise' },
        { value: 180 as 180, label: '180°', hint: 'Upside down' },
        { value: 270 as 270, label: '270°', hint: 'Counterclockwise' },
      ],
    })

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

  if (useCloud.value) {
    await rotateInCloud()
    return
  }

  isProcessing.value = true
  processingProgress.value = 0
  processingStatus.value = copy.value.statusPreparing
  errorMessage.value = ''

  try {
    processingStatus.value = copy.value.statusProcessing
    const taskId = await submitTask('rotate', {
      file: selectedFile.value,
      options: { angle: selectedAngle.value },
    })

    const progressInterval = setInterval(() => {
      const task = getTask(taskId)
      if (task) {
        processingProgress.value = task.progress
        if (task.progress < 100) {
          processingStatus.value = copy.value.statusProgress.replace('{progress}', String(Math.round(task.progress)))
        }
      }
    }, 100)

    const blob = await waitForTask(taskId) as Blob
    clearInterval(progressInterval)

    processingProgress.value = 100
    processingStatus.value = copy.value.statusDone
    resultUrl.value = memoryManager.createTemporaryURL(blob)

    historyManager.addHistory({
      type: 'rotate',
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

const rotateInCloud = async () => {
  if (!selectedFile.value) return

  isProcessing.value = true
  errorMessage.value = ''

  try {
    const blob = await processInCloud(selectedFile.value, (fileId) =>
      fileAPI.rotatePDF(fileId, selectedAngle.value)
    )

    resultUrl.value = memoryManager.createTemporaryURL(blob)

    historyManager.addHistory({
      type: 'rotate',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: blob.size,
    })

    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : copy.value.errorCloudFailed
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

const handlePreview = () => {
  showPDFViewer.value = true
}

const handleCloseViewer = () => {
  showPDFViewer.value = false
}

onUnmounted(() => {
  destroyWorker()
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-slate-950 dark:via-slate-950 dark:to-amber-950/20">
    <ToolHeader
      :title="t('tools.rotate.title')"
      :subtitle="t('tools.rotate.desc')"
      :badge="copy.badge"
      accent="amber"
    >
      <template #badgeIcon>
        <FileText class="h-4 w-4" />
      </template>
    </ToolHeader>

    <section class="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-6">
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
        class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
      >
        <div class="space-y-6">
          <FilePreview
            :file="selectedFile"
            @remove="clearAll"
            @preview="handlePreview"
          />

          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-amber-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-500">
                  {{ copy.setupLabel }}
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {{ copy.setupTitle }}
                </h2>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.setupDesc }}
                </p>
              </div>

              <CloudToggle v-model="useCloud" />

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  v-for="option in copy.angleOptions"
                  :key="option.value"
                  :class="[
                    'rounded-[22px] border-2 px-4 py-4 text-left transition-all',
                    selectedAngle === option.value
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-slate-200 bg-slate-50/70 hover:border-primary/40 dark:border-slate-700 dark:bg-slate-950/40',
                  ]"
                  @click="selectedAngle = option.value"
                >
                  <p class="text-sm font-semibold text-slate-900 dark:text-white">
                    {{ option.label }}
                  </p>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {{ option.hint }}
                  </p>
                </button>
              </div>
            </div>
          </Card>
        </div>

        <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-amber-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
          <div class="space-y-5">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-500">
                {{ copy.actionLabel }}
              </p>
              <h3 class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                {{ copy.actionTitle }}
              </h3>
            </div>

            <div class="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <ul class="space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <li
                  v-for="tip in copy.actionTips"
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
              @click="rotatePages"
            >
              {{ isProcessing ? t('common.processing') : copy.action }}
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
          @close="handleCloseViewer"
        />
      </Modal>

      <Modal
        v-model="showSuccessModal"
        :title="copy.successTitle"
        size="md"
      >
        <div class="text-center">
          <p class="mb-6 text-gray-600 dark:text-gray-300">
            {{ copy.successMessage }}
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
    </section>
  </div>
</template>
