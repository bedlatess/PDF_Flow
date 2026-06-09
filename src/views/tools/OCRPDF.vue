<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import Button from '@/components/common/Button.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import { useCloudProcessing } from '@/composables/useCloudProcessing'
import { fileAPI } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { historyManager } from '@/utils/history-manager'

useI18n()
const userStore = useUserStore()

const selectedFile = ref<File | null>(null)
const selectedLanguage = ref<string>('eng')
const isProcessing = ref(false)
const processingProgress = ref(0)
const processingStatus = ref('')
const showResultModal = ref(false)
const extractedText = ref('')
const ocrResult = ref<any>(null)
const errorMessage = ref('')

useCloudProcessing()

// 支持的OCR语言
const languageOptions = [
  { value: 'eng', label: 'English', icon: '🇬🇧' },
  { value: 'chi_sim', label: '简体中文', icon: '🇨🇳' },
  { value: 'chi_tra', label: '繁體中文', icon: '🇹🇼' },
  { value: 'jpn', label: '日本語', icon: '🇯🇵' },
  { value: 'kor', label: '한국어', icon: '🇰🇷' },
  { value: 'fra', label: 'Français', icon: '🇫🇷' },
  { value: 'deu', label: 'Deutsch', icon: '🇩🇪' },
  { value: 'spa', label: 'Español', icon: '🇪🇸' },
  { value: 'rus', label: 'Русский', icon: '🇷🇺' },
  { value: 'ara', label: 'العربية', icon: '🇸🇦' },
]

// 检查用户是否有OCR权限（Pro/Enterprise专享）
const canUseOCR = computed(() => {
  return userStore.isAuthenticated && userStore.canUseCloudFeatures
})

