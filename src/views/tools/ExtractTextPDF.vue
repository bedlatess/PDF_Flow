<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileText,
  ScanText,
  Sparkles,
  TextCursorInput,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import ToolHeader from '@/components/tools/ToolHeader.vue'
import ToolNoticeBar from '@/components/tools/ToolNoticeBar.vue'
import { formatFileSize } from '@/utils/file-validator'
import { historyManager } from '@/utils/history-manager'
import { extractTextFromPDF, type ExtractedTextResult } from '@/utils/pdf/textExtraction'

const { locale } = useI18n()

const selectedFile = ref<File | null>(null)
const result = ref<ExtractedTextResult | null>(null)
const isProcessing = ref(false)
const progress = ref(0)
const status = ref('')
const errorMessage = ref('')
const copied = ref(false)

const isZh = computed(() => locale.value.toLowerCase().startsWith('zh'))
const isEs = computed(() => locale.value.toLowerCase().startsWith('es'))

const copy = computed(() => {
  if (isZh.value) {
    return {
      title: '提取 PDF 文字',
      subtitle: '从带文本层的 PDF 中快速导出可复制文字，适合合同、报告、资料整理和 AI 分析前的内容准备。',
      badge: '本地工具',
      notice: '文件只在浏览器本地读取，不上传服务器。此功能提取 PDF 自带文本层；如果 PDF 是扫描件或图片文字，请使用 OCR 文字识别。',
      uploadLabel: 'PDF 文件',
      uploadTitleIdle: '选择需要提取文字的 PDF',
      uploadTitleReady: '文件已准备好',
      uploadDescriptionIdle: '适合可以选中文字、复制文字的 PDF。原文件不会被修改。',
      uploadDescriptionReady: '点击提取后会在页面展示文字，并可复制或下载 TXT 文件。',
      dropTitle: '拖放 PDF 到这里',
      dropSubtitle: '或点击选择文件',
      action: '提取文字',
      processing: '正在读取文字层...',
      ready: '文字提取完成',
      copied: '已复制',
      copyFailed: '复制失败，请手动选择文字复制。',
      copyText: '复制文字',
      download: '下载 TXT',
      remove: '移除',
      textPreview: '文字预览',
      emptyTitle: '没有读取到可用文字',
      emptyBody: '这通常表示 PDF 是扫描件、图片型页面，或文字被特殊编码。请改用 OCR 文字识别。',
      resultTitle: '提取结果',
      resultBody: '文字已经整理为按页分隔的 TXT 内容。你可以直接复制、下载，或继续用于后续整理。',
      pageCount: '页数',
      characters: '字符数',
      fileSize: '文件大小',
      localTitle: '本地完成，不留服务器副本',
      localBody: '普通文本型 PDF 通常比云端更快，因为不需要上传。扫描件和图片文字则交给 OCR 处理。',
      step1: '上传 PDF',
      step2: '读取文字层',
      step3: '复制或下载结果',
      errorFailed: '无法提取文字。请确认文件是标准 PDF，或尝试使用 OCR 文字识别。',
      pageLabel: (pageNumber: number) => `第 ${pageNumber} 页`,
    }
  }

  if (isEs.value) {
    return {
      title: 'Extraer texto de PDF',
      subtitle: 'Exporta texto copiable desde PDFs con capa de texto, ideal para informes, contratos y preparacion antes de IA.',
      badge: 'Herramienta local',
      notice: 'El archivo se lee localmente en el navegador y no se sube al servidor. Para PDFs escaneados o texto dentro de imagenes, usa OCR.',
      uploadLabel: 'Archivo PDF',
      uploadTitleIdle: 'Elige el PDF para extraer texto',
      uploadTitleReady: 'Archivo listo',
      uploadDescriptionIdle: 'Funciona mejor con PDFs donde puedes seleccionar y copiar texto.',
      uploadDescriptionReady: 'El texto se mostrara en la pagina y podras copiarlo o descargarlo como TXT.',
      dropTitle: 'Arrastra tu PDF aqui',
      dropSubtitle: 'o haz clic para elegir un archivo',
      action: 'Extraer texto',
      processing: 'Leyendo capa de texto...',
      ready: 'Texto extraido',
      copied: 'Copiado',
      copyFailed: 'No se pudo copiar. Selecciona el texto manualmente.',
      copyText: 'Copiar texto',
      download: 'Descargar TXT',
      remove: 'Quitar',
      textPreview: 'Vista previa del texto',
      emptyTitle: 'No se encontro texto util',
      emptyBody: 'Probablemente es un PDF escaneado, una imagen o texto con codificacion especial. Prueba OCR.',
      resultTitle: 'Resultado',
      resultBody: 'El texto se organiza por paginas y esta listo para copiar o descargar.',
      pageCount: 'Paginas',
      characters: 'Caracteres',
      fileSize: 'Tamano',
      localTitle: 'Local y sin copia en servidor',
      localBody: 'Los PDFs con texto suelen ser mas rapidos localmente porque no requieren subida. Usa OCR para documentos escaneados.',
      step1: 'Subir PDF',
      step2: 'Leer texto',
      step3: 'Copiar o descargar',
      errorFailed: 'No se pudo extraer el texto. Confirma que sea un PDF estandar o prueba OCR.',
      pageLabel: (pageNumber: number) => `Pagina ${pageNumber}`,
    }
  }

  return {
    title: 'Extract PDF Text',
    subtitle: 'Export copyable text from PDFs with a text layer, ready for reports, contracts, notes, or AI prep.',
    badge: 'Local tool',
    notice: 'The file is read locally in your browser and is not uploaded. This extracts the PDF text layer; for scanned PDFs or image text, use OCR.',
    uploadLabel: 'PDF file',
    uploadTitleIdle: 'Choose the PDF to extract text from',
    uploadTitleReady: 'File is ready',
    uploadDescriptionIdle: 'Best for PDFs where text can already be selected and copied.',
    uploadDescriptionReady: 'The extracted text will appear here and can be copied or downloaded as TXT.',
    dropTitle: 'Drop your PDF here',
    dropSubtitle: 'or click to choose a file',
    action: 'Extract text',
    processing: 'Reading text layer...',
    ready: 'Text extracted',
    copied: 'Copied',
    copyFailed: 'Copy failed. Please select the text manually.',
    copyText: 'Copy text',
    download: 'Download TXT',
    remove: 'Remove',
    textPreview: 'Text preview',
    emptyTitle: 'No usable text found',
    emptyBody: 'This usually means the PDF is scanned, image-based, or specially encoded. Try OCR text recognition instead.',
    resultTitle: 'Result',
    resultBody: 'Text is organized by page and ready to copy or download.',
    pageCount: 'Pages',
    characters: 'Characters',
    fileSize: 'File size',
    localTitle: 'Local, with no server copy',
    localBody: 'Text-based PDFs are usually faster locally because no upload is needed. Use OCR for scanned documents.',
    step1: 'Upload PDF',
    step2: 'Read text layer',
    step3: 'Copy or download',
    errorFailed: 'Text could not be extracted. Confirm this is a standard PDF or try OCR.',
    pageLabel: (pageNumber: number) => `Page ${pageNumber}`,
  }
})

