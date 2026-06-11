<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText } from 'lucide-vue-next'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import CloudToggle from '@/components/common/CloudToggle.vue'
import { pdfToImages } from '@/utils/pdf/convert'
import { useCloudProcessing } from '@/composables/useCloudProcessing'
import { fileAPI } from '@/services/api'
import { historyManager } from '@/utils/history-manager'
import ToolHeader from '@/components/tools/ToolHeader.vue'

const { t, locale } = useI18n()

const selectedFile = ref<File | null>(null)
const imageFormat = ref<'png' | 'jpeg'>('png')
const useCloud = ref(false)
const isProcessing = ref(false)
const resultImages = ref<{ url: string; blob: Blob }[]>([])
const errorMessage = ref('')
const successMessage = ref('')

const { processInCloud } = useCloudProcessing()

const copy = computed(() => locale.value.startsWith('zh')
  ? {
      badge: '本地工具',
      outputLabel: '输出设置',
      outputTitle: '选择图片格式',
      outputDesc: 'PNG 更适合保留清晰细节，JPEG 更适合更小的分享体积。',
      resultLabel: '转换结果',
      waitingTitle: '等待开始转换',
      readyTitle: `已生成 ${resultImages.value.length} 张图片`,
      emptyHint: '选择输出格式后开始转换，结果会在这里按页展示，方便逐页检查和下载。',
      downloadAll: '下载全部',
      downloadPage: '下载第 {page} 页',
      action: '转换为图片',
      successCloud: '云端转换完成，结果已打包下载。解压 ZIP 后即可查看所有图片。',
      errorFailed: 'PDF 转图片失败，请稍后重试。',
      errorCloudFailed: '云端转换失败，请稍后再试。',
    }
  : {
      badge: 'Local tool',
      outputLabel: 'Output setup',
      outputTitle: 'Choose the image format',
      outputDesc: 'PNG is better for clarity and fine detail, while JPEG is more suitable for smaller shareable files.',
      resultLabel: 'Conversion result',
      waitingTitle: 'Waiting to start',
      readyTitle: `${resultImages.value.length} images generated`,
      emptyHint: 'Choose an output format and start the conversion. The results will appear here page by page for quick review and download.',
      downloadAll: 'Download all',
      downloadPage: 'Download page {page}',
      action: 'Convert to images',
      successCloud: 'Cloud conversion is complete. The result package has been downloaded as a ZIP file.',
      errorFailed: 'PDF to image conversion failed. Please try again later.',
      errorCloudFailed: 'Cloud conversion failed. Please try again later.',
    })

const handleFilesSelected = (files: File[]) => {
  selectedFile.value = files[0]
  errorMessage.value = ''
  successMessage.value = ''
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const revokeImageUrls = () => {
  resultImages.value.forEach((img) => URL.revokeObjectURL(img.url))
  resultImages.value = []
}

const clearAll = () => {
  selectedFile.value = null
  errorMessage.value = ''
  successMessage.value = ''
  revokeImageUrls()
}

const convertToImages = async () => {
  if (!selectedFile.value) return

  if (useCloud.value) {
    await convertInCloud()
    return
  }

  isProcessing.value = true
  errorMessage.value = ''
  successMessage.value = ''
  revokeImageUrls()

  try {
    const blobs = await pdfToImages(selectedFile.value, { format: imageFormat.value })
    resultImages.value = blobs.map((blob) => ({
      url: URL.createObjectURL(blob),
      blob,
    }))

    historyManager.addHistory({
      type: 'pdfToImage',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: blobs.reduce((sum, blob) => sum + blob.size, 0),
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : copy.value.errorFailed
  } finally {
    isProcessing.value = false
  }
}

const convertInCloud = async () => {
  if (!selectedFile.value) return

  isProcessing.value = true
  errorMessage.value = ''
  successMessage.value = ''
  revokeImageUrls()

  try {
    const blob = await processInCloud(selectedFile.value, (fileId) =>
      fileAPI.pdfToImages(fileId, imageFormat.value)
    )

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pdf-images-${new Date().toISOString().slice(0, 10)}.zip`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)

    historyManager.addHistory({
      type: 'pdfToImage',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: blob.size,
    })

    successMessage.value = copy.value.successCloud
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : copy.value.errorCloudFailed
  } finally {
    isProcessing.value = false
  }
}

const downloadImage = (index: number) => {
  const image = resultImages.value[index]
  if (!image) return
  const link = document.createElement('a')
  link.href = image.url
  link.download = `page-${index + 1}.${imageFormat.value}`
  link.click()
}

const downloadAll = () => {
  resultImages.value.forEach((_, index) => downloadImage(index))
}

onUnmounted(() => {
  revokeImageUrls()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-sky-950/20">
    <ToolHeader
      :title="t('tools.pdfToImage.title')"
      :subtitle="t('tools.pdfToImage.desc')"
      :badge="copy.badge"
      accent="cyan"
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

      <div
        v-if="successMessage"
        class="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
      >
        {{ successMessage }}
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
        class="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]"
      >
        <div class="space-y-6">
          <FilePreview
            :file="selectedFile"
            @remove="clearAll"
          />

          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-sky-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">
                  {{ copy.outputLabel }}
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {{ copy.outputTitle }}
                </h2>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.outputDesc }}
                </p>
              </div>

              <CloudToggle v-model="useCloud" />

              <div class="grid grid-cols-2 gap-3">
                <button
                  v-for="fmt in ['png', 'jpeg']"
                  :key="fmt"
                  :class="[
                    'rounded-[20px] border-2 px-4 py-4 text-sm font-semibold uppercase transition-all',
                    imageFormat === fmt
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-slate-200 bg-slate-50/70 text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300',
                  ]"
                  @click="imageFormat = fmt as 'png' | 'jpeg'"
                >
                  {{ fmt }}
                </button>
              </div>

              <Button
                v-if="resultImages.length === 0"
                variant="primary"
                size="lg"
                :loading="isProcessing"
                full-width
                @click="convertToImages"
              >
                {{ isProcessing ? t('common.processing') : copy.action }}
              </Button>
            </div>
          </Card>
        </div>

        <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-sky-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
          <div class="space-y-5">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">
                  {{ copy.resultLabel }}
                </p>
                <h3 class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                  {{ resultImages.length > 0 ? copy.readyTitle : copy.waitingTitle }}
                </h3>
              </div>

              <Button
                v-if="resultImages.length > 0"
                variant="primary"
                size="sm"
                @click="downloadAll"
              >
                {{ copy.downloadAll }}
              </Button>
            </div>

            <div
              v-if="resultImages.length === 0"
              class="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400"
            >
              {{ copy.emptyHint }}
            </div>

            <div
              v-else
              class="grid grid-cols-2 gap-4 sm:grid-cols-3"
            >
              <div
                v-for="(img, index) in resultImages"
                :key="index"
                class="group relative cursor-pointer overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50/70 shadow-sm dark:border-slate-800 dark:bg-slate-950/40"
                @click="downloadImage(index)"
              >
                <img
                  :src="img.url"
                  :alt="`Page ${index + 1}`"
                  class="w-full"
                >
                <div class="absolute inset-0 flex items-center justify-center bg-slate-950/55 opacity-0 transition-opacity group-hover:opacity-100">
                  <span class="text-sm font-medium text-white">
                    {{ copy.downloadPage.replace('{page}', String(index + 1)) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  </div>
</template>
