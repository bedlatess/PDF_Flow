<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BadgeCheck,
  Download,
  FileImage,
  ImagePlus,
  Sparkles,
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
import { extractImagesFromPDF, type ExtractedPDFImage } from '@/utils/pdf/imageExtraction'

const { locale } = useI18n()

interface ImagePreview extends ExtractedPDFImage {
  url: string
}

const selectedFile = ref<File | null>(null)
const resultImages = ref<ImagePreview[]>([])
const isProcessing = ref(false)
const progress = ref(0)
const status = ref('')
const errorMessage = ref('')

const isZh = computed(() => locale.value.toLowerCase().startsWith('zh'))
const isEs = computed(() => locale.value.toLowerCase().startsWith('es'))

const copy = computed(() => {
  if (isZh.value) {
    return {
      title: '提取 PDF 图片',
      subtitle: '从 PDF 页面中提取可用的内嵌图片资源，适合整理素材、报告配图和归档原图。',
      badge: '本地工具',
      notice: '文件只在浏览器本地读取，不上传服务器。此功能提取 PDF 内嵌图片；如果你想把每一页导出成图片，请使用 PDF 转图片。',
      uploadLabel: 'PDF 文件',
      uploadTitleIdle: '选择需要提取图片的 PDF',
      uploadTitleReady: '文件已准备好',
      uploadDescriptionIdle: '适合包含照片、插图、图表截图等内嵌图片的 PDF。原文件不会被修改。',
      uploadDescriptionReady: '点击提取后会展示可用图片，并可逐张下载。',
      dropTitle: '拖放 PDF 到这里',
      dropSubtitle: '或点击选择文件',
      action: '提取图片',
      processing: '正在扫描页面图片...',
      ready: '图片提取完成',
      remove: '移除',
      download: '下载',
      downloadAll: '下载全部',
      resultLabel: '提取结果',
      waitingTitle: '等待开始',
      readyTitle: (count: number) => `找到 ${count} 张图片`,
      emptyHint: '上传 PDF 后开始提取。图片会按发现顺序展示，文件名会包含页码。',
      emptyTitle: '没有找到可提取图片',
      emptyBody: '这份 PDF 可能主要由文字、矢量图形或整页扫描组成。如果你需要把页面变成图片，请使用 PDF 转图片。',
      page: '页',
      size: '尺寸',
      fileSize: '大小',
      localTitle: '提取内嵌图片，不生成整页截图',
      localBody: '这和 PDF 转图片不同：它尝试拿到页面里真正的图片资源，适合取出配图；如果要导出整页，请使用 PDF 转图片。',
      step1: '上传 PDF',
      step2: '扫描图片资源',
      step3: '预览并下载',
      errorFailed: '图片提取失败。请确认文件是标准 PDF，或改用 PDF 转图片导出整页。',
    }
  }

  if (isEs.value) {
    return {
      title: 'Extraer imagenes de PDF',
      subtitle: 'Extrae imagenes incrustadas desde paginas PDF para reutilizar recursos, graficos o fotos.',
      badge: 'Herramienta local',
      notice: 'El archivo se lee localmente en el navegador y no se sube al servidor. Para exportar cada pagina completa como imagen, usa PDF a imagen.',
      uploadLabel: 'Archivo PDF',
      uploadTitleIdle: 'Elige el PDF para extraer imagenes',
      uploadTitleReady: 'Archivo listo',
      uploadDescriptionIdle: 'Ideal para PDFs con fotos, ilustraciones o capturas incrustadas.',
      uploadDescriptionReady: 'Las imagenes encontradas apareceran para vista previa y descarga.',
      dropTitle: 'Arrastra tu PDF aqui',
      dropSubtitle: 'o haz clic para elegir un archivo',
      action: 'Extraer imagenes',
      processing: 'Buscando imagenes...',
      ready: 'Imagenes extraidas',
      remove: 'Quitar',
      download: 'Descargar',
      downloadAll: 'Descargar todo',
      resultLabel: 'Resultado',
      waitingTitle: 'Esperando inicio',
      readyTitle: (count: number) => `${count} imagenes encontradas`,
      emptyHint: 'Sube un PDF y comienza. Las imagenes se mostraran segun el orden encontrado.',
      emptyTitle: 'No se encontraron imagenes extraibles',
      emptyBody: 'Este PDF puede estar formado por texto, vectores o paginas escaneadas completas. Para exportar paginas completas, usa PDF a imagen.',
      page: 'Pagina',
      size: 'Tamano',
      fileSize: 'Peso',
      localTitle: 'Extrae imagenes incrustadas, no capturas de pagina',
      localBody: 'A diferencia de PDF a imagen, intenta obtener los recursos de imagen reales dentro de la pagina.',
      step1: 'Subir PDF',
      step2: 'Buscar imagenes',
      step3: 'Vista previa y descarga',
      errorFailed: 'No se pudieron extraer imagenes. Confirma que sea un PDF estandar o usa PDF a imagen.',
    }
  }

  return {
    title: 'Extract PDF Images',
    subtitle: 'Pull embedded images from PDF pages for reuse, reporting, or archiving.',
    badge: 'Local tool',
    notice: 'The file is read locally in your browser and is not uploaded. This extracts embedded images; to export every full page as an image, use PDF to Image.',
    uploadLabel: 'PDF file',
    uploadTitleIdle: 'Choose the PDF to extract images from',
    uploadTitleReady: 'File is ready',
    uploadDescriptionIdle: 'Best for PDFs with embedded photos, illustrations, charts, or screenshots.',
    uploadDescriptionReady: 'Extracted images will appear for preview and download.',
    dropTitle: 'Drop your PDF here',
    dropSubtitle: 'or click to choose a file',
    action: 'Extract images',
    processing: 'Scanning page images...',
    ready: 'Images extracted',
    remove: 'Remove',
    download: 'Download',
    downloadAll: 'Download all',
    resultLabel: 'Result',
    waitingTitle: 'Waiting to start',
    readyTitle: (count: number) => `${count} images found`,
    emptyHint: 'Upload a PDF and start extraction. Images will appear in the order they are found.',
    emptyTitle: 'No extractable images found',
    emptyBody: 'This PDF may be mostly text, vector graphics, or full-page scans. Use PDF to Image if you need full-page exports.',
    page: 'Page',
    size: 'Size',
    fileSize: 'File size',
    localTitle: 'Extract embedded images, not page screenshots',
    localBody: 'Unlike PDF to Image, this tries to recover the actual image resources inside the page.',
    step1: 'Upload PDF',
    step2: 'Scan image resources',
    step3: 'Preview and download',
    errorFailed: 'Images could not be extracted. Confirm this is a standard PDF or use PDF to Image.',
  }
})