const hasText = computed(() => !!result.value?.text.trim())
const canExtract = computed(() => !!selectedFile.value && !isProcessing.value)

const handleFilesSelected = (files: File[]) => {
  const file = files[0]
  if (!file) return

  selectedFile.value = file
  result.value = null
  errorMessage.value = ''
  copied.value = false
  progress.value = 0
  status.value = ''
}

const removeFile = () => {
  selectedFile.value = null
  result.value = null
  errorMessage.value = ''
  copied.value = false
  progress.value = 0
  status.value = ''
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const extractText = async () => {
  if (!selectedFile.value) return

  isProcessing.value = true
  progress.value = 20
  status.value = copy.value.processing
  errorMessage.value = ''
  copied.value = false

  try {
    progress.value = 60
    const extracted = await extractTextFromPDF(selectedFile.value, {
      pageLabel: copy.value.pageLabel,
    })
    result.value = extracted
    progress.value = 100
    status.value = copy.value.ready

    historyManager.addHistory({
      type: 'extractText',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: new Blob([extracted.text], { type: 'text/plain;charset=utf-8' }).size,
    })
  } catch {
    result.value = null
    errorMessage.value = copy.value.errorFailed
  } finally {
    isProcessing.value = false
  }
}

const copyResult = async () => {
  if (!result.value?.text) return

  try {
    await navigator.clipboard.writeText(result.value.text)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 1800)
  } catch {
    errorMessage.value = copy.value.copyFailed
  }
}

