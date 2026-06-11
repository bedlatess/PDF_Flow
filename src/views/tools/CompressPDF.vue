<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText } from 'lucide-vue-next'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import PDFViewer from '@/components/pdf/PDFViewer.vue'
import {
  compressPDF,
  estimateCompressionRatio,
  type CompressionQuality,
  type CompressionResult,
} from '@/utils/pdf/compress'
import { memoryManager } from '@/utils/memory-manager'
import { usePDFWorker } from '@/composables/usePDFWorker'
import { useCloudProcessing } from '@/composables/useCloudProcessing'
import { fileAPI } from '@/services/api'
import CloudToggle from '@/components/common/CloudToggle.vue'
import { historyManager } from '@/utils/history-manager'
import ToolHeader from '@/components/tools/ToolHeader.vue'
import { useUserStore } from '@/stores/user'
import { shouldPreferCloudProcessing } from '@/utils/cloud-recommendation'

const { t, locale } = useI18n()
const userStore = useUserStore()

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

const copy = computed(() => locale.value.startsWith('zh')
  ? {
      badge: '本地优先',
      setupLabel: '压缩设置',
      setupTitle: '选择压缩强度',
      setupDesc: '压缩效果取决于 PDF 是否已经被优化。这里的强度会影响处理方式，但最终节省空间以实际结果为准。',
      resultLabel: '参考预估',
      resultTitle: '输出前快速确认',
      estimateHint: '预估用于帮助选择强度，不代表最终一定节省。实际大小会在处理完成后显示。',
      actualLabel: '实际结果',
      noSavingsTitle: '文件已接近最优',
      noSavingsDesc: '这份 PDF 没有进一步缩小，PDF-Flow 已保留原文件，避免生成更大的“压缩文件”。',
      optimizedDesc: '已按当前设置生成更小的 PDF。',
      originalSize: '原始大小',
      estimatedCompression: '参考压缩',
      estimatedSize: '参考大小',
      outputSize: '输出大小',
      savedSize: '节省空间',
      ratio: '实际比例',
      action: '压缩 PDF',
      successTitle: '压缩完成',
      compressMore: '继续压缩其他文件',
      errorFailed: '压缩失败，请稍后重试。',
      errorCloudFailed: '云端压缩失败，请稍后再试。',
      statusPreparing: '正在准备压缩...',
      statusProcessing: '正在压缩 PDF...',
      statusDone: '压缩完成',
      qualityOptions: [
        {
          value: 'high' as CompressionQuality,
          label: '高清优先',
          description: '轻度优化，优先保留更好的阅读清晰度。',
        },
        {
          value: 'medium' as CompressionQuality,
          label: '平衡压缩',
          description: '适合多数分享、归档和在线传输场景。',
        },
        {
          value: 'low' as CompressionQuality,
          label: '体积优先',
          description: '尽可能减小体积，更适合上传和快速分发。',
        },
      ],
    }
  : {
      badge: 'Local-first',
      setupLabel: 'Compression setup',
      setupTitle: 'Choose a compression level',
      setupDesc: 'Compression depends on how the PDF was built. The level changes the optimization pass, but actual savings are shown after processing.',
      resultLabel: 'Reference estimate',
      resultTitle: 'Review before exporting',
      estimateHint: 'The estimate helps choose a level, but the real size depends on the file. Actual results appear after processing.',
      actualLabel: 'Actual result',
      noSavingsTitle: 'Already near optimal',
      noSavingsDesc: 'This PDF did not shrink further, so PDF-Flow kept the original file instead of creating a larger “compressed” copy.',
      optimizedDesc: 'A smaller PDF was generated with the selected setting.',
      originalSize: 'Original size',
      estimatedCompression: 'Reference compression',
      estimatedSize: 'Reference size',
      outputSize: 'Output size',
      savedSize: 'Space saved',
      ratio: 'Actual ratio',
      action: 'Compress PDF',
      successTitle: 'Compression complete',
      compressMore: 'Compress more files',
      errorFailed: 'Compression failed. Please try again later.',
      errorCloudFailed: 'Cloud compression failed. Please try again later.',
      statusPreparing: 'Preparing compression...',
      statusProcessing: 'Compressing PDF...',
      statusDone: 'Compression complete',
      qualityOptions: [
        {
          value: 'high' as CompressionQuality,
          label: 'High quality',
          description: 'Light optimization with a stronger focus on visual clarity.',
        },
        {
          value: 'medium' as CompressionQuality,
          label: 'Balanced',
          description: 'A steady middle ground for most sharing, archive, and upload workflows.',
        },
        {
          value: 'low' as CompressionQuality,
          label: 'Size first',
          description: 'Prioritizes a smaller file size for uploads and fast distribution.',
        },
      ],
    })

const formatMB = (value: number) => `${(Math.max(value, 0) / (1024 * 1024)).toFixed(2)} MB`

