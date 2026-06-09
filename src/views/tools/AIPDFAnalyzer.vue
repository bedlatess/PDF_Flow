<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 py-12 px-4">
    <div class="container mx-auto max-w-4xl">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-slate-900 dark:text-white mb-2">
          🤖 {{ t('ai.title') }}
        </h1>
        <p class="text-slate-600 dark:text-slate-400">
          {{ t('ai.subtitle') }}
        </p>

        <!-- Pro Badge -->
        <div class="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-medium">
          <Sparkles class="w-4 h-4" />
          {{ t('ai.proBadge') }}
        </div>
      </div>

      <!-- File Upload -->
      <Card class="mb-6">
        <DragDropZone
          :accept="'.pdf'"
          :maxSize="userStore.maxFileSize"
          @files-selected="handleFileSelected"
          @error="handleUploadError"
        >
          <template #icon>
            <FileText class="w-16 h-16 text-purple-500" />
          </template>
          <template #text>
            {{ t('ai.dropPDF') }}
          </template>
        </DragDropZone>

        <!-- Selected File -->
        <div v-if="selectedFile" class="mt-4 flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div class="flex items-center gap-3">
            <FileText class="w-8 h-8 text-purple-600" />
            <div>
              <p class="font-medium text-slate-900 dark:text-white">{{ selectedFile.name }}</p>
              <p class="text-sm text-slate-600 dark:text-slate-400">
                {{ formatFileSize(selectedFile.size) }}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" @click="clearFile">
            <X class="w-4 h-4" />
          </Button>
        </div>
      </Card>

      <!-- AI Operations Tabs -->
      <Card v-if="selectedFile">
        <div class="border-b border-slate-200 dark:border-slate-700">
          <nav class="flex space-x-1 px-6" aria-label="Tabs">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'px-4 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              ]"
            >
              <component :is="tab.icon" class="w-4 h-4" />
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <div class="p-6">
          <!-- Summarize Tab -->
          <div v-if="activeTab === 'summarize'">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {{ t('ai.summarize.title') }}
            </h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {{ t('ai.summarize.description') }}
            </p>

            <div class="mb-4">
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {{ t('ai.summarize.length') }}
              </label>
              <select
                v-model="summaryLength"
                class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
              >
                <option value="short">{{ t('ai.summarize.short') }}</option>
                <option value="medium">{{ t('ai.summarize.medium') }}</option>
                <option value="long">{{ t('ai.summarize.long') }}</option>
              </select>
            </div>

            <Button @click="summarizePDF" :disabled="processing" class="w-full">
              <Sparkles v-if="!processing" class="w-4 h-4 mr-2" />
              <Loader2 v-else class="w-4 h-4 mr-2 animate-spin" />
              {{ processing ? t('common.processing') : t('ai.summarize.generate') }}
            </Button>

            <!-- Summary Result -->
            <div v-if="summaryResult" class="mt-6 space-y-4">
              <div class="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
                <h4 class="font-semibold text-slate-900 dark:text-white mb-2">
                  {{ t('ai.summarize.summary') }}
                </h4>
                <p class="text-slate-700 dark:text-slate-300">
                  {{ summaryResult.summary }}
                </p>
              </div>

              <div v-if="summaryResult.key_points.length > 0">
                <h4 class="font-semibold text-slate-900 dark:text-white mb-2">
                  {{ t('ai.summarize.keyPoints') }}
                </h4>
                <ul class="space-y-2">
                  <li
                    v-for="(point, index) in summaryResult.key_points"
                    :key="index"
                    class="flex items-start gap-2"
                  >
                    <span class="text-purple-600 dark:text-purple-400">•</span>
                    <span class="text-slate-700 dark:text-slate-300">{{ point }}</span>
                  </li>
                </ul>
              </div>

              <div v-if="summaryResult.topics.length > 0" class="flex flex-wrap gap-2">
                <span
                  v-for="topic in summaryResult.topics"
                  :key="topic"
                  class="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                >
                  {{ topic }}
                </span>
              </div>
            </div>
          </div>

          <!-- Q&A Tab -->
          <div v-else-if="activeTab === 'ask'">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {{ t('ai.ask.title') }}
            </h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {{ t('ai.ask.description') }}
            </p>

            <div class="mb-4">
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {{ t('ai.ask.question') }}
              </label>
              <textarea
                v-model="question"
                rows="3"
                class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                :placeholder="t('ai.ask.placeholder')"
              />
            </div>

            <Button @click="askQuestion" :disabled="processing || !question" class="w-full">
              <MessageCircle v-if="!processing" class="w-4 h-4 mr-2" />
              <Loader2 v-else class="w-4 h-4 mr-2 animate-spin" />
              {{ processing ? t('common.processing') : t('ai.ask.submit') }}
            </Button>

            <!-- Q&A Result -->
            <div v-if="qaResult" class="mt-6 space-y-4">
              <div class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-semibold text-slate-900 dark:text-white">
                    {{ t('ai.ask.answer') }}
                  </h4>
                  <span
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      qaResult.confidence === 'high'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : qaResult.confidence === 'medium'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    ]"
                  >
                    {{ qaResult.confidence }} {{ t('ai.ask.confidence') }}
                  </span>
                </div>
                <p class="text-slate-700 dark:text-slate-300">
                  {{ qaResult.answer }}
                </p>
              </div>

              <div v-if="qaResult.relevant_excerpts.length > 0">
                <h4 class="font-semibold text-slate-900 dark:text-white mb-2">
                  {{ t('ai.ask.excerpts') }}
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="(excerpt, index) in qaResult.relevant_excerpts"
                    :key="index"
                    class="bg-slate-50 dark:bg-slate-800 rounded p-3 text-sm text-slate-600 dark:text-slate-400 italic"
                  >
                    "{{ excerpt }}"
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Extract Tab -->
          <div v-else-if="activeTab === 'extract'">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {{ t('ai.extract.title') }}
            </h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {{ t('ai.extract.description') }}
            </p>

            <div class="mb-4">
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {{ t('ai.extract.type') }}
              </label>
              <select
                v-model="extractType"
                class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
              >
                <option value="general">{{ t('ai.extract.general') }}</option>
                <option value="invoice">{{ t('ai.extract.invoice') }}</option>
                <option value="resume">{{ t('ai.extract.resume') }}</option>
                <option value="contract">{{ t('ai.extract.contract') }}</option>
              </select>
            </div>

            <Button @click="extractData" :disabled="processing" class="w-full">
              <Database v-if="!processing" class="w-4 h-4 mr-2" />
              <Loader2 v-else class="w-4 h-4 mr-2 animate-spin" />
              {{ processing ? t('common.processing') : t('ai.extract.extract') }}
            </Button>

            <!-- Extract Result -->
            <div v-if="extractResult" class="mt-6">
              <div class="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <h4 class="font-semibold text-slate-900 dark:text-white mb-3">
                  {{ t('ai.extract.extractedData') }}
                </h4>
                <pre class="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-auto max-h-96">{{ JSON.stringify(extractResult.extracted_data, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- Error Display -->
      <div v-if="error" class="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <AlertCircle class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <p class="font-semibold text-red-900 dark:text-red-300">{{ t('common.error') }}</p>
            <p class="text-sm text-red-800 dark:text-red-400 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { aiAPI } from '@/services/api'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import {
  FileText, X, Sparkles, Loader2, MessageCircle,
  Database, AlertCircle, BookOpen, HelpCircle, FileJson
} from 'lucide-vue-next'

const { t } = useI18n()
const userStore = useUserStore()

const selectedFile = ref<File | null>(null)
const processing = ref(false)
const error = ref('')
const activeTab = ref('summarize')

// Summarize
const summaryLength = ref('medium')
const summaryResult = ref<any>(null)

// Q&A
const question = ref('')
const qaResult = ref<any>(null)

// Extract
const extractType = ref('general')
const extractResult = ref<any>(null)

const tabs = computed(() => [
  { id: 'summarize', label: t('ai.tabs.summarize'), icon: BookOpen },
  { id: 'ask', label: t('ai.tabs.ask'), icon: HelpCircle },
  { id: 'extract', label: t('ai.tabs.extract'), icon: FileJson }
])

const handleFileSelected = (files: File[]) => {
  if (files.length > 0) {
    selectedFile.value = files[0]
    error.value = ''
    // Clear previous results
    summaryResult.value = null
    qaResult.value = null
    extractResult.value = null
  }
}

const handleUploadError = (err: string) => {
  error.value = err
}

const clearFile = () => {
  selectedFile.value = null
  summaryResult.value = null
  qaResult.value = null
  extractResult.value = null
  error.value = ''
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const summarizePDF = async () => {
  if (!selectedFile.value) return

  try {
    processing.value = true
    error.value = ''
    summaryResult.value = null

    const result = await aiAPI.summarize(selectedFile.value, summaryLength.value)
    summaryResult.value = result
  } catch (err: any) {
    error.value = err.response?.data?.detail || t('ai.errors.summarizeFailed')
  } finally {
    processing.value = false
  }
}

const askQuestion = async () => {
  if (!selectedFile.value || !question.value) return

  try {
    processing.value = true
    error.value = ''
    qaResult.value = null

    const result = await aiAPI.ask(selectedFile.value, question.value)
    qaResult.value = result
  } catch (err: any) {
    error.value = err.response?.data?.detail || t('ai.errors.askFailed')
  } finally {
    processing.value = false
  }
}

const extractData = async () => {
  if (!selectedFile.value) return

  try {
    processing.value = true
    error.value = ''
    extractResult.value = null

    const result = await aiAPI.extract(selectedFile.value, extractType.value)
    extractResult.value = result
  } catch (err: any) {
    error.value = err.response?.data?.detail || t('ai.errors.extractFailed')
  } finally {
    processing.value = false
  }
}
</script>
