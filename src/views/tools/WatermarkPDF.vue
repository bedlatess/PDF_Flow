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
import { memoryManager } from '@/utils/memory-manager'
import { historyManager } from '@/utils/history-manager'
import { addWatermark, type WatermarkPosition } from '@/utils/pdf/watermark'
import ToolPageShell from '@/components/tools/ToolPageShell.vue'

const { t, tm } = useI18n()

type ToolPageCopy = Record<string, any>

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

const copy = computed<ToolPageCopy>(() => tm('tools.watermark.page') as ToolPageCopy)

watch(copy, (nextCopy, previousCopy) => {
  const previousDefault = previousCopy?.defaultText ?? ''
  const trimmed = watermarkText.value.trim()
  if (!trimmed || trimmed === previousDefault) {
    watermarkText.value = nextCopy.defaultText
  }
}, { immediate: true })
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
    errorMessage.value = copy.value.errorNoText
    return
  }

  isProcessing.value = true
  processingProgress.value = 20
  processingStatus.value = copy.value.processing
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
    processingStatus.value = copy.value.done
    resultUrl.value = memoryManager.createTemporaryURL(blob)

    historyManager.addHistory({
      type: 'watermark',
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
  <ToolPageShell
      :title="t('tools.watermark.title')"
      :subtitle="t('tools.watermark.desc')"
      :badge="copy.badge"
      accent="pink"
    width="md"
  >

      <template #badgeIcon>
        <FileText class="h-4 w-4" />
      </template>
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
        class="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]"
      >
        <div class="space-y-6">
          <FilePreview
            :file="selectedFile"
            @remove="clearAll"
            @preview="handlePreview"
          />

          <Card class="rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-500">
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
                  for="watermark-text"
                  class="mb-2 block text-sm font-medium text-slate-900 dark:text-white"
                >
                  {{ copy.text }}
                </label>
                <input
                  id="watermark-text"
                  v-model="watermarkText"
                  type="text"
                  :placeholder="copy.placeholder"
                  class="w-full rounded-md border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">
                  {{ copy.position }}
                </label>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <button
                    v-for="option in copy.positions"
                    :key="option.value"
                    :class="[
                      'rounded-[18px] border-2 px-3 py-3 text-sm font-medium transition-all',
                      position === option.value
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-primary/40 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300',
                    ]"
                    @click="position = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">
                  {{ copy.opacity }}: {{ Math.round(opacity * 100) }}%
                </label>
                <input
                  v-model.number="opacity"
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  class="w-full accent-primary"
                >
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">
                    {{ copy.rotation }}: {{ rotation }} deg
                  </label>
                  <input
                    v-model.number="rotation"
                    type="range"
                    min="0"
                    max="90"
                    step="5"
                    class="w-full accent-primary"
                  >
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">
                    {{ copy.fontSize }}: {{ fontSize }}
                  </label>
                  <input
                    v-model.number="fontSize"
                    type="range"
                    min="12"
                    max="100"
                    step="2"
                    class="w-full accent-primary"
                  >
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">
                  {{ copy.color }}
                </label>
                <input
                  v-model="watermarkColor"
                  type="color"
                  class="h-11 w-24 cursor-pointer rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
                >
              </div>
            </div>
          </Card>
        </div>

        <div class="space-y-6">
          <div class="rounded-lg border border-emerald-100 bg-emerald-50/80 p-5 text-sm leading-6 text-emerald-800 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300 dark:shadow-none">
            <p class="font-semibold">
              {{ copy.localTitle }}
            </p>
            <p class="mt-2">
              {{ copy.localDesc }}
            </p>
          </div>

          <Card class="rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-500">
                  {{ copy.outputLabel }}
                </p>
                <h3 class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                  {{ copy.outputTitle }}
                </h3>
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
                variant="primary"
                size="lg"
                :loading="isProcessing"
                full-width
                @click="applyWatermark"
              >
                {{ isProcessing ? t('common.processing') : copy.action }}
              </Button>
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
  </ToolPageShell>
</template>
