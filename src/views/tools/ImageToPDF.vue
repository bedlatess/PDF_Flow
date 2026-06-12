<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText } from 'lucide-vue-next'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import Modal from '@/components/common/Modal.vue'
import CloudToggle from '@/components/common/CloudToggle.vue'
import { memoryManager } from '@/utils/memory-manager'
import { useCloudProcessing } from '@/composables/useCloudProcessing'
import { fileAPI } from '@/services/api'
import { historyManager } from '@/utils/history-manager'
import ToolPageShell from '@/components/tools/ToolPageShell.vue'
import { useUserStore } from '@/stores/user'
import { shouldPreferCloudProcessing } from '@/utils/cloud-recommendation'

const { t, tm } = useI18n()
const userStore = useUserStore()

type ToolPageCopy = Record<string, any>

const selectedFiles = ref<File[]>([])
const pageSize = ref<'a4' | 'letter' | 'a3'>('a4')
const orientation = ref<'portrait' | 'landscape'>('portrait')
const useCloud = ref(false)
const isProcessing = ref(false)
const showSuccessModal = ref(false)
const resultUrl = ref('')
const errorMessage = ref('')

const { processInCloud } = useCloudProcessing()

const copy = computed<ToolPageCopy>(() => ({
  ...(tm('tools.imageToPdf.page') as ToolPageCopy),
  filesTitle: t('tools.imageToPdf.page.filesTitle', { count: selectedFiles.value.length }),
}))

const handleFilesSelected = (files: File[]) => {
  selectedFiles.value.push(...files)
  useCloud.value = shouldPreferCloudProcessing(selectedFiles.value, userStore.canUseCloudFeatures)
  errorMessage.value = ''
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
  useCloud.value = shouldPreferCloudProcessing(selectedFiles.value, userStore.canUseCloudFeatures)
}

const clearAll = () => {
  selectedFiles.value = []
  useCloud.value = false
  errorMessage.value = ''
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
}

const convertToPDF = async () => {
  if (selectedFiles.value.length === 0) return

  if (useCloud.value) {
    await convertInCloud()
    return
  }

  isProcessing.value = true
  errorMessage.value = ''

  try {
    const { imagesToPDF } = await import('@/utils/pdf/convert')
    const blob = await imagesToPDF(selectedFiles.value, {
      pageSize: pageSize.value,
      orientation: orientation.value,
    })

    resultUrl.value = memoryManager.createTemporaryURL(blob)

    historyManager.addHistory({
      type: 'imageToPdf',
      fileName: `${selectedFiles.value.length} images`,
      fileSize: selectedFiles.value.reduce((sum, file) => sum + file.size, 0),
      resultSize: blob.size,
    })

    showSuccessModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : copy.value.errorFailed
  } finally {
    isProcessing.value = false
  }
}

const convertInCloud = async () => {
  if (selectedFiles.value.length === 0) return

  isProcessing.value = true
  errorMessage.value = ''

  try {
    const fileIds: string[] = []

    for (const file of selectedFiles.value) {
      const uploaded = await fileAPI.uploadFile(file)
      fileIds.push(uploaded.file_id)
    }

    const blob = await processInCloud(selectedFiles.value[0], () =>
      fileAPI.imagesToPDF(fileIds)
    )

    resultUrl.value = memoryManager.createTemporaryURL(blob)

    historyManager.addHistory({
      type: 'imageToPdf',
      fileName: `${selectedFiles.value.length} images`,
      fileSize: selectedFiles.value.reduce((sum, file) => sum + file.size, 0),
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
  link.download = `images-${new Date().toISOString().slice(0, 10)}.pdf`
  link.click()
  showSuccessModal.value = false
}
</script>

<template>
  <ToolPageShell
      :title="t('tools.imageToPdf.title')"
      :subtitle="t('tools.imageToPdf.desc')"
      :badge="copy.badge"
      accent="blue"
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
        v-if="selectedFiles.length === 0"
        accept="image"
        :multiple="true"
        @files-selected="handleFilesSelected"
        @error="handleError"
      />

      <div
        v-else
        class="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]"
      >
        <Card class="rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
          <div class="space-y-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-blue-500">
                  {{ copy.filesLabel }}
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {{ copy.filesTitle }}
                </h2>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.filesDesc }}
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
              <FilePreview
                v-for="(file, index) in selectedFiles"
                :key="`${file.name}-${index}`"
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
              <p class="text-sm text-slate-500 dark:text-slate-400">
                {{ copy.addMore }}
              </p>
            </DragDropZone>
          </div>
        </Card>

        <Card class="rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
          <div class="space-y-5">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-blue-500">
                {{ copy.outputLabel }}
              </p>
              <h3 class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                {{ copy.outputTitle }}
              </h3>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {{ copy.outputDesc }}
              </p>
            </div>

            <CloudToggle v-model="useCloud" />

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  for="image-to-pdf-page-size"
                  class="mb-2 block text-sm font-medium text-slate-900 dark:text-white"
                >
                  {{ copy.pageSize }}
                </label>
                <select
                  id="image-to-pdf-page-size"
                  v-model="pageSize"
                  class="w-full rounded-md border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                  <option value="a3">A3</option>
                </select>
              </div>
              <div>
                <label
                  for="image-to-pdf-orientation"
                  class="mb-2 block text-sm font-medium text-slate-900 dark:text-white"
                >
                  {{ copy.orientation }}
                </label>
                <select
                  id="image-to-pdf-orientation"
                  v-model="orientation"
                  class="w-full rounded-md border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="portrait">{{ copy.portrait }}</option>
                  <option value="landscape">{{ copy.landscape }}</option>
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
              {{ isProcessing ? t('common.processing') : copy.action }}
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
