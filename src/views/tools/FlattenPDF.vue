<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BadgeCheck,
  Download,
  FileCheck2,
  Layers3,
  ShieldAlert,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import ToolHeader from '@/components/tools/ToolHeader.vue'
import ToolNoticeBar from '@/components/tools/ToolNoticeBar.vue'
import { flattenPDF } from '@/utils/pdf/flatten'
import { getPDFPageCount } from '@/utils/pdf/merge'
import { historyManager } from '@/utils/history-manager'
import { memoryManager } from '@/utils/memory-manager'

const { locale } = useI18n()

const selectedFile = ref<File | null>(null)
const pageCount = ref(0)
const fieldCount = ref<number | null>(null)
const isProcessing = ref(false)
const progress = ref(0)
const status = ref('')
const resultUrl = ref('')
const resultSize = ref(0)
const errorMessage = ref('')

const isZh = computed(() => locale.value.toLowerCase().startsWith('zh'))
const isEs = computed(() => locale.value.toLowerCase().startsWith('es'))

const copy = computed(() => {
  if (isZh.value) {
    return {
      title: '扁平化 PDF',
      subtitle: '把可填写表单内容固定到页面上，生成更适合提交、归档和分享的 PDF 副本。',
      badge: '本地工具',
      notice: '扁平化主要用于锁定表单外观，让字段不再继续编辑。它不是加密、不是权限保护，也不是安全脱敏；敏感内容请使用真正的脱敏工具。',
      uploadLabel: 'PDF 文件',
      uploadTitleIdle: '选择需要扁平化的 PDF',
      uploadTitleReady: '文件已准备好',
      uploadDescriptionIdle: '适合已经填写完成的表单、申请表、回执和确认文件。原文件不会被修改。',
      uploadDescriptionReady: '点击处理后会生成一个新副本，尽量把表单字段固化为普通页面内容。',
      dropTitle: '拖放 PDF 到这里',
      dropSubtitle: '或点击选择文件',
      action: '生成扁平化 PDF',
      processing: '正在固化表单字段...',
      done: '扁平化副本已生成',
      download: '下载扁平化 PDF',
      successTitle: '扁平化完成',
      successMessage: '新的 PDF 副本已准备好，可以下载检查表单内容是否固定。',
      resultLabel: '处理结果',
      waitingTitle: '等待处理',
      waitingBody: '上传 PDF 后开始扁平化。处理过程在浏览器本地完成。',
      fieldLabel: '可填写字段',
      pages: '页数',
      outputSize: '输出大小',
      noFieldsTitle: '没有检测到可填写表单字段',
      noFieldsBody: '这份 PDF 可能已经是普通页面内容。你仍然可以下载整理后的副本，但外观变化可能很小。',
      localTitle: '适合提交前锁定表单',
      localDesc: '填写完成后扁平化，可以减少对方再次修改表单字段的概率，也能提升不同阅读器打开时的稳定性。',
      step1: '上传已填写 PDF',
      step2: '固化表单外观',
      step3: '下载归档副本',
      errorLoad: '无法读取这份 PDF，请重新选择文件后再试。',
      errorFailed: '扁平化失败，请确认文件是标准 PDF 后再试。',
    }
  }

  if (isEs.value) {
    return {
      title: 'Aplanar PDF',
      subtitle: 'Convierte campos rellenables en contenido fijo para enviar, archivar o compartir con mas estabilidad.',
      badge: 'Herramienta local',
      notice: 'Aplanar bloquea la apariencia de formularios. No es cifrado, control de permisos ni redaccion segura.',
      uploadLabel: 'Archivo PDF',
      uploadTitleIdle: 'Elige el PDF para aplanar',
      uploadTitleReady: 'Archivo listo',
      uploadDescriptionIdle: 'Ideal para formularios completados, solicitudes y recibos.',
      uploadDescriptionReady: 'Se creara una copia nueva con campos de formulario fijados.',
      dropTitle: 'Arrastra tu PDF aqui',
      dropSubtitle: 'o haz clic para elegir un archivo',
      action: 'Crear PDF aplanado',
      processing: 'Fijando campos...',
      done: 'Copia aplanada lista',
      download: 'Descargar PDF aplanado',
      successTitle: 'PDF aplanado',
      successMessage: 'La nueva copia esta lista para revisar.',
      resultLabel: 'Resultado',
      waitingTitle: 'Esperando inicio',
      waitingBody: 'Sube un PDF y comienza. El proceso ocurre localmente.',
      fieldLabel: 'Campos rellenables',
      pages: 'Paginas',
      outputSize: 'Tamano de salida',
      noFieldsTitle: 'No se detectaron campos rellenables',
      noFieldsBody: 'Este PDF puede estar ya aplanado. Puedes descargar la copia, aunque el cambio visual puede ser pequeno.',
      localTitle: 'Bloquea formularios antes de enviar',
      localDesc: 'Aplanar reduce la posibilidad de que otros editen campos y mejora la estabilidad entre lectores PDF.',
      step1: 'Subir PDF rellenado',
      step2: 'Fijar apariencia',
      step3: 'Descargar copia',
      errorLoad: 'No se pudo leer este PDF. Elige el archivo de nuevo.',
      errorFailed: 'No se pudo aplanar el PDF. Confirma que sea un PDF estandar.',
    }
  }

  return {
    title: 'Flatten PDF',
    subtitle: 'Turn fillable form fields into fixed page content for submission, archiving, and sharing.',
    badge: 'Local tool',
    notice: 'Flattening locks form appearance. It is not encryption, permission control, or secure redaction. Use a true redaction workflow for sensitive content.',
    uploadLabel: 'PDF file',
    uploadTitleIdle: 'Choose the PDF to flatten',
    uploadTitleReady: 'File is ready',
    uploadDescriptionIdle: 'Best for completed forms, applications, receipts, and confirmation files. The original file is not modified.',
    uploadDescriptionReady: 'A new copy will be generated with form fields fixed into the page appearance.',
    dropTitle: 'Drop your PDF here',
    dropSubtitle: 'or click to choose a file',
    action: 'Create flattened PDF',
    processing: 'Flattening form fields...',
    done: 'Flattened copy is ready',
    download: 'Download flattened PDF',
    successTitle: 'Flatten complete',
    successMessage: 'Your new PDF copy is ready to review.',
    resultLabel: 'Result',
    waitingTitle: 'Waiting to start',
    waitingBody: 'Upload a PDF and start flattening. Processing happens locally in your browser.',
    fieldLabel: 'Fillable fields',
    pages: 'Pages',
    outputSize: 'Output size',
    noFieldsTitle: 'No fillable fields detected',
    noFieldsBody: 'This PDF may already be ordinary page content. You can still download the processed copy, but the visible change may be small.',
    localTitle: 'Lock form appearance before sending',
    localDesc: 'Flattening helps reduce accidental field edits and improves stability across different PDF readers.',
    step1: 'Upload completed PDF',
    step2: 'Fix field appearance',
    step3: 'Download archive copy',
    errorLoad: 'Could not read this PDF. Please choose the file again.',
    errorFailed: 'Failed to flatten the PDF. Please confirm this is a standard PDF.',
  }
})

