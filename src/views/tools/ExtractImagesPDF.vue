<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BadgeCheck,
  Download,
  FileImage,
  ImagePlus,
  Sparkles,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import ToolPageShell from '@/components/tools/ToolPageShell.vue'
import ToolNoticeBar from '@/components/tools/ToolNoticeBar.vue'
import { formatFileSize } from '@/utils/file-validator'
import { historyManager } from '@/utils/history-manager'
import { extractImagesFromPDF, type ExtractedPDFImage } from '@/utils/pdf/imageExtraction'

const { t, tm } = useI18n()

interface ImagePreview extends ExtractedPDFImage {
  url: string
}

type ToolPageCopy = Record<string, any>

const selectedFile = ref<File | null>(null)
const resultImages = ref<ImagePreview[]>([])
const isProcessing = ref(false)
const progress = ref(0)
const status = ref('')
const errorMessage = ref('')

const copy = computed<ToolPageCopy>(() => tm('tools.extractImages.page') as ToolPageCopy)

const canExtract = computed(() => !!selectedFile.value && !isProcessing.value)
const totalResultSize = computed(() =>
  resultImages.value.reduce((sum, image) => sum + image.blob.size, 0)
)

const handleFilesSelected = (files: File[]) => {
  const file = files[0]
  if (!file) return

  clearImageUrls()
  selectedFile.value = file
  errorMessage.value = ''
  progress.value = 0
  status.value = ''
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const clearImageUrls = () => {
  resultImages.value.forEach((image) => URL.revokeObjectURL(image.url))
  resultImages.value = []
}

const removeFile = () => {
  selectedFile.value = null
  errorMessage.value = ''
  progress.value = 0
  status.value = ''
  clearImageUrls()
}

const extractImages = async () => {
  if (!selectedFile.value) return

  isProcessing.value = true
  progress.value = 18
  status.value = copy.value.processing
  errorMessage.value = ''
  clearImageUrls()

  try {
    progress.value = 58
    const extracted = await extractImagesFromPDF(selectedFile.value)
    resultImages.value = extracted.map((image) => ({
      ...image,
      url: URL.createObjectURL(image.blob),
    }))
    progress.value = 100
    status.value = copy.value.ready

    historyManager.addHistory({
      type: 'extractImages',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: totalResultSize.value,
    })
  } catch {
    errorMessage.value = copy.value.errorFailed
  } finally {
    isProcessing.value = false
  }
}

const resultFileName = (image: ImagePreview) => {
  const baseName = selectedFile.value?.name.replace(/\.pdf$/i, '') || 'pdf'
  return `${baseName}-page-${image.pageNumber}-image-${image.imageNumber}.png`
}

const downloadImage = (image: ImagePreview) => {
  const link = document.createElement('a')
  link.href = image.url
  link.download = resultFileName(image)
  link.click()
}

const downloadAll = () => {
  resultImages.value.forEach((image, index) => {
    window.setTimeout(() => downloadImage(image), index * 120)
  })
}

onUnmounted(() => {
  clearImageUrls()
})
</script>

<template>
  <ToolPageShell
      :title="copy.title"
      :subtitle="copy.subtitle"
      :badge="copy.badge"
      accent="amber"
    width="lg"
  >

      <template #badgeIcon>
        <ImagePlus class="h-4 w-4" />
      </template>
      <ToolNoticeBar variant="amber">
        <template #icon>
          <FileImage class="h-5 w-5" />
        </template>
        {{ copy.notice }}
      </ToolNoticeBar>

      <div
        v-if="errorMessage"
        class="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 shadow-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-100"
      >
        {{ errorMessage }}
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div class="space-y-6">
          <Card class="rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-6">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
                  {{ copy.uploadLabel }}
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {{ selectedFile ? copy.uploadTitleReady : copy.uploadTitleIdle }}
                </h2>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ selectedFile ? copy.uploadDescriptionReady : copy.uploadDescriptionIdle }}
                </p>
              </div>

              <DragDropZone
                v-if="!selectedFile"
                accept="pdf"
                :multiple="false"
                :max-files="1"
                @files-selected="handleFilesSelected"
                @error="handleError"
              >
                <template #icon>
                  <FileImage class="h-12 w-12" />
                </template>
                <template #title>
                  {{ copy.dropTitle }}
                </template>
                <template #subtitle>
                  {{ copy.dropSubtitle }}
                </template>
              </DragDropZone>

              <FilePreview
                v-else
                :file="selectedFile"
                @remove="removeFile"
              />

              <ProgressBar
                v-if="isProcessing || resultImages.length > 0"
                :progress="progress"
                :label="status"
                variant="primary"
                size="md"
              />

              <div class="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="primary"
                  size="lg"
                  :loading="isProcessing"
                  :disabled="!canExtract"
                  full-width
                  @click="extractImages"
                >
                  <ImagePlus class="mr-2 h-4 w-4" />
                  {{ isProcessing ? copy.processing : copy.action }}
                </Button>
                <Button
                  v-if="selectedFile"
                  variant="ghost"
                  size="lg"
                  full-width
                  @click="removeFile"
                >
                  {{ copy.remove }}
                </Button>
              </div>
            </div>
          </Card>

          <Card class="overflow-hidden rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
                <div>
                  <h3 class="text-xl font-semibold text-slate-900 dark:text-white">
                    {{ copy.localTitle }}
                  </h3>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {{ copy.localBody }}
                  </p>
                </div>
                <div class="grid gap-3">
                  <div
                    v-for="(step, index) in [copy.step1, copy.step2, copy.step3]"
                    :key="step"
                    class="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 text-sm font-bold text-white">
                      {{ index + 1 }}
                    </span>
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {{ step }}
                    </span>
                  </div>
                </div>
            </div>
          </Card>
        </div>

        <div class="space-y-6">
          <Card class="rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
                    {{ copy.resultLabel }}
                  </p>
                  <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                    {{ resultImages.length > 0 ? t('tools.extractImages.page.readyTitle', { count: resultImages.length }) : copy.waitingTitle }}
                  </h2>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {{ resultImages.length > 0 ? `${copy.fileSize}: ${formatFileSize(totalResultSize)}` : copy.emptyHint }}
                  </p>
                </div>
                <Button
                  v-if="resultImages.length > 0"
                  variant="primary"
                  size="sm"
                  @click="downloadAll"
                >
                  <Download class="mr-2 h-4 w-4" />
                  {{ copy.downloadAll }}
                </Button>
              </div>

              <div
                v-if="selectedFile && !isProcessing && progress === 100 && resultImages.length === 0"
                class="rounded-md border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/20 dark:bg-amber-500/10"
              >
                <div class="flex items-start gap-3">
                  <Sparkles class="mt-1 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-200" />
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                      {{ copy.emptyTitle }}
                    </h3>
                    <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {{ copy.emptyBody }}
                    </p>
                  </div>
                </div>
              </div>

              <div
                v-else-if="resultImages.length === 0"
                class="rounded-md border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center dark:border-slate-700 dark:bg-slate-950/35"
              >
                <FileImage class="mx-auto h-12 w-12 text-orange-500" />
                <p class="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {{ copy.emptyHint }}
                </p>
              </div>

              <div
                v-else
                class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <article
                  v-for="image in resultImages"
                  :key="image.url"
                  class="group overflow-hidden rounded-md border border-slate-200 bg-slate-50/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <div class="flex aspect-square items-center justify-center bg-white p-3 dark:bg-slate-900">
                    <img
                      :src="image.url"
                      alt=""
                      class="max-h-full max-w-full object-contain"
                    >
                  </div>
                  <div class="space-y-3 p-4">
                    <div class="grid gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>{{ copy.page }} {{ image.pageNumber }}</span>
                      <span>{{ copy.size }} {{ image.width }} x {{ image.height }}</span>
                      <span>{{ copy.fileSize }} {{ formatFileSize(image.blob.size) }}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      full-width
                      @click="downloadImage(image)"
                    >
                      <Download class="mr-2 h-4 w-4" />
                      {{ copy.download }}
                    </Button>
                  </div>
                </article>
              </div>
            </div>
          </Card>

          <Card
            v-if="resultImages.length > 0"
            class="rounded-lg border border-emerald-200 bg-emerald-50/90 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:shadow-none"
          >
            <div class="flex items-start gap-4">
              <BadgeCheck class="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
              <div>
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                  {{ copy.ready }}
                </h3>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.localBody }}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
  </ToolPageShell>
</template>
