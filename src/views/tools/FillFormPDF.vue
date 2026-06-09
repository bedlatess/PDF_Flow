<template>
  <div class="container mx-auto px-4 py-8 max-w-5xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        {{ t('tools.fillForm.title') }}
      </h1>
      <p class="text-gray-600">
        {{ t('tools.fillForm.description') }}
      </p>
      <div class="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
        <Crown class="w-4 h-4" />
        <span>{{ t('tools.fillForm.proOnly') }}</span>
      </div>
    </div>

    <!-- Step 1: Upload PDF -->
    <Card v-if="step === 1" class="mb-6">
      <template #header>
        <h2 class="text-xl font-semibold">{{ t('tools.fillForm.step1') }}</h2>
      </template>

      <DragDropZone
        :accept="['application/pdf']"
        :max-files="1"
        @files-added="handleFileUpload"
      >
        <template #default>
          <Upload class="w-12 h-12 text-gray-400 mb-4" />
          <p class="text-lg font-medium text-gray-700 mb-2">
            {{ t('common.dragDrop') }}
          </p>
          <p class="text-sm text-gray-500">
            {{ t('common.or') }} <span class="text-blue-600">{{ t('common.browse') }}</span>
          </p>
        </template>
      </DragDropZone>

      <div v-if="uploadedFile" class="mt-4">
        <FilePreview
          :file="uploadedFile"
          @remove="handleRemoveFile"
        />
      </div>
    </Card>

    <!-- Step 2: Analyze Form Fields -->
    <Card v-if="step === 2" class="mb-6">
      <template #header>
        <h2 class="text-xl font-semibold">{{ t('tools.fillForm.step2') }}</h2>
      </template>

      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600">{{ t('tools.fillForm.analyzing') }}</p>
      </div>

      <div v-else-if="formFields.length > 0">
        <p class="text-sm text-gray-600 mb-4">
          {{ t('tools.fillForm.foundFields', { count: formFields.length }) }}
        </p>

        <div class="space-y-4">
          <div
            v-for="(field, index) in formFields"
            :key="index"
            class="p-4 border border-gray-200 rounded-lg"
          >
            <div class="flex items-start justify-between mb-2">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ field.name }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <p class="text-xs text-gray-500">
                  {{ t(`tools.fillForm.fieldTypes.${field.type}`) }}
                </p>
              </div>
              <span
                class="px-2 py-1 text-xs font-medium rounded"
                :class="field.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'"
              >
                {{ field.required ? t('common.required') : t('common.optional') }}
              </span>
            </div>

            <!-- Text Input -->
            <input
              v-if="field.type === 'text'"
              v-model="field.value"
              type="text"
              :placeholder="field.default_value || t('tools.fillForm.enterValue')"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <!-- Checkbox -->
            <label v-else-if="field.type === 'checkbox'" class="flex items-center">
              <input
                v-model="field.value"
                type="checkbox"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span class="ml-2 text-sm text-gray-700">
                {{ field.default_value || t('tools.fillForm.checkThis') }}
              </span>
            </label>

            <!-- Radio Buttons -->
            <div v-else-if="field.type === 'radio'" class="space-y-2">
              <label
                v-for="(option, optIndex) in field.options || []"
                :key="optIndex"
                class="flex items-center"
              >
                <input
                  v-model="field.value"
                  type="radio"
                  :value="option"
                  class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">{{ option }}</span>
              </label>
            </div>

            <!-- Dropdown -->
            <select
              v-else-if="field.type === 'dropdown'"
              v-model="field.value"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{{ t('tools.fillForm.selectOption') }}</option>
              <option
                v-for="(option, optIndex) in field.options || []"
                :key="optIndex"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
          </div>
        </div>

        <div class="mt-6 flex gap-4">
          <Button @click="step = 1" variant="outline">
            <ArrowLeft class="w-4 h-4 mr-2" />
            {{ t('common.back') }}
          </Button>
          <Button @click="handleFillForm" :disabled="!canSubmit">
            <FileCheck class="w-4 h-4 mr-2" />
            {{ t('tools.fillForm.fillForm') }}
          </Button>
        </div>
      </div>

      <div v-else class="text-center py-8 text-gray-500">
        <AlertCircle class="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>{{ t('tools.fillForm.noFields') }}</p>
        <Button @click="step = 1" variant="outline" class="mt-4">
          {{ t('common.back') }}
        </Button>
      </div>
    </Card>

    <!-- Step 3: Processing -->
    <Card v-if="step === 3" class="mb-6">
      <template #header>
        <h2 class="text-xl font-semibold">{{ t('tools.fillForm.step3') }}</h2>
      </template>

      <div class="text-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600 mb-2">{{ t('tools.fillForm.filling') }}</p>
        <ProgressBar :progress="progress" class="mt-4" />
      </div>
    </Card>

    <!-- Step 4: Success -->
    <Card v-if="step === 4" class="mb-6">
      <template #header>
        <h2 class="text-xl font-semibold text-green-600">
          <CheckCircle class="w-6 h-6 inline mr-2" />
          {{ t('tools.fillForm.success') }}
        </h2>
      </template>

      <div class="text-center py-8">
        <CheckCircle class="w-16 h-16 text-green-500 mx-auto mb-4" />
        <p class="text-lg text-gray-700 mb-2">{{ t('tools.fillForm.successMessage') }}</p>
        <p class="text-sm text-gray-500 mb-6">
          {{ t('tools.fillForm.filledFields', { count: formFields.length }) }}
        </p>

        <div class="flex gap-4 justify-center">
          <Button @click="handleDownload">
            <Download class="w-4 h-4 mr-2" />
            {{ t('common.download') }}
          </Button>
          <Button @click="handleReset" variant="outline">
            <RotateCcw class="w-4 h-4 mr-2" />
            {{ t('common.fillAnother') }}
          </Button>
        </div>
      </div>
    </Card>

    <!-- Error State -->
    <Card v-if="error" class="mb-6 border-red-200">
      <div class="flex items-start gap-3 text-red-700">
        <AlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p class="font-medium">{{ t('common.error') }}</p>
          <p class="text-sm mt-1">{{ error }}</p>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { advancedAPI } from '@/services/api'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import {
  Upload,
  Crown,
  ArrowLeft,
  FileCheck,
  CheckCircle,
  Download,
  RotateCcw,
  AlertCircle
} from 'lucide-vue-next'