const handleFilesSelected = (files: File[]) => {
  selectedFile.value = files[0]
  errorMessage.value = ''
  extractedText.value = ''
  ocrResult.value = null
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const clearAll = () => {
  selectedFile.value = null
  extractedText.value = ''
  ocrResult.value = null
  errorMessage.value = ''
}

/**
 * 执行OCR识别（云端处理）
 */
const performOCR = async () => {
  if (!selectedFile.value) return

  if (!canUseOCR.value) {
    errorMessage.value = 'OCR 功能需要 Pro 或 Enterprise 套餐。请先登录或升级账户。'
    return
  }

  isProcessing.value = true
  processingProgress.value = 0
  processingStatus.value = '准备OCR识别...'
  errorMessage.value = ''

  try {
    // 上传文件并提交OCR任务
    processingStatus.value = '上传文件中...'
    const uploaded = await fileAPI.uploadFile(selectedFile.value)
    processingProgress.value = 20

    processingStatus.value = '提交OCR任务...'
    const job = await fileAPI.extractTextOCR(uploaded.file_id, selectedLanguage.value)
    processingProgress.value = 30

    // 轮询任务状态
    processingStatus.value = 'OCR识别中...'
    const finalStatus = await fileAPI.pollJobUntilDone(
      job.job_id,
      (status) => {
        if (status.progress) {
          processingProgress.value = Math.max(30, Math.min(90, status.progress))
        }
        processingStatus.value = `OCR识别中... ${Math.round(processingProgress.value)}%`
      }
    )

    if (finalStatus.status === 'failed') {
      throw new Error(finalStatus.error || 'OCR识别失败')
    }

    // 下载识别结果（文本文件）
    processingStatus.value = '下载结果...'
    processingProgress.value = 95
    const blob = await fileAPI.downloadResult(job.job_id)

    // 读取文本内容
    const text = await blob.text()
    extractedText.value = text

    // 尝试解析JSON结果（如果后端返回结构化数据）
    try {
      ocrResult.value = JSON.parse(text)
      if (ocrResult.value.text) {
        extractedText.value = ocrResult.value.text
      }
    } catch {
      // 如果不是JSON，就是纯文本
      ocrResult.value = {
        text: text,
        page_count: 1,
        language: selectedLanguage.value
      }
    }

    processingProgress.value = 100
    processingStatus.value = 'OCR识别完成！'

    // 添加到历史记录
    historyManager.addHistory({
      type: 'ocr',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: blob.size,
    })

    showResultModal.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'OCR识别失败'
  } finally {
    isProcessing.value = false
    processingProgress.value = 0
    processingStatus.value = ''
  }
}

/**
 * 下载识别的文本
 */
const downloadText = () => {
  if (!extractedText.value) return

  const blob = new Blob([extractedText.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ocr-${new Date().toISOString().slice(0, 10)}.txt`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * 复制文本到剪贴板
 */
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(extractedText.value)
    alert('文本已复制到剪贴板')
  } catch (error) {
    errorMessage.value = '复制失败，请手动选择文本复制'
  }
}

const closeResultModal = () => {
  showResultModal.value = false
}

onUnmounted(() => {
  // 清理资源
})
</script>

<template>
  <div class="tool-page-container min-h-screen bg-background-light p-8 dark:bg-background-dark">
    <div class="mx-auto max-w-4xl">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          📝 OCR 文字识别
        </h1>
        <p class="text-gray-600 dark:text-gray-300">
          从 PDF 或图片中提取文字，支持多种语言识别
        </p>
        <div
          v-if="!canUseOCR"
          class="mt-4 rounded-lg border-2 border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
        >
          <p class="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <span class="text-xl">⚠️</span>
            <span>OCR 功能需要 <strong>Pro</strong> 或 <strong>Enterprise</strong> 套餐。</span>
          </p>
        </div>
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
        v-if="!selectedFile"
        accept="pdf,image"
        :multiple="false"
        @files-selected="handleFilesSelected"
        @error="handleError"
      >
        <p class="text-sm text-gray-500">
          支持 PDF、PNG、JPG、JPEG 格式
        </p>
      </DragDropZone>

      <!-- File Selected -->
      <div
        v-else
        class="space-y-6"
      >
        <FilePreview
          :file="selectedFile"
          @remove="clearAll"
        />

        <!-- Language Selection -->
        <div class="rounded-lg bg-white p-6 dark:bg-gray-800">
          <label class="mb-3 block text-sm font-medium text-gray-900 dark:text-white">
            识别语言
          </label>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <button
              v-for="lang in languageOptions"
              :key="lang.value"
              :class="[
                'flex flex-col items-center gap-2 rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all',
                selectedLanguage === lang.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 text-gray-700 hover:border-primary/50 dark:border-gray-600 dark:text-gray-300',
              ]"
              @click="selectedLanguage = lang.value"
            >
              <span class="text-2xl">{{ lang.icon }}</span>
              <span class="text-xs">{{ lang.label }}</span>
            </button>
          </div>
        </div>

        <!-- Progress Bar -->
        <ProgressBar
          v-if="isProcessing"
          :progress="processingProgress"
          :label="processingStatus"
          variant="primary"
          size="md"
        />

        <!-- OCR Button -->
        <Button
          variant="primary"
          size="lg"
          :loading="isProcessing"
          :disabled="!canUseOCR"
          full-width
          @click="performOCR"
        >
          {{ isProcessing ? '识别中...' : '开始 OCR 识别' }}
        </Button>

        <p
          v-if="!canUseOCR"
          class="text-center text-sm text-gray-500"
        >
          请先 <router-link
            to="/auth/login"
            class="text-primary hover:underline"
          >
            登录
          </router-link> 或升级到 Pro 套餐使用此功能
        </p>
      </div>

      <!-- Result Modal -->
      <Modal
        v-model="showResultModal"
        title="OCR 识别结果"
        size="lg"
      >
        <div class="space-y-4">
          <!-- Result Info -->
          <div
            v-if="ocrResult"
            class="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700"
          >
            <div class="text-sm text-gray-600 dark:text-gray-300">
              <span v-if="ocrResult.page_count">共识别 {{ ocrResult.page_count }} 页</span>
              <span v-if="ocrResult.average_confidence" class="ml-4">
                置信度: {{ ocrResult.average_confidence }}%
              </span>
            </div>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                @click="copyToClipboard"
              >
                📋 复制
              </Button>
              <Button
                variant="outline"
                size="sm"
                @click="downloadText"
              >
                💾 下载
              </Button>
            </div>
          </div>

          <!-- Extracted Text -->
          <div class="max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-600 dark:bg-gray-800">
            <pre class="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{{ extractedText }}</pre>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3">
            <Button
              variant="outline"
              size="md"
              @click="closeResultModal"
            >
              关闭
            </Button>
            <Button
              variant="primary"
              size="md"
              @click="clearAll(); closeResultModal()"
            >
              识别更多文件
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  </div>
</template>
