<template>
  <div class="container mx-auto px-4 py-8 max-w-5xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        {{ t('tools.annotate.title') }}
      </h1>
      <p class="text-gray-600">
        {{ t('tools.annotate.description') }}
      </p>
      <div class="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
        <Crown class="w-4 h-4" />
        <span>{{ t('tools.annotate.proOnly') }}</span>
      </div>
    </div>

    <!-- Step 1: Upload PDF -->
    <Card v-if="step === 1" class="mb-6">
      <template #header>
        <h2 class="text-xl font-semibold">{{ t('tools.annotate.step1') }}</h2>
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

    <!-- Step 2: Choose Annotation Type & Configure -->
    <Card v-if="step === 2" class="mb-6">
      <template #header>
        <h2 class="text-xl font-semibold">{{ t('tools.annotate.step2') }}</h2>
      </template>

      <!-- Annotation Type Selector -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-3">
          {{ t('tools.annotate.selectType') }}
        </label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            @click="annotationType = 'text'"
            :class="[
              'p-4 border-2 rounded-lg text-left transition-all',
              annotationType === 'text'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <MessageSquare class="w-6 h-6 mb-2" :class="annotationType === 'text' ? 'text-blue-600' : 'text-gray-600'" />
            <div class="font-medium">{{ t('tools.annotate.types.text') }}</div>
            <div class="text-sm text-gray-500">{{ t('tools.annotate.types.textDesc') }}</div>
          </button>

          <button
            @click="annotationType = 'highlight'"
            :class="[
              'p-4 border-2 rounded-lg text-left transition-all',
              annotationType === 'highlight'
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <Highlighter class="w-6 h-6 mb-2" :class="annotationType === 'highlight' ? 'text-yellow-600' : 'text-gray-600'" />
            <div class="font-medium">{{ t('tools.annotate.types.highlight') }}</div>
            <div class="text-sm text-gray-500">{{ t('tools.annotate.types.highlightDesc') }}</div>
          </button>
        </div>
      </div>

      <!-- Text Annotation Configuration -->
      <div v-if="annotationType === 'text'" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {{ t('tools.annotate.text.content') }}
          </label>
          <textarea
            v-model="textAnnotation.text"
            rows="3"
            :placeholder="t('tools.annotate.text.placeholder')"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('tools.annotate.text.page') }}
            </label>
            <input
              v-model.number="textAnnotation.page"
              type="number"
              min="1"
              :placeholder="t('tools.annotate.text.pagePlaceholder')"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('tools.annotate.text.color') }}
            </label>
            <div class="flex gap-2">
              <button
                v-for="color in textColors"
                :key="color.value"
                @click="textAnnotation.color = color.value"
                :class="[
                  'w-10 h-10 rounded-md border-2 transition-all',
                  textAnnotation.color === color.value ? 'border-gray-800 scale-110' : 'border-gray-300'
                ]"
                :style="{ backgroundColor: color.value }"
                :title="color.name"
              ></button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('tools.annotate.text.x') }}
            </label>
            <input
              v-model.number="textAnnotation.x"
              type="number"
              min="0"
              placeholder="100"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('tools.annotate.text.y') }}
            </label>
            <input
              v-model.number="textAnnotation.y"
              type="number"
              min="0"
              placeholder="100"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <!-- Highlight Annotation Configuration -->
      <div v-if="annotationType === 'highlight'" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('tools.annotate.highlight.page') }}
            </label>
            <input
              v-model.number="highlightAnnotation.page"
              type="number"
              min="1"
              :placeholder="t('tools.annotate.highlight.pagePlaceholder')"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('tools.annotate.highlight.color') }}
            </label>
            <div class="flex gap-2">
              <button
                v-for="color in highlightColors"
                :key="color.value"
                @click="highlightAnnotation.color = color.value"
                :class="[
                  'w-10 h-10 rounded-md border-2 transition-all',
                  highlightAnnotation.color === color.value ? 'border-gray-800 scale-110' : 'border-gray-300'
                ]"
                :style="{ backgroundColor: color.value }"
                :title="color.name"
              ></button>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {{ t('tools.annotate.highlight.coordinates') }}
          </label>
          <div class="grid grid-cols-4 gap-2">
            <input
              v-model.number="highlightAnnotation.x1"
              type="number"
              placeholder="x1"
              class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              v-model.number="highlightAnnotation.y1"
              type="number"
              placeholder="y1"
              class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              v-model.number="highlightAnnotation.x2"
              type="number"
              placeholder="x2"
              class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              v-model.number="highlightAnnotation.y2"
              type="number"
              placeholder="y2"
              class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <p class="text-xs text-gray-500 mt-1">{{ t('tools.annotate.highlight.coordsHelp') }}</p>
        </div>
      </div>

      <div class="mt-6 flex gap-4">
        <Button @click="step = 1" variant="outline">
          <ArrowLeft class="w-4 h-4 mr-2" />
          {{ t('common.back') }}
        </Button>
        <Button @click="handleAnnotate" :disabled="!canAnnotate">
          <FileType class="w-4 h-4 mr-2" />
          {{ t('tools.annotate.addAnnotation') }}
        </Button>
      </div>
    </Card>

    <!-- Step 3: Processing -->
    <Card v-if="step === 3" class="mb-6">
      <template #header>
        <h2 class="text-xl font-semibold">{{ t('tools.annotate.step3') }}</h2>
      </template>

      <div class="text-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600 mb-2">{{ t('tools.annotate.processing') }}</p>
        <ProgressBar :progress="progress" class="mt-4" />
      </div>
    </Card>

    <!-- Step 4: Success -->
    <Card v-if="step === 4" class="mb-6">
      <template #header>
        <h2 class="text-xl font-semibold text-green-600">
          <CheckCircle class="w-6 h-6 inline mr-2" />
          {{ t('tools.annotate.success') }}
        </h2>
      </template>

      <div class="text-center py-8">
        <CheckCircle class="w-16 h-16 text-green-500 mx-auto mb-4" />
        <p class="text-lg text-gray-700 mb-2">{{ t('tools.annotate.successMessage') }}</p>
        <p class="text-sm text-gray-500 mb-6">
          {{ annotationType === 'text' ? t('tools.annotate.textAdded') : t('tools.annotate.highlightAdded') }}
        </p>

        <div class="flex gap-4 justify-center">
          <Button @click="handleDownload">
            <Download class="w-4 h-4 mr-2" />
            {{ t('common.download') }}
          </Button>
          <Button @click="handleReset" variant="outline">
            <RotateCcw class="w-4 h-4 mr-2" />
            {{ t('common.annotateAnother') }}
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
  FileType,
  CheckCircle,
  Download,
  RotateCcw,
  AlertCircle,
  MessageSquare,
  Highlighter
} from 'lucide-vue-next'

