<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import PageThumbnail from '@/components/pdf/PageThumbnail.vue'
import Button from '@/components/common/Button.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import CloudToggle from '@/components/common/CloudToggle.vue'
import { getPDFPageCount } from '@/utils/pdf/merge'
import { memoryManager } from '@/utils/memory-manager'
import { useDragSort } from '@/composables/useDragSort'
import { usePDFThumbnail } from '@/composables/usePDFThumbnail'
import { usePDFWorker } from '@/composables/usePDFWorker'
import { useCloudProcessing } from '@/composables/useCloudProcessing'
import { fileAPI } from '@/services/api'
import { historyManager } from '@/utils/history-manager'

const { t } = useI18n()

interface FileWithPages {
  file: File
  pageCount: number
  pages: number[]
}

const selectedFiles = ref<FileWithPages[]>([])
const useCloud = ref(false)
const isProcessing = ref(false)
const processingProgress = ref(0)
const processingStatus = ref('')
const showSuccessModal = ref(false)
const resultUrl = ref('')
const resultFileName = ref('')
const errorMessage = ref('')

const { items: sortedFiles, setItems, handleDragStart, handleDragEnter, handleDragOver, handleDrop, handleDragEnd, isDragOver } = useDragSort<FileWithPages>()
const { generateMultipleThumbnails, clearThumbnails } = usePDFThumbnail()
const { submitTask, getTask, waitForTask, destroyWorker } = usePDFWorker()
const { processInCloud } = useCloudProcessing()

// 监听 selectedFiles 变化，同步到 sortedFiles
watch(selectedFiles, (newFiles) => {
  setItems(newFiles)
}, { immediate: true, deep: true })