const downloadResult = () => {
  if (!selectedFile.value || !result.value?.text) return

  const blob = new Blob([result.value.text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = selectedFile.value.name.replace(/\.pdf$/i, '') + '-text.txt'
  link.click()
  URL.revokeObjectURL(url)
}

onUnmounted(() => {
  copied.value = false
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-cyan-950/20">
    <ToolHeader
      :title="copy.title"
      :subtitle="copy.subtitle"
      :badge="copy.badge"
      accent="cyan"
    >
      <template #badgeIcon>
        <TextCursorInput class="h-4 w-4" />
      </template>
    </ToolHeader>

    <section class="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-6">
      <ToolNoticeBar variant="blue">
        <template #icon>
          <ScanText class="h-5 w-5" />
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
          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-cyan-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-6">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600">
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
                  <FileText class="h-12 w-12" />
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

              <ProgressBar
                v-if="isProcessing || result"
                :progress="progress"
                :label="status"
                variant="primary"
                size="md"
              />

              <div class="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="primary"
                  size="lg"
                  :loading="isProcessing"
                  :disabled="!canExtract"
                  full-width
                  @click="extractText"
                >
                  <TextCursorInput class="mr-2 h-4 w-4" />
                  {{ isProcessing ? copy.processing : copy.action }}
                </Button>
                <Button
                  v-if="selectedFile"
                  variant="ghost"
                  size="lg"
                  full-width
                  @click="removeFile"
                >
                  {{ copy.remove }}
                </Button>
              </div>
            </div>
          </Card>

          <Card class="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-cyan-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="relative">
              <div class="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/15" />
              <div class="relative space-y-5">
                <div>
                  <h3 class="text-xl font-semibold text-slate-900 dark:text-white">
                    {{ copy.localTitle }}
                  </h3>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {{ copy.localBody }}
                  </p>
                </div>
                <div class="grid gap-3">
                  <div
                    v-for="(step, index) in [copy.step1, copy.step2, copy.step3]"
                    :key="step"
                    class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">
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
          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-cyan-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600">
                    {{ copy.textPreview }}
                  </p>
                  <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                    {{ result ? copy.resultTitle : copy.textPreview }}
                  </h2>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {{ result ? copy.resultBody : copy.notice }}
                  </p>
                </div>
                <div
                  v-if="result"
                  class="flex shrink-0 gap-2"
                >
                  <Button
                    v-if="hasText"
                    variant="outline"
                    size="sm"
                    @click="copyResult"
                  >
                    <ClipboardCopy class="mr-2 h-4 w-4" />
                    {{ copied ? copy.copied : copy.copyText }}
                  </Button>
                  <Button
                    v-if="hasText"
                    variant="primary"
                    size="sm"
                    @click="downloadResult"
                  >
                    <Download class="mr-2 h-4 w-4" />
                    {{ copy.download }}
                  </Button>
                </div>
              </div>

              <div
                v-if="selectedFile"
                class="grid gap-3 sm:grid-cols-3"
              >
                <div class="rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4 dark:border-cyan-500/20 dark:bg-cyan-500/10">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                    {{ copy.pageCount }}
                  </p>
                  <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {{ result?.pageCount || '-' }}
                  </p>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {{ copy.characters }}
                  </p>
                  <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {{ result?.characterCount || '-' }}
                  </p>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {{ copy.fileSize }}
                  </p>
                  <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {{ formatFileSize(selectedFile.size) }}
                  </p>
                </div>
              </div>

              <div
                v-if="result && !hasText"
                class="rounded-[24px] border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/20 dark:bg-amber-500/10"
              >
                <div class="flex items-start gap-3">
                  <Sparkles class="mt-1 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-200" />
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                      {{ copy.emptyTitle }}
                    </h3>
                    <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {{ copy.emptyBody }}
                    </p>
                  </div>
                </div>
              </div>

              <div
                v-else-if="hasText"
                class="max-h-[620px] overflow-auto rounded-[24px] border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-inner dark:border-slate-800"
              >
                <pre class="whitespace-pre-wrap break-words text-sm leading-7">{{ result?.text }}</pre>
              </div>

              <div
                v-else
                class="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center dark:border-slate-700 dark:bg-slate-950/35"
              >
                <FileText class="mx-auto h-12 w-12 text-cyan-500" />
                <p class="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {{ copy.uploadDescriptionReady }}
                </p>
              </div>
            </div>
          </Card>

          <Card
            v-if="hasText"
            class="rounded-[28px] border border-emerald-200 bg-emerald-50/90 shadow-xl shadow-emerald-100/70 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:shadow-none"
          >
            <div class="flex items-start gap-4">
              <CheckCircle2 class="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
              <div class="space-y-3">
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                  {{ copy.ready }}
                </h3>
                <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.resultBody }}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  </div>
</template>
