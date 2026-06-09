<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-block p-3 bg-blue-100 rounded-full mb-4">
          <FileText class="h-8 w-8 text-blue-600" />
        </div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ $t('tools.officeToPdf.title') }}</h1>
        <p class="text-gray-600">{{ $t('tools.officeToPdf.desc') }}</p>
      </div>

      <!-- Main Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <!-- Upload Zone -->
        <div v-if="!uploadedFile">
          <DragDropZone
            :accept="acceptedFileTypes"
            @files-dropped="handleFileDrop"
            :max-files="1"
          >
            <template #icon>
              <FileText class="h-16 w-16 text-blue-500 mb-4" />
            </template>
            <template #title>
              {{ $t('tools.officeToPdf.dropFile') }}
            </template>
            <template #subtitle>
              {{ $t('tools.officeToPdf.supportedFormats') }}
            </template>
          </DragDropZone>

          <!-- Supported Formats -->
          <div class="mt-6 grid grid-cols-3 gap-4">
            <div class="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
              <FileText class="h-5 w-5 text-blue-600 mr-2" />
              <span class="text-sm font-medium text-gray-700">Word (.docx)</span>
            </div>
            <div class="flex items-center justify-center p-4 bg-green-50 rounded-lg">
              <FileText class="h-5 w-5 text-green-600 mr-2" />
              <span class="text-sm font-medium text-gray-700">Excel (.xlsx)</span>
            </div>
            <div class="flex items-center justify-center p-4 bg-orange-50 rounded-lg">
              <FileText class="h-5 w-5 text-orange-600 mr-2" />
              <span class="text-sm font-medium text-gray-700">PowerPoint (.pptx)</span>
            </div>
          </div>
        </div>

        <!-- File Preview -->
        <div v-else class="space-y-6">
          <FilePreview
            :file="uploadedFile"
            @remove="removeFile"
          />

          <!-- Cloud Processing Toggle (Pro/Enterprise only) -->
          <CloudToggle
            v-if="userStore.isAuthenticated"
            v-model="useCloudProcessing"
            :disabled="!userStore.isProOrEnterprise"
          />

          <!-- Convert Button -->
          <button
            @click="convertFile"
            :disabled="converting"
            class="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <Loader2 v-if="converting" class="animate-spin -ml-1 mr-2 h-5 w-5" />
            <ArrowRight v-else class="mr-2 h-5 w-5" />
            {{ converting ? $t('common.processing') : $t('tools.officeToPdf.convert') }}
          </button>

          <!-- Progress Bar -->
          <ProgressBar
            v-if="converting"
            :progress="progress"
            :status="status"
          />

          <!-- Error Message -->
          <div v-if="errorMessage" class="rounded-lg bg-red-50 p-4">
            <div class="flex">
              <AlertCircle class="h-5 w-5 text-red-400" />
              <div class="ml-3">
                <p class="text-sm text-red-800">{{ errorMessage }}</p>
              </div>
            </div>
          </div>

          <!-- Result -->
          <div v-if="resultUrl" class="rounded-lg bg-green-50 p-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <CheckCircle2 class="h-6 w-6 text-green-500 mr-3" />
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">{{ $t('tools.officeToPdf.success') }}</h3>
                  <p class="text-sm text-gray-600">{{ $t('tools.officeToPdf.downloadReady') }}</p>
                </div>
              </div>
              <button
                @click="downloadResult"
                class="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download class="h-5 w-5 mr-2" />
                {{ $t('common.download') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Section -->
      <div class="mt-8 bg-blue-50 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">{{ $t('tools.officeToPdf.howItWorks') }}</h3>
        <ul class="space-y-2 text-gray-700">
          <li class="flex items-start">
            <span class="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium mr-3">1</span>
            <span>{{ $t('tools.officeToPdf.step1') }}</span>
          </li>
          <li class="flex items-start">
            <span class="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium mr-3">2</span>
            <span>{{ $t('tools.officeToPdf.step2') }}</span>
          </li>
          <li class="flex items-start">
            <span class="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium mr-3">3</span>
            <span>{{ $t('tools.officeToPdf.step3') }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FileText, ArrowRight, Loader2, AlertCircle, CheckCircle2, Download } from 'lucide-vue-next'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import CloudToggle from '@/components/common/CloudToggle.vue'
import { useUserStore } from '@/stores/user'
import { fileAPI } from '@/services/api'

const userStore = useUserStore()

const acceptedFileTypes = '.docx,.doc,.xlsx,.xls,.pptx,.ppt'
const uploadedFile = ref<File | null>(null)
const useCloudProcessing = ref(false)
const converting = ref(false)
const progress = ref(0)
const status = ref('')
const errorMessage = ref('')
const resultUrl = ref('')

const handleFileDrop = (files: File[]) => {
  if (files.length > 0) {
    const file = files[0]
    const extension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt']

    if (!extension || !allowedExtensions.includes(extension)) {
      errorMessage.value = 'Please upload a valid Office file (Word, Excel, or PowerPoint)'
      return
    }

    uploadedFile.value = file
    errorMessage.value = ''
    resultUrl.value = ''
  }
}

const removeFile = () => {
  uploadedFile.value = null
  errorMessage.value = ''
  resultUrl.value = ''
  progress.value = 0
}

const convertFile = async () => {
  if (!uploadedFile.value) return

  // Check authentication for cloud processing
  if (useCloudProcessing.value && !userStore.isAuthenticated) {
    errorMessage.value = 'Please login to use cloud processing'
    return
  }

  converting.value = true
  errorMessage.value = ''
  progress.value = 0
  status.value = 'Converting...'

  try {
    if (useCloudProcessing.value) {
      // Cloud processing
      await convertWithCloud()
    } else {
      // Local processing not supported for Office files
      errorMessage.value = 'Office conversion requires cloud processing. Please login and enable cloud mode.'
      converting.value = false
    }
  } catch (error: any) {
    console.error('Conversion error:', error)
    errorMessage.value = error.message || 'Conversion failed. Please try again.'
    converting.value = false
  }
}

const convertWithCloud = async () => {
  if (!uploadedFile.value) return

  // Upload file and get job
  progress.value = 20
  status.value = 'Uploading to server...'

  const formData = new FormData()
  formData.append('file', uploadedFile.value)

  const response = await fileAPI.officeToPDF(formData)
  const jobId = response.job_id

  // Poll for completion
  progress.value = 50
  status.value = 'Converting on server...'

  await fileAPI.pollJobUntilDone(jobId, (p) => {
    progress.value = 50 + (p * 0.4) // 50-90%
  })

  // Download result
  progress.value = 90
  status.value = 'Preparing download...'

  const blob = await fileAPI.downloadResult(jobId)
  resultUrl.value = URL.createObjectURL(blob)

  progress.value = 100
  status.value = 'Completed!'
  converting.value = false
}

const downloadResult = () => {
  if (!resultUrl.value || !uploadedFile.value) return

  const link = document.createElement('a')
  link.href = resultUrl.value
  const originalName = uploadedFile.value.name
  const pdfName = originalName.replace(/\.(docx|doc|xlsx|xls|pptx|ppt)$/i, '.pdf')
  link.download = pdfName
  link.click()
}
</script>