const handleFilesSelected = async (files: File[]) => {
  try {
    const filesWithPages: FileWithPages[] = []

    for (const file of files) {
      const pageCount = await getPDFPageCount(file)
      const pages = Array.from({ length: pageCount }, (_, i) => i + 1)
      filesWithPages.push({ file, pageCount, pages })

      // 生成缩略图（后台异步）
      generateMultipleThumbnails(file, pages.slice(0, 5), { width: 200 })
    }

    selectedFiles.value.push(...filesWithPages)
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load PDF files'
  }
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const removeFile = (index: number) => {
  const fileToRemove = sortedFiles.value[index]
  if (fileToRemove) {
    clearThumbnails(fileToRemove.file)
  }
  sortedFiles.value.splice(index, 1)
  selectedFiles.value = [...sortedFiles.value]
}

const clearAll = () => {
  sortedFiles.value.forEach(item => clearThumbnails(item.file))
  selectedFiles.value = []
  errorMessage.value = ''

  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
}

const mergePDFFiles = async () => {
  if (sortedFiles.value.length < 2) {
    errorMessage.value = '请至少选择 2 个 PDF 文件进行合并'
    return
  }

  // 云端处理路径
  if (useCloud.value) {
    await mergeInCloud()
    return
  }

  isProcessing.value = true
  processingProgress.value = 0
  processingStatus.value = '准备处理...'
  errorMessage.value = ''

  try {
    const filesToMerge = sortedFiles.value.map(item => item.file)

    // 提交到 Worker 处理
    processingStatus.value = `正在合并 ${filesToMerge.length} 个文件...`
    const taskId = await submitTask('merge', { files: filesToMerge })

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

    // 等待任务完成
    const mergedBlob = await waitForTask(taskId) as Blob
    clearInterval(progressInterval)

    processingProgress.value = 100
    processingStatus.value = '处理完成！'

    resultUrl.value = memoryManager.createTemporaryURL(mergedBlob)
    const timestamp = new Date().toISOString().slice(0, 10)
    resultFileName.value = `merged-${timestamp}.pdf`

    // 添加到历史记录
    historyManager.addHistory({
      type: 'merge',
      fileName: `${sortedFiles.value.length} files`,
      fileSize: sortedFiles.value.reduce((sum, f) => sum + f.file.size, 0),
      resultSize: mergedBlob.size,
    })

    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '合并 PDF 失败'
  } finally {
    isProcessing.value = false
    processingProgress.value = 0
    processingStatus.value = ''
  }
}

/**
 * 云端合并：上传所有文件 → 提交合并任务 → 轮询 → 下载
 */
const mergeInCloud = async () => {
  if (sortedFiles.value.length < 2) return
  isProcessing.value = true
  errorMessage.value = ''

  try {
    // 上传所有文件并获取 file_ids
    const fileIds: string[] = []
    for (const item of sortedFiles.value) {
      const uploaded = await fileAPI.uploadFile(item.file)
      fileIds.push(uploaded.file_id)
    }

    // 提交合并任务并轮询
    const blob = await processInCloud(sortedFiles.value[0].file, () =>
      fileAPI.mergePDFs(fileIds)
    )

    const timestamp = new Date().toISOString().slice(0, 10)
    resultFileName.value = `merged-${timestamp}.pdf`
    resultUrl.value = memoryManager.createTemporaryURL(blob)

    // 添加到历史记录
    historyManager.addHistory({
      type: 'merge',
      fileName: `${sortedFiles.value.length} files`,
      fileSize: sortedFiles.value.reduce((sum, f) => sum + f.file.size, 0),
      resultSize: blob.size,
    })

    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '云端合并失败'
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

const totalPages = computed(() => {
  return sortedFiles.value.reduce((sum, item) => sum + item.pageCount, 0)
})

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
    <div class="mx-auto max-w-6xl">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          {{ t('tools.merge.title') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-300">
          {{ t('tools.merge.desc') }}
        </p>
        <p
          v-if="sortedFiles.length > 0"
          class="mt-2 text-sm text-gray-500"
        >
          💡 提示：拖拽文件卡片可以调整合并顺序
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
        v-if="selectedFiles.length === 0"
        accept="pdf"
        :multiple="true"
        :max-files="20"
        @files-selected="handleFilesSelected"
        @error="handleError"
      />

      <!-- File List with Drag Sort -->
      <div
        v-else
        class="space-y-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              已选择 {{ sortedFiles.length }} 个文件
            </h2>
            <p class="text-sm text-gray-500">
              共 {{ totalPages }} 页
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            @click="clearAll"
          >
            清空列表
          </Button>
        </div>

        <!-- 本地 / 云端处理切换 -->
        <CloudToggle v-model="useCloud" />

        <!-- Draggable File List -->
        <div class="space-y-3">
          <div
            v-for="(item, index) in sortedFiles"
            :key="`${item.file.name}-${index}`"
            data-testid="file-preview"
            :class="[
              'rounded-lg border-2 bg-white p-4 transition-all dark:bg-gray-800',
              isDragOver(index)
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 dark:border-gray-700',
            ]"
            draggable="true"
            @dragstart="handleDragStart($event, index)"
            @dragenter="handleDragEnter($event, index)"
            @dragover="handleDragOver"
            @drop="handleDrop($event, index)"
            @dragend="handleDragEnd"
          >
            <div class="flex items-center gap-4">
              <!-- Drag Handle -->
              <div class="flex-shrink-0 cursor-move text-gray-400 hover:text-gray-600">
                <svg
                  class="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2zm0-4a1 1 0 100-2 1 1 0 000 2zm0-4a1 1 0 100-2 1 1 0 000 2z"
                  />
                </svg>
              </div>

              <!-- Order Number -->
              <div
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white"
              >
                {{ index + 1 }}
              </div>

              <!-- File Info -->
              <div class="flex-1 min-w-0">
                <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {{ item.file.name }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ item.pageCount }} 页
                </p>
              </div>

              <!-- Remove Button -->
              <button
                class="flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-error dark:hover:bg-gray-700"
                @click="removeFile(index)"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>

            <!-- Page Thumbnails Preview (first 5 pages) -->
            <div
              v-if="item.pages.length > 0"
              class="mt-4"
            >
              <div class="grid grid-cols-5 gap-2">
                <PageThumbnail
                  v-for="pageNum in item.pages.slice(0, 5)"
                  :key="pageNum"
                  :file="item.file"
                  :page-number="pageNum"
                />
              </div>
              <p
                v-if="item.pages.length > 5"
                class="mt-2 text-center text-xs text-gray-500"
              >
                还有 {{ item.pages.length - 5 }} 页...
              </p>
            </div>
          </div>
        </div>

        <!-- Add More -->
        <DragDropZone
          accept="pdf"
          :multiple="true"
          :max-files="20"
          class="min-h-[150px]"
          @files-selected="handleFilesSelected"
          @error="handleError"
        >
          <p class="text-sm text-gray-500">
            或继续添加更多文件
          </p>
        </DragDropZone>

        <!-- Actions -->
        <div class="space-y-4">
          <!-- Progress Bar -->
          <ProgressBar
            v-if="isProcessing"
            :progress="processingProgress"
            :label="processingStatus"
            variant="primary"
            size="md"
          />

          <!-- Merge Button -->
          <Button
            variant="primary"
            size="lg"
            :loading="isProcessing"
            :disabled="sortedFiles.length < 2"
            full-width
            @click="mergePDFFiles"
          >
            {{ isProcessing ? t('common.processing') : '合并 PDF' }}
          </Button>
        </div>
      </div>

      <!-- Success Modal -->
      <Modal
        v-model="showSuccessModal"
        title="合并完成！"
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

          <p class="mb-6 text-gray-600 dark:text-gray-300">
            已成功合并 {{ sortedFiles.length }} 个 PDF 文件（共 {{ totalPages }} 页）
          </p>

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
              合并更多文件
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  </div>
</template>
