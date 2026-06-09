<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import Button from '@/components/common/Button.vue'
import Modal from '@/components/common/Modal.vue'
import CloudToggle from '@/components/common/CloudToggle.vue'
import { imagesToPDF } from '@/utils/pdf/convert'
import { memoryManager } from '@/utils/memory-manager'
import { useCloudProcessing } from '@/composables/useCloudProcessing'
import { fileAPI } from '@/services/api'
import { historyManager } from '@/utils/history-manager'

const { t } = useI18n()

const selectedFiles = ref<File[]>([])
const pageSize = ref<'a4' | 'letter' | 'a3'>('a4')
const orientation = ref<'portrait' | 'landscape'>('portrait')
const useCloud = ref(false)
const isProcessing = ref(false)
const showSuccessModal = ref(false)
const resultUrl = ref('')
const errorMessage = ref('')

const { cloudProgress, cloudPhase, processInCloud } = useCloudProcessing()

const handleFilesSelected = (files: File[]) => {
  selectedFiles.value.push(...files)
  errorMessage.value = ''
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

const clearAll = () => {
  selectedFiles.value = []
  errorMessage.value = ''
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
}

const convertToPDF = async () => {
  if (selectedFiles.value.length === 0) return

  // 云端处理路径
  if (useCloud.value) {
    await convertInCloud()
    return
  }

  isProcessing.value = true
  errorMessage.value = ''

  try {
    const blob = await imagesToPDF(selectedFiles.value, {
      pageSize: pageSize.value,
      orientation: orientation.value,
    })
    resultUrl.value = memoryManager.createTemporaryURL(blob)

    // 添加到历史记录
    historyManager.addHistory({
      type: 'image-to-pdf',
      fileName: `${selectedFiles.value.length} images`,
      fileSize: selectedFiles.value.reduce((sum, f) => sum + f.size, 0),
      resultSize: blob.size,
    })

    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '转换失败'
  } finally {
    isProcessing.value = false
  }
}

/**
 * 云端图片转PDF
 */
const convertInCloud = async () => {
  if (selectedFiles.value.length === 0) return
  isProcessing.value = true
  errorMessage.value = ''

  try {
    // 上传所有图片文件
    const fileIds: string[] = []
    for (const file of selectedFiles.value) {
      const uploaded = await fileAPI.uploadFile(file)
      fileIds.push(uploaded.file_id)
    }

    // 提交转换任务并轮询
    const blob = await processInCloud(selectedFiles.value[0], () =>
      fileAPI.imagesToPDF(fileIds)
    )

    resultUrl.value = memoryManager.createTemporaryURL(blob)

    // 添加到历史记录
    historyManager.addHistory({
      type: 'image-to-pdf',
      fileName: `${selectedFiles.value.length} images`,
      fileSize: selectedFiles.value.reduce((sum, f) => sum + f.size, 0),
      resultSize: blob.size,
    })

    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '云端转换失败'
  } finally {
    isProcessing.value = false
  }
}

const downloadResult = () => {
  if (!resultUrl.value) return
  const link = document.createElement('a')
  link.href = resultUrl.value
  link.download = `images-${new Date().toISOString().slice(0, 10)}.pdf`
  link.click()
  showSuccessModal.value = false
}
</script>

<template>
  <div class="tool-page-container min-h-screen bg-background-light p-8 dark:bg-background-dark">
    <div class="mx-auto max-w-4xl">
      <div class="mb-8">
        <h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          {{ t('tools.imageToPdf.title') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-300">
          {{ t('tools.imageToPdf.desc') }}
        </p>
      </div>

      <div
        v-if="errorMessage"
        class="mb-4 rounded-lg bg-error-light p-4 text-error-dark dark:bg-error/20 dark:text-error"
      >
        {{ errorMessage }}
      </div>

      <DragDropZone
        v-if="selectedFiles.length === 0"
        accept="image"
        :multiple="true"
        @files-selected="handleFilesSelected"
        @error="handleError"
      />

      <div
        v-else
        class="space-y-6"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            已选择 {{ selectedFiles.length }} 张图片
          </h2>
          <Button
            variant="ghost"
            size="sm"
            @click="clearAll"
          >
            清空
          </Button>
        </div>

        <div class="space-y-2">
          <FilePreview
            v-for="(file, index) in selectedFiles"
            :key="index"
            :file="file"
            @remove="removeFile(index)"
          />
        </div>

        <DragDropZone
          accept="image"
          :multiple="true"
          class="min-h-[150px]"
          @files-selected="handleFilesSelected"
          @error="handleError"
        >
          <p class="text-sm text-gray-500">
            添加更多图片
          </p>
        </DragDropZone>

        <!-- 本地 / 云端处理切换 -->
        <CloudToggle v-model="useCloud" />

        <!-- Options -->
        <div class="grid grid-cols-2 gap-4 rounded-lg bg-white p-6 dark:bg-gray-800">
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
              页面尺寸
            </label>
            <select
              v-model="pageSize"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="a4">
                A4
              </option>
              <option value="letter">
                Letter
              </option>
              <option value="a3">
                A3
              </option>
            </select>
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
              方向
            </label>
            <select
              v-model="orientation"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="portrait">
                纵向
              </option>
              <option value="landscape">
                横向
              </option>
            </select>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          :loading="isProcessing"
          full-width
          @click="convertToPDF"
        >
          {{ isProcessing ? t('common.processing') : '转换为 PDF' }}
        </Button>
      </div>

      <Modal
        v-model="showSuccessModal"
        title="转换完成！"
        size="md"
      >
        <div class="text-center">
          <p class="mb-6 text-gray-600 dark:text-gray-300">
            图片已成功转换为 PDF
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