const canExtract = computed(() => !!selectedFile.value && !isProcessing.value)
const totalResultSize = computed(() =>
  resultImages.value.reduce((sum, image) => sum + image.blob.size, 0)
)

const handleFilesSelected = (files: File[]) => {
  const file = files[0]
  if (!file) return

  clearImageUrls()
  selectedFile.value = file
  errorMessage.value = ''
  progress.value = 0
  status.value = ''
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const clearImageUrls = () => {
  resultImages.value.forEach((image) => URL.revokeObjectURL(image.url))
  resultImages.value = []
}

const removeFile = () => {
  selectedFile.value = null
  errorMessage.value = ''
  progress.value = 0
  status.value = ''
  clearImageUrls()
}

const extractImages = async () => {
  if (!selectedFile.value) return

  isProcessing.value = true
  progress.value = 18
  status.value = copy.value.processing
  errorMessage.value = ''
  clearImageUrls()

  try {
    progress.value = 58
    const extracted = await extractImagesFromPDF(selectedFile.value)
    resultImages.value = extracted.map((image) => ({
      ...image,
      url: URL.createObjectURL(image.blob),
    }))
    progress.value = 100
    status.value = copy.value.ready

    historyManager.addHistory({
      type: 'extractImages',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: totalResultSize.value,
    })
  } catch {
    errorMessage.value = copy.value.errorFailed
  } finally {
    isProcessing.value = false
  }
}

const resultFileName = (image: ImagePreview) => {
  const baseName = selectedFile.value?.name.replace(/\.pdf$/i, '') || 'pdf'
  return `${baseName}-page-${image.pageNumber}-image-${image.imageNumber}.png`
}

const downloadImage = (image: ImagePreview) => {
  const link = document.createElement('a')
  link.href = image.url
  link.download = resultFileName(image)
  link.click()
}

const downloadAll = () => {
  resultImages.value.forEach((image, index) => {
    window.setTimeout(() => downloadImage(image), index * 120)
  })
}

onUnmounted(() => {
  clearImageUrls()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-950 dark:to-rose-950/20">
    <ToolHeader
      :title="copy.title"
      :subtitle="copy.subtitle"
      :badge="copy.badge"
      accent="amber"
    >
      <template #badgeIcon>
        <ImagePlus class="h-4 w-4" />
      </template>
    </ToolHeader>

    <section class="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-6">
      <ToolNoticeBar variant="amber">
        <template #icon>
          <FileImage class="h-5 w-5" />
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
          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-orange-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-6">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
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
                  <FileImage class="h-12 w-12" />
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
                v-if="isProcessing || resultImages.length > 0"
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
                  @click="extractImages"
                >
                  <ImagePlus class="mr-2 h-4 w-4" />
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

          <Card class="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-orange-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="relative">
              <div class="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-orange-300/25 blur-3xl dark:bg-orange-500/15" />
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
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 text-sm font-bold text-white">
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
          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-orange-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
                    {{ copy.resultLabel }}
                  </p>
                  <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                    {{ resultImages.length > 0 ? copy.readyTitle(resultImages.length) : copy.waitingTitle }}
                  </h2>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {{ resultImages.length > 0 ? `${copy.fileSize}: ${formatFileSize(totalResultSize)}` : copy.emptyHint }}
                  </p>
                </div>
                <Button
                  v-if="resultImages.length > 0"
                  variant="primary"
                  size="sm"
                  @click="downloadAll"
                >
                  <Download class="mr-2 h-4 w-4" />
                  {{ copy.downloadAll }}
                </Button>
              </div>

              <div
                v-if="selectedFile && !isProcessing && progress === 100 && resultImages.length === 0"
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
                v-else-if="resultImages.length === 0"
                class="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center dark:border-slate-700 dark:bg-slate-950/35"
              >
                <FileImage class="mx-auto h-12 w-12 text-orange-500" />
                <p class="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {{ copy.emptyHint }}
                </p>
              </div>

              <div
                v-else
                class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <article
                  v-for="image in resultImages"
                  :key="image.url"
                  class="group overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <div class="flex aspect-square items-center justify-center bg-white p-3 dark:bg-slate-900">
                    <img
                      :src="image.url"
                      alt=""
                      class="max-h-full max-w-full object-contain"
                    >
                  </div>
                  <div class="space-y-3 p-4">
                    <div class="grid gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>{{ copy.page }} {{ image.pageNumber }}</span>
                      <span>{{ copy.size }} {{ image.width }} x {{ image.height }}</span>
                      <span>{{ copy.fileSize }} {{ formatFileSize(image.blob.size) }}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      full-width
                      @click="downloadImage(image)"
                    >
                      <Download class="mr-2 h-4 w-4" />
                      {{ copy.download }}
                    </Button>
                  </div>
                </article>
              </div>
            </div>
          </Card>

          <Card
            v-if="resultImages.length > 0"
            class="rounded-[28px] border border-emerald-200 bg-emerald-50/90 shadow-xl shadow-emerald-100/70 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:shadow-none"
          >
            <div class="flex items-start gap-4">
              <BadgeCheck class="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
              <div>
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                  {{ copy.ready }}
                </h3>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.localBody }}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  </div>
</template>
