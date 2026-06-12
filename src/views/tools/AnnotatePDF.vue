<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Download,
  FileText,
  FileType,
  Highlighter,
  LockKeyhole,
  MessageSquare,
  RotateCcw,
} from 'lucide-vue-next'
import { advancedAPI } from '@/services/api'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import DiagnosticAlert from '@/components/common/DiagnosticAlert.vue'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import ToolPageShell from '@/components/tools/ToolPageShell.vue'
import ToolNoticeBar from '@/components/tools/ToolNoticeBar.vue'
import ToolAccessPanel from '@/components/tools/ToolAccessPanel.vue'
import { useUserStore } from '@/stores/user'
import { formatUserFacingError, type FormattedUserError } from '@/utils/error-messages'
import { redirectForFeatureAccess } from '@/utils/feature-access'
import { memoryManager } from '@/utils/memory-manager'

const { t, tm } = useI18n()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const step = ref(1)
const uploadedFile = ref<File | null>(null)
const annotationType = ref<'text' | 'highlight'>('text')
const progress = ref(0)
const errorState = ref<FormattedUserError | null>(null)
const resultUrl = ref('')
type ToolPageCopy = Record<string, any>

const copy = computed<ToolPageCopy>(() => tm('tools.annotate') as ToolPageCopy)
const stepText = (value: number) => t('tools.annotate.stepLabel', { step: value })

const textAnnotation = ref({
  text: '',
  page: 1,
  x: 100,
  y: 100,
  color: '#FF0000',
})

const highlightAnnotation = ref({
  page: 1,
  x1: 100,
  y1: 100,
  x2: 300,
  y2: 120,
  color: '#FFFF00',
})

const textColors = computed(() => copy.value.textColors || [])
const highlightColors = computed(() => copy.value.highlightColors || [])
const canUseTool = computed(() => userStore.isAuthenticated && userStore.canUseCloudFeatures)

const primaryActionLabel = computed(() => {
  if (!userStore.isAuthenticated) {
    return t('tools.annotate.useAfterLogin')
  }

  if (!userStore.canUseCloudFeatures) {
    return t('tools.annotate.upgradeAfterLogin')
  }

  return t('tools.annotate.addAnnotation')
})

const canAnnotate = computed(() => {
  if (annotationType.value === 'text') {
    return textAnnotation.value.text.trim() !== '' && textAnnotation.value.page >= 1
  }

  return highlightAnnotation.value.page >= 1
})

const ensureAccess = () => redirectForFeatureAccess({
  router,
  route,
  isAuthenticated: userStore.isAuthenticated,
  canUseCloudFeatures: userStore.canUseCloudFeatures,
  requiresPro: true,
  pricingFeature: 'annotate',
})

const handleFileUpload = (files: File[]) => {
  if (files.length === 0) {
    return
  }

  uploadedFile.value = files[0]
  errorState.value = null
  step.value = 2
}

const handleRemoveFile = () => {
  uploadedFile.value = null
  errorState.value = null
  step.value = 1
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
}

const handleAnnotate = async () => {
  if (!uploadedFile.value || !canAnnotate.value) {
    return
  }

  if (!ensureAccess()) {
    return
  }

  step.value = 3
  progress.value = 0
  errorState.value = null

  let progressInterval: ReturnType<typeof setInterval> | null = null

  try {
    progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += 10
      }
    }, 300)

    const blob = annotationType.value === 'text'
      ? await advancedAPI.annotateText(
        uploadedFile.value,
        textAnnotation.value.text,
        textAnnotation.value.page,
        textAnnotation.value.x,
        textAnnotation.value.y,
        textAnnotation.value.color,
      )
      : await advancedAPI.annotateHighlight(
        uploadedFile.value,
        highlightAnnotation.value.page,
        highlightAnnotation.value.x1,
        highlightAnnotation.value.y1,
        highlightAnnotation.value.x2,
        highlightAnnotation.value.y2,
        highlightAnnotation.value.color,
      )

    progress.value = 100
    if (resultUrl.value) {
      memoryManager.revokeObjectURL(resultUrl.value)
    }
    resultUrl.value = memoryManager.createTemporaryURL(blob)
    step.value = 4
  } catch (error) {
    errorState.value = formatUserFacingError(error, {
      area: 'ANNOTATE',
      fallbackMessage: t('tools.annotate.annotateError'),
    })
    step.value = 2
  } finally {
    if (progressInterval) {
      clearInterval(progressInterval)
    }
  }
}