const { t } = useI18n()
// State
const step = ref(1)
const uploadedFile = ref<File | null>(null)
const annotationType = ref<'text' | 'highlight'>('text')
const progress = ref(0)
const error = ref('')
const resultJobId = ref('')

// Text annotation config
const textAnnotation = ref({
  text: '',
  page: 1,
  x: 100,
  y: 100,
  color: '#FF0000'
})

// Highlight annotation config
const highlightAnnotation = ref({
  page: 1,
  x1: 100,
  y1: 100,
  x2: 300,
  y2: 120,
  color: '#FFFF00'
})

// Color options
const textColors = [
  { name: 'Red', value: '#FF0000' },
  { name: 'Blue', value: '#0000FF' },
  { name: 'Green', value: '#00FF00' },
  { name: 'Black', value: '#000000' }
]

const highlightColors = [
  { name: 'Yellow', value: '#FFFF00' },
  { name: 'Green', value: '#00FF00' },
  { name: 'Blue', value: '#00FFFF' },
  { name: 'Pink', value: '#FF00FF' }
]

// Computed
const canAnnotate = computed(() => {
  if (annotationType.value === 'text') {
    return textAnnotation.value.text.trim() !== '' && textAnnotation.value.page >= 1
  } else {
    return highlightAnnotation.value.page >= 1
  }
})

// Handlers
const handleFileUpload = async (files: File[]) => {
  if (files.length === 0) return

  uploadedFile.value = files[0]
  error.value = ''
  step.value = 2
}

const handleRemoveFile = () => {
  uploadedFile.value = null
  step.value = 1
}

const handleAnnotate = async () => {
  if (!uploadedFile.value || !canAnnotate.value) return

  step.value = 3
  progress.value = 0
  error.value = ''

  try {
    // Simulate progress
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += 10
      }
    }, 300)

    let result
    if (annotationType.value === 'text') {
      result = await advancedAPI.annotateText(
        uploadedFile.value,
        textAnnotation.value.text,
        textAnnotation.value.page,
        textAnnotation.value.x,
        textAnnotation.value.y,
        textAnnotation.value.color
      )
    } else {
      result = await advancedAPI.annotateHighlight(
        uploadedFile.value,
        highlightAnnotation.value.page,
        highlightAnnotation.value.x1,
        highlightAnnotation.value.y1,
        highlightAnnotation.value.x2,
        highlightAnnotation.value.y2,
        highlightAnnotation.value.color
      )
    }

    clearInterval(progressInterval)
    progress.value = 100

    resultJobId.value = result.job_id
    step.value = 4
  } catch (err: any) {
    error.value = err.response?.data?.detail || t('tools.annotate.annotateError')
    step.value = 2
  }
}

const handleDownload = async () => {
  if (!resultJobId.value) return

  try {
    await advancedAPI.downloadResult(resultJobId.value, 'annotated.pdf')
  } catch (err: any) {
    error.value = t('common.downloadError')
  }
}

const handleReset = () => {
  uploadedFile.value = null
  resultJobId.value = ''
  progress.value = 0
  error.value = ''
  annotationType.value = 'text'
  textAnnotation.value = {
    text: '',
    page: 1,
    x: 100,
    y: 100,
    color: '#FF0000'
  }
  highlightAnnotation.value = {
    page: 1,
    x1: 100,
    y1: 100,
    x2: 300,
    y2: 120,
    color: '#FFFF00'
  }
  step.value = 1
}
</script>