const estimatedRatio = computed(() => {
  if (!selectedFile.value) return 0
  return estimateCompressionRatio(selectedFile.value.size, selectedQuality.value)
})

const estimatedSize = computed(() => {
  if (!selectedFile.value) return 0
  const ratio = estimatedRatio.value / 100
  return selectedFile.value.size * (1 - ratio)
})

const estimatedStats = computed(() => {
  if (!selectedFile.value) return null

  const originalSize = selectedFile.value.size
  const estimatedOutputSize = estimatedSize.value
  const savedSize = Math.max(originalSize - estimatedOutputSize, 0)

  return {
    originalSize: formatMB(originalSize),
    estimatedOutputSize: formatMB(estimatedOutputSize),
    savedSize: formatMB(savedSize),
    ratio: `${estimatedRatio.value.toFixed(0)}%`,
  }
})

const resultStats = computed(() => {
  if (!compressionResult.value) return null

  const originalSize = compressionResult.value.originalSize
  const compressedSize = compressionResult.value.compressedSize
  const savedSize = Math.max(originalSize - compressedSize, 0)
  const ratio = originalSize > 0 ? ((savedSize / originalSize) * 100) : 0

  return {
    originalSize: formatMB(originalSize),
    compressedSize: formatMB(compressedSize),
    savedSize: formatMB(savedSize),
    ratio: `${ratio.toFixed(1)}%`,
    optimized: compressionResult.value.optimized,
  }
})

const handleFilesSelected = (files: File[]) => {
  selectedFile.value = files[0]
  useCloud.value = shouldPreferCloudProcessing(files.slice(0, 1), userStore.canUseCloudFeatures)
  errorMessage.value = ''
  compressionResult.value = null
}

watch(selectedQuality, () => {
  compressionResult.value = null
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
})

const handleError = (message: string) => {
  errorMessage.value = message
}

const clearAll = () => {
  selectedFile.value = null
  useCloud.value = false
  compressionResult.value = null
  errorMessage.value = ''
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
}

const setResultFileName = () => {
  if (!selectedFile.value) return
  const timestamp = new Date().toISOString().slice(0, 10)
  const originalName = selectedFile.value.name.replace(/\.pdf$/i, '')
  resultFileName.value = `${originalName}-compressed-${timestamp}.pdf`
}

const storeHistory = (result: CompressionResult) => {
  if (!selectedFile.value) return
  historyManager.addHistory({
    type: 'compress',
    fileName: selectedFile.value.name,
    fileSize: result.originalSize,
    resultSize: result.compressedSize,
  })
}

const compressFile = async () => {
  if (!selectedFile.value) return

  if (useCloud.value) {
    await compressInCloud()
    return
  }

  isProcessing.value = true
  processingProgress.value = 0
  processingStatus.value = copy.value.statusPreparing
  errorMessage.value = ''

  try {
    processingProgress.value = 30
    processingStatus.value = copy.value.statusProcessing

    const result = await compressPDF(selectedFile.value, {
      quality: selectedQuality.value,
      removeMetadata: true,
    })

    processingProgress.value = 100
    processingStatus.value = copy.value.statusDone

    compressionResult.value = result
    resultUrl.value = memoryManager.createTemporaryURL(result.compressedBlob)
    setResultFileName()
    storeHistory(result)
    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : copy.value.errorFailed
  } finally {
    isProcessing.value = false
    processingProgress.value = 0
    processingStatus.value = ''
  }
}