const handleDownload = async () => {
  if (!resultUrl.value) {
    return
  }

  try {
    const link = document.createElement('a')
    link.href = resultUrl.value
    link.download = 'annotated.pdf'
    link.click()
  } catch (error) {
    errorState.value = formatUserFacingError(error, {
      area: 'ANNOTATE',
      fallbackMessage: t('common.downloadError'),
    })
  }
}

const handleReset = () => {
  uploadedFile.value = null
  progress.value = 0
  errorState.value = null
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
  annotationType.value = 'text'
  textAnnotation.value = {
    text: '',
    page: 1,
    x: 100,
    y: 100,
    color: '#FF0000',
  }
  highlightAnnotation.value = {
    page: 1,
    x1: 100,
    y1: 100,
    x2: 300,
    y2: 120,
    color: '#FFFF00',
  }
  step.value = 1
}

onUnmounted(() => {
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
  }
})
</script>

<template>
  <ToolPageShell
      :title="t('tools.annotate.title')"
      :subtitle="t('tools.annotate.description')"
      :badge="t('tools.annotate.proOnly')"
      pro
      accent="purple"
    width="md"
  >

      <template #badgeIcon>
        <Crown class="h-4 w-4" />
      </template>

      <template #headerExtra>
        <p class="mx-auto max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {{ t('tools.annotate.pageExtra') }}
        </p>
      </template>
      <ToolNoticeBar variant="purple">
        <template #icon>
          <Crown class="h-5 w-5" />
        </template>
        {{ t('tools.annotate.notice') }}
      </ToolNoticeBar>

      <DiagnosticAlert
        v-if="errorState"
        class="mt-6"
        :title="errorState.title"
        :message="errorState.message"
        :diagnostic-code="errorState.diagnosticCode"
        :support-hint="errorState.supportHint"
      />

      <ToolAccessPanel
        v-if="step === 1 && !canUseTool"
        class="mt-6"
        accent="purple"
        :label="t('tools.annotate.accessLabel')"
        :title="userStore.isAuthenticated ? t('tools.annotate.accessMemberTitle') : t('tools.annotate.accessGuestTitle')"
        :description="userStore.isAuthenticated ? t('tools.annotate.accessMemberDescription') : t('tools.annotate.accessGuestDescription')"
        :action-label="userStore.isAuthenticated ? t('tools.annotate.goToUpgrade') : t('tools.annotate.goToSignIn')"
        :steps="[
          t('tools.annotate.accessStep1'),
          t('tools.annotate.accessStep2'),
          t('tools.annotate.accessStep3'),
        ]"
        @action="ensureAccess()"
      >
        <template #actionIcon>
          <LockKeyhole class="mr-2 h-4 w-4" />
        </template>
      </ToolAccessPanel>

      <div class="mt-6 space-y-6">
        <div
          v-if="step === 1 && canUseTool"
          class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
        >
          <Card class="rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-6">
              <div class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-purple-500">
                  {{ t('tools.annotate.uploadLabel') }}
                </p>
                <h2 class="text-2xl font-semibold text-slate-900 dark:text-white">
                  {{ t('tools.annotate.uploadTitle') }}
                </h2>
                <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ t('tools.annotate.uploadDescription') }}
                </p>
              </div>

              <DragDropZone
                accept="application/pdf,.pdf"
                :multiple="false"
                :max-files="1"
                @files-selected="handleFileUpload"
              >
                <template #icon>
                  <FileText class="h-12 w-12" />
                </template>
                <template #title>
                  {{ t('tools.annotate.dropTitle') }}
                </template>
                <template #subtitle>
                  {{ t('tools.annotate.dropSubtitle') }}
                </template>
              </DragDropZone>
            </div>
          </Card>

          <Card class="rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-6">
              <div>
                <h3 class="text-xl font-semibold text-slate-900 dark:text-white">
                  {{ t('tools.annotate.workspaceTitle') }}
                </h3>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ t('tools.annotate.workspaceDescription') }}
                </p>
              </div>

              <div class="rounded-md border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/50">
                <p class="text-sm font-semibold text-slate-900 dark:text-white">
                  {{ t('tools.annotate.flowTitle') }}
                </p>
                <div class="mt-4 space-y-3">
                  <div class="flex items-start gap-3 rounded-md bg-white px-4 py-4 dark:bg-slate-900">
                    <span class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-sm font-semibold text-white">1</span>
                    <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {{ t('tools.annotate.flowStep1') }}
                    </p>
                  </div>
                  <div class="flex items-start gap-3 rounded-md bg-white px-4 py-4 dark:bg-slate-900">
                    <span class="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500 text-sm font-semibold text-white">2</span>
                    <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {{ t('tools.annotate.flowStep2') }}
                    </p>
                  </div>
                  <div class="flex items-start gap-3 rounded-md bg-white px-4 py-4 dark:bg-slate-900">
                    <span class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">3</span>
                    <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {{ t('tools.annotate.flowStep3') }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card
          v-if="step === 2"
          class="rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none"
        >
          <div class="space-y-6">
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-purple-500">
                {{ stepText(2) }}
              </p>
              <h2 class="text-2xl font-semibold text-slate-900 dark:text-white">
                {{ t('tools.annotate.configureTitle') }}
              </h2>
              <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {{ t('tools.annotate.configureDescription') }}
              </p>
            </div>

            <FilePreview
              v-if="uploadedFile"
              :file="uploadedFile"
              @remove="handleRemoveFile"
            />

            <div class="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
              <div class="space-y-6">
                <div class="rounded-md border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/50">
                  <label class="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {{ t('tools.annotate.modeLabel') }}
                  </label>

                  <div class="mt-4 space-y-3">
                    <button
                      :class="[
                        'w-full rounded-md border px-4 py-4 text-left transition-all',
                        annotationType === 'text'
                          ? 'border-purple-300 bg-purple-50 shadow-sm dark:border-purple-700 dark:bg-purple-950/30'
                          : 'border-slate-200 bg-white hover:border-purple-200 dark:border-slate-700 dark:bg-slate-900',
                      ]"
                      @click="annotationType = 'text'"
                    >
                      <div class="flex items-start gap-3">
                        <MessageSquare :class="['mt-0.5 h-5 w-5', annotationType === 'text' ? 'text-purple-500' : 'text-slate-400']" />
                        <div>
                          <p class="font-semibold text-slate-900 dark:text-white">
                            {{ t('tools.annotate.types.text') }}
                          </p>
                          <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {{ t('tools.annotate.types.textDesc') }}
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      :class="[
                        'w-full rounded-md border px-4 py-4 text-left transition-all',
                        annotationType === 'highlight'
                          ? 'border-amber-300 bg-amber-50 shadow-sm dark:border-amber-700 dark:bg-amber-950/20'
                          : 'border-slate-200 bg-white hover:border-amber-200 dark:border-slate-700 dark:bg-slate-900',
                      ]"
                      @click="annotationType = 'highlight'"
                    >
                      <div class="flex items-start gap-3">
                        <Highlighter :class="['mt-0.5 h-5 w-5', annotationType === 'highlight' ? 'text-amber-500' : 'text-slate-400']" />
                        <div>
                          <p class="font-semibold text-slate-900 dark:text-white">
                            {{ t('tools.annotate.types.highlight') }}
                          </p>
                          <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {{ t('tools.annotate.types.highlightDesc') }}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div class="rounded-md border border-slate-200 bg-slate-50/70 p-5 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                  <p class="font-semibold text-slate-900 dark:text-white">
                    {{ t('tools.annotate.coordinateHintTitle') }}
                  </p>
                  <p class="mt-2">
                    {{ t('tools.annotate.coordinateHintDescription') }}
                  </p>
                </div>
              </div>

              <div class="space-y-6">
                <div
                  v-if="annotationType === 'text'"
                  class="rounded-md border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <div class="space-y-4">
                    <div>
                      <label
                        for="annotate-text-content"
                        class="mb-2 block text-sm font-semibold text-slate-900 dark:text-white"
                      >
                        {{ t('tools.annotate.text.content') }}
                      </label>
                      <textarea
                        id="annotate-text-content"
                        v-model="textAnnotation.text"
                        rows="4"
                        :placeholder="t('tools.annotate.text.placeholder')"
                        class="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-purple-400 dark:focus:ring-purple-500/20"
                      />
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          for="annotate-text-page"
                          class="mb-2 block text-sm font-semibold text-slate-900 dark:text-white"
                        >
                          {{ t('tools.annotate.text.page') }}
                        </label>
                        <input
                          id="annotate-text-page"
                          v-model.number="textAnnotation.page"
                          type="number"
                          min="1"
                          :placeholder="t('tools.annotate.text.pagePlaceholder')"
                          class="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-purple-400 dark:focus:ring-purple-500/20"
                        >
                      </div>

                      <div>
                        <label class="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
                          {{ t('tools.annotate.text.color') }}
                        </label>
                        <div class="flex flex-wrap gap-2">
                          <button
                            v-for="color in textColors"
                            :key="color.value"
                            :class="[
                              'h-10 w-10 rounded-xl border-2 transition',
                              textAnnotation.color === color.value
                                ? 'scale-105 border-slate-900 dark:border-white'
                                : 'border-slate-200 dark:border-slate-700',
                            ]"
                            :style="{ backgroundColor: color.value }"
                            :title="color.name"
                            @click="textAnnotation.color = color.value"
                          />
                        </div>
                      </div>
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          for="annotate-text-x"
                          class="mb-2 block text-sm font-semibold text-slate-900 dark:text-white"
                        >
                          {{ t('tools.annotate.text.x') }}
                        </label>
                        <input
                          id="annotate-text-x"
                          v-model.number="textAnnotation.x"
                          type="number"
                          min="0"
                          class="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-purple-400 dark:focus:ring-purple-500/20"
                        >
                      </div>

                      <div>
                        <label
                          for="annotate-text-y"
                          class="mb-2 block text-sm font-semibold text-slate-900 dark:text-white"
                        >
                          {{ t('tools.annotate.text.y') }}
                        </label>
                        <input
                          id="annotate-text-y"
                          v-model.number="textAnnotation.y"
                          type="number"
                          min="0"
                          class="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-purple-400 dark:focus:ring-purple-500/20"
                        >
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-else
                  class="rounded-md border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <div class="space-y-4">
                    <div class="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          for="annotate-highlight-page"
                          class="mb-2 block text-sm font-semibold text-slate-900 dark:text-white"
                        >
                          {{ t('tools.annotate.highlight.page') }}
                        </label>
                        <input
                          id="annotate-highlight-page"
                          v-model.number="highlightAnnotation.page"
                          type="number"
                          min="1"
                          :placeholder="t('tools.annotate.highlight.pagePlaceholder')"
                          class="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
                        >
                      </div>

                      <div>
                        <label class="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
                          {{ t('tools.annotate.highlight.color') }}
                        </label>
                        <div class="flex flex-wrap gap-2">
                          <button
                            v-for="color in highlightColors"
                            :key="color.value"
                            :class="[
                              'h-10 w-10 rounded-xl border-2 transition',
                              highlightAnnotation.color === color.value
                                ? 'scale-105 border-slate-900 dark:border-white'
                                : 'border-slate-200 dark:border-slate-700',
                            ]"
                            :style="{ backgroundColor: color.value }"
                            :title="color.name"
                            @click="highlightAnnotation.color = color.value"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label
                        id="annotate-highlight-coordinates-label"
                        class="mb-2 block text-sm font-semibold text-slate-900 dark:text-white"
                      >
                        {{ t('tools.annotate.highlight.coordinates') }}
                      </label>
                      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <input
                          v-model.number="highlightAnnotation.x1"
                          aria-labelledby="annotate-highlight-coordinates-label"
                          type="number"
                          placeholder="x1"
                          class="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
                        >
                        <input
                          v-model.number="highlightAnnotation.y1"
                          aria-labelledby="annotate-highlight-coordinates-label"
                          type="number"
                          placeholder="y1"
                          class="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
                        >
                        <input
                          v-model.number="highlightAnnotation.x2"
                          aria-labelledby="annotate-highlight-coordinates-label"
                          type="number"
                          placeholder="x2"
                          class="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
                        >
                        <input
                          v-model.number="highlightAnnotation.y2"
                          aria-labelledby="annotate-highlight-coordinates-label"
                          type="number"
                          placeholder="y2"
                          class="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
                        >
                      </div>
                      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {{ t('tools.annotate.highlight.coordsHelp') }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    size="lg"
                    @click="step = 1"
                  >
                    <ArrowLeft class="mr-2 h-4 w-4" />
                    {{ t('common.back') }}
                  </Button>
                  <Button
                    size="lg"
                    :disabled="!canAnnotate"
                    full-width
                    @click="handleAnnotate"
                  >
                    <FileType class="mr-2 h-4 w-4" />
                    {{ primaryActionLabel }}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card
          v-if="step === 3"
          class="rounded-lg border border-white/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none"
        >
          <div class="space-y-6 py-6 text-center">
            <div class="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-purple-100 border-t-purple-500 dark:border-purple-950 dark:border-t-purple-400" />
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-purple-500">
                {{ stepText(3) }}
              </p>
              <h2 class="text-2xl font-semibold text-slate-900 dark:text-white">
                {{ t('tools.annotate.stepGenerating') }}
              </h2>
              <p class="text-sm text-slate-600 dark:text-slate-300">
                {{ t('tools.annotate.processing') }}
              </p>
            </div>

            <ProgressBar
              :progress="progress"
              :label="t('tools.annotate.preparingResult')"
              variant="primary"
              size="md"
            />
          </div>
        </Card>

        <Card
          v-if="step === 4"
          class="rounded-lg border border-emerald-200 bg-emerald-50/90 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:shadow-none"
        >
          <div class="space-y-6 py-4 text-center">
            <CheckCircle2 class="mx-auto h-16 w-16 text-emerald-500" />
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-500">
                {{ t('tools.annotate.ready') }}
              </p>
              <h2 class="text-2xl font-semibold text-slate-900 dark:text-white">
                {{ t('tools.annotate.success') }}
              </h2>
              <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {{ t('tools.annotate.successMessage') }}
              </p>
              <p class="text-sm font-medium text-emerald-700 dark:text-emerald-200">
                {{ annotationType === 'text' ? t('tools.annotate.textAdded') : t('tools.annotate.highlightAdded') }}
              </p>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                @click="handleDownload"
              >
                <Download class="mr-2 h-4 w-4" />
                {{ t('common.download') }}
              </Button>
              <Button
                variant="outline"
                size="lg"
                @click="handleReset"
              >
                <RotateCcw class="mr-2 h-4 w-4" />
                {{ t('common.annotateAnother') }}
              </Button>
            </div>
          </div>
        </Card>
      </div>
  </ToolPageShell>
</template>
