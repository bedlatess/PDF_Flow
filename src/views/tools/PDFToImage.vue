<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import Button from '@/components/common/Button.vue'
import CloudToggle from '@/components/common/CloudToggle.vue'
import { pdfToImages } from '@/utils/pdf/convert'
import { useCloudProcessing } from '@/composables/useCloudProcessing'
import { fileAPI } from '@/services/api'
import { historyManager } from '@/utils/history-manager'

const { t } = useI18n()

const selectedFile = ref<File | null>(null)
const imageFormat = ref<'png' | 'jpeg'>('png')
const useCloud = ref(false)
const isProcessing = ref(false)
const resultImages = ref<{ url: string; blob: Blob }[]>([])
const errorMessage = ref('')

const { processInCloud } = useCloudProcessing()

const handleFilesSelected = (files: File[]) => {
  selectedFile.value = files[0]
  errorMessage.value = ''
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
  revokeImageUrls()
}

const convertToImages = async () => {
  if (!selectedFile.value) return

  // 云端处理路径
  if (useCloud.value) {
    await convertInCloud()
    return
  }

  isProcessing.value = true
  errorMessage.value = ''
  revokeImageUrls()

  try {
    const blobs = await pdfToImages(selectedFile.value, { format: imageFormat.value })
    resultImages.value = blobs.map((blob) => ({
      url: URL.createObjectURL(blob),
      blob,
    }))

    // 添加到历史记录
    historyManager.addHistory({
      type: 'pdf-to-image',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: blobs.reduce((sum, b) => sum + b.size, 0),
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'PDF 转图片失败'
  } finally {
    isProcessing.value = false
  }
}

/**
 * 云端PDF转图片（返回zip压缩包，需解压处理）
 */
const convertInCloud = async () => {
  if (!selectedFile.value) return
  isProcessing.value = true
  errorMessage.value = ''
  revokeImageUrls()

  try {
    const blob = await processInCloud(selectedFile.value, (fileId) =>
      fileAPI.pdfToImages(fileId, imageFormat.value)
    )

    // 云端返回的是包含所有图片的zip文件，直接提供下载
    // （解压zip需要额外依赖，这里简化处理：直接下载zip）
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pdf-images-${new Date().toISOString().slice(0, 10)}.zip`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)

    // 添加到历史记录
    historyManager.addHistory({
      type: 'pdf-to-image',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: blob.size,
    })

    // 提示用户
    errorMessage.value = ''
    alert('云端转换完成！已下载 ZIP 压缩包，请解压查看图片。')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '云端转换失败'
  } finally {
    isProcessing.value = false
  }
}

const downloadImage = (index: number) => {
  const img = resultImages.value[index]
  if (!img) return
  const link = document.createElement('a')
  link.href = img.url
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
  <div class="tool-page-container min-h-screen bg-background-light p-8 dark:bg-background-dark">
    <div class="mx-auto max-w-4xl">
      <div class="mb-8">
        <h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          {{ t('tools.pdfToImage.title') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-300">
          {{ t('tools.pdfToImage.desc') }}
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
        />

        <!-- 本地 / 云端处理切换 -->
        <CloudToggle v-model="useCloud" />

        <div class="rounded-lg bg-white p-6 dark:bg-gray-800">
          <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            输出格式
          </label>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="fmt in ['png', 'jpeg']"
              :key="fmt"
              :class="[
                'rounded-lg border-2 px-4 py-3 text-sm font-medium uppercase transition-all',
                imageFormat === fmt
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-300',
              ]"
              @click="imageFormat = fmt as 'png' | 'jpeg'"
            >
              {{ fmt }}
            </button>
          </div>
        </div>

        <Button
          v-if="resultImages.length === 0"
          variant="primary"
          size="lg"
          :loading="isProcessing"
          full-width
          @click="convertToImages"
        >
          {{ isProcessing ? t('common.processing') : '转换为图片' }}
        </Button>

        <!-- Results -->
        <div
          v-if="resultImages.length > 0"
          class="space-y-4"
        >
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              生成了 {{ resultImages.length }} 张图片
            </h2>
            <Button
              variant="primary"
              size="sm"
              @click="downloadAll"
            >
              下载全部
            </Button>
          </div>

          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div
              v-for="(img, index) in resultImages"
              :key="index"
              class="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
              @click="downloadImage(index)"
            >
              <img
                :src="img.url"
                :alt="`Page ${index + 1}`"
                class="w-full"
              >
              <div
                class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <span class="text-sm font-medium text-white">下载第 {{ index + 1 }} 页</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
