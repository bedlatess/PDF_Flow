<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText } from 'lucide-vue-next'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import PageThumbnail from '@/components/pdf/PageThumbnail.vue'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import CloudToggle from '@/components/common/CloudToggle.vue'
import ToolHeader from '@/components/tools/ToolHeader.vue'
import { getPDFPageCount } from '@/utils/pdf/merge'
import { memoryManager } from '@/utils/memory-manager'
import { useDragSort } from '@/composables/useDragSort'
import { usePDFThumbnail } from '@/composables/usePDFThumbnail'
import { usePDFWorker } from '@/composables/usePDFWorker'
import { useCloudProcessing } from '@/composables/useCloudProcessing'
import { fileAPI } from '@/services/api'
import { historyManager } from '@/utils/history-manager'

const { t, locale } = useI18n()

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

const {
  items: sortedFiles,
  setItems,
  handleDragStart,
  handleDragEnter,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  isDragOver,
} = useDragSort<FileWithPages>()
const { generateMultipleThumbnails, clearThumbnails } = usePDFThumbnail()
const { submitTask, getTask, waitForTask, destroyWorker } = usePDFWorker()
const { processInCloud } = useCloudProcessing()

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
      generateMultipleThumbnails(file, pages.slice(0, 5), { width: 200 })
    }

    selectedFiles.value.push(...filesWithPages)
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载 PDF 文件失败'
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
  sortedFiles.value.forEach((item) => clearThumbnails(item.file))
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

  if (useCloud.value) {
    await mergeInCloud()
    return
  }

  isProcessing.value = true
  processingProgress.value = 0
  processingStatus.value = '准备处理...'
  errorMessage.value = ''

  try {
    const filesToMerge = sortedFiles.value.map((item) => item.file)
    processingStatus.value = `正在合并 ${filesToMerge.length} 个文件...`
    const taskId = await submitTask('merge', { files: filesToMerge })

    const progressInterval = setInterval(() => {
      const task = getTask(taskId)
      if (task) {
        processingProgress.value = task.progress
        if (task.progress < 100) {
          processingStatus.value = `处理中... ${Math.round(task.progress)}%`
        }
      }
    }, 100)

    const mergedBlob = await waitForTask(taskId) as Blob
    clearInterval(progressInterval)

    processingProgress.value = 100
    processingStatus.value = '处理完成'

    resultUrl.value = memoryManager.createTemporaryURL(mergedBlob)
    const timestamp = new Date().toISOString().slice(0, 10)
    resultFileName.value = `merged-${timestamp}.pdf`

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

const mergeInCloud = async () => {
  if (sortedFiles.value.length < 2) return
  isProcessing.value = true
  errorMessage.value = ''

  try {
    const fileIds: string[] = []
    for (const item of sortedFiles.value) {
      const uploaded = await fileAPI.uploadFile(item.file)
      fileIds.push(uploaded.file_id)
    }

    const blob = await processInCloud(sortedFiles.value[0].file, () =>
      fileAPI.mergePDFs(fileIds)
    )

    const timestamp = new Date().toISOString().slice(0, 10)
    resultFileName.value = `merged-${timestamp}.pdf`
    resultUrl.value = memoryManager.createTemporaryURL(blob)

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

const copy = computed(() => locale.value.startsWith('zh')
  ? {
      badge: '本地工具',
      queueLabel: '合并队列',
      queueTitle: '已选择文件',
      queueDesc: '共 {pages} 页。你可以直接拖拽卡片调整最终合并顺序。',
      clear: '清空列表',
      addMore: '继续添加更多文件',
      actionLabel: '输出动作',
      actionTitle: '确认顺序后开始合并',
      actionDesc: '可以选择本地处理或云端处理，处理完成后会生成新的合并文件。',
      fileCount: '文件数量',
      pageCount: '总页数',
      merge: '合并 PDF',
      successTitle: '合并完成',
      successMessage: '已成功合并 {count} 个 PDF 文件，共 {pages} 页。',
      mergeMore: '继续合并其他文件',
      pagesSuffix: '页',
      morePages: '还有 {count} 页...',
    }
  : {
      badge: 'Local tool',
      queueLabel: 'Merge queue',
      queueTitle: 'Selected files',
      queueDesc: '{pages} total pages. Drag the cards to adjust the final merge order.',
      clear: 'Clear list',
      addMore: 'Add more files',
      actionLabel: 'Output',
      actionTitle: 'Confirm the order, then merge',
      actionDesc: 'Choose local or cloud processing. A new merged file will be generated when the task finishes.',
      fileCount: 'Files',
      pageCount: 'Pages',
      merge: 'Merge PDF',
      successTitle: 'Merge complete',
      successMessage: 'Successfully merged {count} PDF files with {pages} total pages.',
      mergeMore: 'Merge more files',
      pagesSuffix: 'pages',
      morePages: '{count} more pages...',
    })

onUnmounted(() => {
  destroyWorker()
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/20">
    <ToolHeader
      :title="t('tools.merge.title')"
      :subtitle="t('tools.merge.desc')"
      :badge="copy.badge"
      accent="blue"
    >
      <template #badgeIcon>
        <FileText class="h-4 w-4" />
      </template>
    </ToolHeader>

    <section class="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-6">
      <div
        v-if="errorMessage"
        class="mb-4 rounded-lg bg-error-light p-4 text-error-dark dark:bg-error/20 dark:text-error"
      >
        {{ errorMessage }}
      </div>

      <DragDropZone
        v-if="selectedFiles.length === 0"
        accept="pdf"
        :multiple="true"
        :max-files="20"
        @files-selected="handleFilesSelected"
        @error="handleError"
      />

      <div
        v-else
        class="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]"
      >
        <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-blue-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
          <div class="space-y-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-blue-500">
                  {{ copy.queueLabel }}
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {{ copy.queueTitle }}
                </h2>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.queueDesc.replace('{pages}', String(totalPages)) }}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                @click="clearAll"
              >
                {{ copy.clear }}
              </Button>
            </div>

            <div class="space-y-3">
              <div
                v-for="(item, index) in sortedFiles"
                :key="`${item.file.name}-${index}`"
                :class="[
                  'rounded-[24px] border p-4 shadow-sm transition-all dark:bg-slate-950/40',
                  isDragOver(index)
                    ? 'border-blue-300 bg-blue-50/80 shadow-blue-100'
                    : 'border-slate-200 bg-slate-50/80 dark:border-slate-800',
                ]"
                draggable="true"
                @dragstart="handleDragStart($event, index)"
                @dragenter="handleDragEnter($event, index)"
                @dragover="handleDragOver"
                @drop="handleDrop($event, index)"
                @dragend="handleDragEnd"
              >
                <div class="flex items-center gap-4">
                  <div class="cursor-move text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
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

                  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm shadow-blue-200">
                    {{ index + 1 }}
                  </div>

                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {{ item.file.name }}
                    </p>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {{ item.pageCount }} {{ copy.pagesSuffix }}
                    </p>
                  </div>

                  <button
                    class="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-error dark:hover:bg-slate-800"
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
                    class="mt-2 text-center text-xs text-slate-500 dark:text-slate-400"
                  >
                    {{ copy.morePages.replace('{count}', String(item.pages.length - 5)) }}
                  </p>
                </div>
              </div>
            </div>

            <DragDropZone
              accept="pdf"
              :multiple="true"
              :max-files="20"
              class="min-h-[150px]"
              @files-selected="handleFilesSelected"
              @error="handleError"
            >
              <p class="text-sm text-slate-500 dark:text-slate-400">
                {{ copy.addMore }}
              </p>
            </DragDropZone>
          </div>
        </Card>

        <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-blue-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
          <div class="space-y-5">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-blue-500">
                {{ copy.actionLabel }}
              </p>
              <h3 class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                {{ copy.actionTitle }}
              </h3>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {{ copy.actionDesc }}
              </p>
            </div>

            <CloudToggle v-model="useCloud" />

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div class="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p class="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{{ copy.fileCount }}</p>
                <p class="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                  {{ sortedFiles.length }}
                </p>
              </div>
              <div class="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p class="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{{ copy.pageCount }}</p>
                <p class="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                  {{ totalPages }}
                </p>
              </div>
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
              :disabled="sortedFiles.length < 2"
              full-width
              @click="mergePDFFiles"
            >
              {{ isProcessing ? t('common.processing') : copy.merge }}
            </Button>
          </div>
        </Card>
      </div>

      <Modal
        v-model="showSuccessModal"
        :title="copy.successTitle"
        size="md"
      >
        <div class="text-center">
          <p class="mb-6 text-gray-600 dark:text-gray-300">
            {{ copy.successMessage.replace('{count}', String(sortedFiles.length)).replace('{pages}', String(totalPages)) }}
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
              {{ copy.mergeMore }}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  </div>
</template>