const { t } = useI18n()
const userStore = useUserStore()

// State
const step = ref(1)
const uploadedFile = ref<File | null>(null)
const formFields = ref<any[]>([])
const loading = ref(false)
const progress = ref(0)
const error = ref('')
const resultJobId = ref('')

// Computed
const canSubmit = computed(() => {
  return formFields.value.every(field => {
    if (field.required) {
      return field.value !== '' && field.value !== null && field.value !== undefined
    }
    return true
  })
})

// Handlers
const handleFileUpload = async (files: File[]) => {
  if (files.length === 0) return

  uploadedFile.value = files[0]
  error.value = ''

  // Auto-advance to step 2 and analyze
  step.value = 2
  await analyzeFormFields()
}

const handleRemoveFile = () => {
  uploadedFile.value = null
  formFields.value = []
  step.value = 1
}

const analyzeFormFields = async () => {
  if (!uploadedFile.value) return

  loading.value = true
  error.value = ''

  try {
    const result = await advancedAPI.getFormFields(uploadedFile.value)
    formFields.value = result.fields.map(field => ({
      ...field,
      value: field.default_value || (field.type === 'checkbox' ? false : '')
    }))
  } catch (err: any) {
    error.value = err.response?.data?.detail || t('tools.fillForm.analyzeError')
    step.value = 1
  } finally {
    loading.value = false
  }
}

const handleFillForm = async () => {
  if (!uploadedFile.value || !canSubmit.value) return

  step.value = 3
  progress.value = 0
  error.value = ''

  // Prepare form data
  const formData = formFields.value.reduce((acc, field) => {
    acc[field.name] = field.value
    return acc
  }, {} as Record<string, any>)

  try {
    // Simulate progress
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += 10
      }
    }, 300)

    const result = await advancedAPI.fillForm(uploadedFile.value, formData)

    clearInterval(progressInterval)
    progress.value = 100

    resultJobId.value = result.job_id
    step.value = 4
  } catch (err: any) {
    error.value = err.response?.data?.detail || t('tools.fillForm.fillError')
    step.value = 2
  }
}

const handleDownload = async () => {
  if (!resultJobId.value) return

  try {
    await advancedAPI.downloadResult(resultJobId.value, 'filled-form.pdf')
  } catch (err: any) {
    error.value = t('common.downloadError')
  }
}

const handleReset = () => {
  uploadedFile.value = null
  formFields.value = []
  resultJobId.value = ''
  progress.value = 0
  error.value = ''
  step.value = 1
}
</script>