const compressInCloud = async () => {
  if (!selectedFile.value) return

  isProcessing.value = true
  errorMessage.value = ''

  try {
    const blob = await processInCloud(selectedFile.value, (fileId) =>
      fileAPI.compressPDF(fileId, selectedQuality.value)
    )

    const originalSize = selectedFile.value.size
    const optimized = blob.size < originalSize
    const outputBlob = optimized ? blob : selectedFile.value
    const result: CompressionResult = {
      originalSize,
      compressedSize: optimized ? blob.size : originalSize,
      compressionRatio: optimized && originalSize > 0 ? (1 - blob.size / originalSize) * 100 : 0,
      compressedBlob: outputBlob,
      optimized,
    }

    resultUrl.value = memoryManager.createTemporaryURL(outputBlob)
    compressionResult.value = result
    setResultFileName()
    storeHistory(result)
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

onUnmounted(() => {
  destroyWorker()
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/20">
    <ToolHeader
      :title="t('tools.compress.title')"
      :subtitle="t('tools.compress.desc')"
      :badge="copy.badge"
      accent="emerald"
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

          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-emerald-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-500">
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

              <div class="space-y-3">
                <button
                  v-for="option in copy.qualityOptions"
                  :key="option.value"
                  :class="[
                    'w-full rounded-[24px] border-2 p-4 text-left transition-all',
                    selectedQuality === option.value
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-slate-200 bg-slate-50/70 hover:border-primary/40 dark:border-slate-700 dark:bg-slate-950/40',
                  ]"
                  @click="selectedQuality = option.value"
                >
                  <p class="font-semibold text-slate-900 dark:text-white">
                    {{ option.label }}
                  </p>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {{ option.description }}
                  </p>
                </button>
              </div>
            </div>
          </Card>
        </div>

        <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-emerald-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
          <div class="space-y-5">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-500">
                {{ copy.resultLabel }}
              </p>
              <h3 class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                {{ copy.resultTitle }}
              </h3>
              <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {{ copy.estimateHint }}
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div class="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p class="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{{ copy.originalSize }}</p>
                <p class="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                  {{ estimatedStats?.originalSize }}
                </p>
              </div>
              <div class="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p class="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{{ copy.estimatedCompression }}</p>
                <p class="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                  {{ estimatedStats?.ratio }}
                </p>
              </div>
              <div class="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p class="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{{ copy.estimatedSize }}</p>
                <p class="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                  {{ estimatedStats?.estimatedOutputSize }}
                </p>
              </div>
            </div>

            <div
              v-if="resultStats"
              class="rounded-[24px] border p-5 dark:border-slate-800"
              :class="resultStats.optimized ? 'border-emerald-200 bg-emerald-50/80 dark:bg-emerald-500/10' : 'border-amber-200 bg-amber-50/80 dark:bg-amber-500/10'"
            >
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {{ copy.actualLabel }}
              </p>
              <p class="mt-2 font-semibold text-slate-900 dark:text-white">
                {{ resultStats.optimized ? copy.optimizedDesc : copy.noSavingsTitle }}
              </p>
              <p
                v-if="!resultStats.optimized"
                class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300"
              >
                {{ copy.noSavingsDesc }}
              </p>
            </div>

            <div
              v-if="resultStats || estimatedStats"
              class="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40"
            >
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-slate-500 dark:text-slate-400">{{ copy.originalSize }}</p>
                  <p class="mt-1 font-semibold text-slate-900 dark:text-white">
                    {{ resultStats?.originalSize || estimatedStats?.originalSize }}
                  </p>
                </div>
                <div>
                  <p class="text-slate-500 dark:text-slate-400">{{ copy.outputSize }}</p>
                  <p class="mt-1 font-semibold text-slate-900 dark:text-white">
                    {{ resultStats?.compressedSize || estimatedStats?.estimatedOutputSize }}
                  </p>
                </div>
                <div>
                  <p class="text-slate-500 dark:text-slate-400">{{ copy.savedSize }}</p>
                  <p
                    class="mt-1 font-semibold"
                    :class="resultStats && !resultStats.optimized ? 'text-amber-600' : 'text-emerald-600'"
                  >
                    {{ resultStats?.savedSize || estimatedStats?.savedSize }}
                  </p>
                </div>
                <div>
                  <p class="text-slate-500 dark:text-slate-400">{{ copy.ratio }}</p>
                  <p
                    class="mt-1 font-semibold"
                    :class="resultStats && !resultStats.optimized ? 'text-amber-600' : 'text-primary'"
                  >
                    {{ resultStats?.ratio || estimatedStats?.ratio }}
                  </p>
                </div>
              </div>
            </div>

            <ProgressBar
              v-if="useCloud && isProcessing"
              :progress="cloudProgress"
              :label="t(`cloud.${cloudPhase}`, t('common.processing'))"
              variant="primary"
              size="md"
            />
            <ProgressBar
              v-else-if="isProcessing"
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
              @click="compressFile"
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
          <div
            v-if="resultStats"
            class="mb-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 text-left dark:border-slate-800 dark:bg-slate-950/40"
          >
            <p class="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
              {{ resultStats.optimized ? copy.optimizedDesc : copy.noSavingsDesc }}
            </p>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-slate-500 dark:text-slate-400">{{ copy.originalSize }}</p>
                <p class="mt-1 font-semibold text-slate-900 dark:text-white">
                  {{ resultStats.originalSize }}
                </p>
              </div>
              <div>
                <p class="text-slate-500 dark:text-slate-400">{{ copy.outputSize }}</p>
                <p class="mt-1 font-semibold text-slate-900 dark:text-white">
                  {{ resultStats.compressedSize }}
                </p>
              </div>
              <div>
                <p class="text-slate-500 dark:text-slate-400">{{ copy.savedSize }}</p>
                <p
                  class="mt-1 font-semibold"
                  :class="resultStats.optimized ? 'text-emerald-600' : 'text-amber-600'"
                >
                  {{ resultStats.savedSize }}
                </p>
              </div>
              <div>
                <p class="text-slate-500 dark:text-slate-400">{{ copy.ratio }}</p>
                <p
                  class="mt-1 font-semibold"
                  :class="resultStats.optimized ? 'text-primary' : 'text-amber-600'"
                >
                  {{ resultStats.ratio }}
                </p>
              </div>
            </div>
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
              {{ copy.compressMore }}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  </div>
</template>