const canFlatten = computed(() => !!selectedFile.value && !isProcessing.value)

const handleFilesSelected = async (files: File[]) => {
  try {
    clearResult()
    selectedFile.value = files[0]
    pageCount.value = await getPDFPageCount(files[0])
    fieldCount.value = null
    errorMessage.value = ''
  } catch {
    selectedFile.value = null
    pageCount.value = 0
    errorMessage.value = copy.value.errorLoad
  }
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const clearResult = () => {
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
  resultSize.value = 0
}

const removeFile = () => {
  selectedFile.value = null
  pageCount.value = 0
  fieldCount.value = null
  errorMessage.value = ''
  clearResult()
}

const flatten = async () => {
  if (!selectedFile.value) return

  isProcessing.value = true
  progress.value = 20
  status.value = copy.value.processing
  errorMessage.value = ''
  clearResult()

  try {
    progress.value = 65
    const result = await flattenPDF(selectedFile.value)
    fieldCount.value = result.fieldCount
    resultSize.value = result.blob.size
    progress.value = 100
    status.value = copy.value.done
    resultUrl.value = memoryManager.createTemporaryURL(result.blob)

    historyManager.addHistory({
      type: 'flatten',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: result.blob.size,
    })
  } catch {
    errorMessage.value = copy.value.errorFailed
  } finally {
    isProcessing.value = false
  }
}

const formatFileSize = (bytes: number) => {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

const downloadResult = () => {
  if (!resultUrl.value || !selectedFile.value) return
  const link = document.createElement('a')
  link.href = resultUrl.value
  link.download = selectedFile.value.name.replace(/\.pdf$/i, '') + '-flattened.pdf'
  link.click()
}

onUnmounted(clearResult)
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-stone-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-stone-950/20">
    <ToolHeader
      :title="copy.title"
      :subtitle="copy.subtitle"
      :badge="copy.badge"
      accent="blue"
    >
      <template #badgeIcon>
        <Layers3 class="h-4 w-4" />
      </template>
    </ToolHeader>

    <section class="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-6">
      <ToolNoticeBar variant="blue">
        <template #icon>
          <ShieldAlert class="h-5 w-5" />
        </template>
        {{ copy.notice }}
      </ToolNoticeBar>

      <div
        v-if="errorMessage"
        class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 shadow-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-100"
      >
        {{ errorMessage }}
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div class="space-y-6">
          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-6">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-300">
                  {{ copy.uploadLabel }}
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {{ selectedFile ? copy.uploadTitleReady : copy.uploadTitleIdle }}
                </h2>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ selectedFile ? copy.uploadDescriptionReady : copy.uploadDescriptionIdle }}
                </p>
              </div>

              <DragDropZone
                v-if="!selectedFile"
                accept="pdf"
                :multiple="false"
                :max-files="1"
                @files-selected="handleFilesSelected"
                @error="handleError"
              >
                <template #icon>
                  <Layers3 class="h-12 w-12" />
                </template>
                <template #title>
                  {{ copy.dropTitle }}
                </template>
                <template #subtitle>
                  {{ copy.dropSubtitle }}
                </template>
              </DragDropZone>

              <FilePreview
                v-else
                :file="selectedFile"
                @remove="removeFile"
              />
            </div>
          </Card>

          <Card class="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="relative">
              <div class="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-slate-300/25 blur-3xl dark:bg-slate-500/15" />
              <div class="relative space-y-5">
                <div>
                  <h3 class="text-xl font-semibold text-slate-900 dark:text-white">
                    {{ copy.localTitle }}
                  </h3>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {{ copy.localDesc }}
                  </p>
                </div>
                <div class="grid gap-3">
                  <div
                    v-for="(step, index) in [copy.step1, copy.step2, copy.step3]"
                    :key="step"
                    class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-950">
                      {{ index + 1 }}
                    </span>
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {{ step }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div class="space-y-6">
          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-300">
                    {{ copy.resultLabel }}
                  </p>
                  <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                    {{ resultUrl ? copy.successTitle : copy.waitingTitle }}
                  </h2>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {{ resultUrl ? copy.successMessage : copy.waitingBody }}
                  </p>
                </div>
                <Button
                  v-if="resultUrl"
                  variant="primary"
                  size="sm"
                  @click="downloadResult"
                >
                  <Download class="mr-2 h-4 w-4" />
                  {{ copy.download }}
                </Button>
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {{ copy.pages }}
                  </p>
                  <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {{ pageCount || '-' }}
                  </p>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {{ copy.fieldLabel }}
                  </p>
                  <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {{ fieldCount ?? '-' }}
                  </p>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {{ copy.outputSize }}
                  </p>
                  <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {{ formatFileSize(resultSize) }}
                  </p>
                </div>
              </div>

              <ProgressBar
                v-if="isProcessing || resultUrl"
                :progress="progress"
                :label="status"
                variant="primary"
                size="md"
              />

              <div
                v-if="fieldCount === 0 && resultUrl"
                class="rounded-[24px] border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10"
              >
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                  {{ copy.noFieldsTitle }}
                </h3>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.noFieldsBody }}
                </p>
              </div>

              <div class="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="primary"
                  size="lg"
                  :loading="isProcessing"
                  :disabled="!canFlatten"
                  full-width
                  @click="flatten"
                >
                  <FileCheck2 class="mr-2 h-4 w-4" />
                  {{ isProcessing ? copy.processing : copy.action }}
                </Button>
                <Button
                  v-if="resultUrl"
                  variant="outline"
                  size="lg"
                  full-width
                  @click="downloadResult"
                >
                  <Download class="mr-2 h-4 w-4" />
                  {{ copy.download }}
                </Button>
              </div>
            </div>
          </Card>

          <Card
            v-if="resultUrl"
            class="rounded-[28px] border border-emerald-200 bg-emerald-50/90 shadow-xl shadow-emerald-100/70 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:shadow-none"
          >
            <div class="flex items-start gap-4">
              <BadgeCheck class="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
              <div>
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                  {{ copy.successTitle }}
                </h3>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.successMessage }}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  </div>
</template>
