<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BadgeCheck,
  Download,
  FileSignature,
  ImagePlus,
  PenLine,
  ShieldCheck,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import ToolHeader from '@/components/tools/ToolHeader.vue'
import ToolNoticeBar from '@/components/tools/ToolNoticeBar.vue'
import { addVisualSignature } from '@/utils/pdf/signature'
import { getPDFPageCount } from '@/utils/pdf/merge'
import { historyManager } from '@/utils/history-manager'
import { memoryManager } from '@/utils/memory-manager'

const { locale } = useI18n()

const pdfFile = ref<File | null>(null)
const signatureFile = ref<File | null>(null)
const signaturePreviewUrl = ref('')
const pageCount = ref(0)
const pageNumber = ref(1)
const xPercent = ref(68)
const yPercent = ref(72)
const widthPercent = ref(22)
const opacity = ref(1)
const isProcessing = ref(false)
const progress = ref(0)
const status = ref('')
const resultUrl = ref('')
const errorMessage = ref('')

const isZh = computed(() => locale.value.toLowerCase().startsWith('zh'))
const isEs = computed(() => locale.value.toLowerCase().startsWith('es'))

const copy = computed(() => {
  if (isZh.value) {
    return {
      title: '签署 PDF',
      subtitle: '把签名图片放到 PDF 指定位置，生成适合确认、回传和归档的签署副本。',
      badge: '本地工具',
      notice: '这是可视签名/签名图片盖章工具，不是证书级数字签名。文件与签名图片会在浏览器本地处理，不上传服务器。',
      pdfLabel: 'PDF 文件',
      pdfTitleIdle: '先选择需要签署的 PDF',
      pdfTitleReady: 'PDF 已准备好',
      pdfDescIdle: '原文件不会被覆盖，导出时会生成新的签署副本。',
      pdfDescReady: '继续上传签名图片并调整放置位置。',
      signLabel: '签名图片',
      signTitleIdle: '上传透明签名图效果最好',
      signTitleReady: '签名图片已载入',
      signDescIdle: '支持 PNG、JPG、WEBP。建议使用透明背景 PNG。',
      signDescReady: '你可以在右侧预览区调整签名位置和大小。',
      pdfDropTitle: '拖放 PDF 到这里',
      imageDropTitle: '拖放签名图片到这里',
      dropSubtitle: '或点击选择文件',
      settingsLabel: '签署位置',
      settingsTitle: '调整签名落点',
      page: '签署页码',
      x: '横向位置',
      y: '纵向位置',
      width: '签名宽度',
      opacity: '不透明度',
      previewLabel: '快速预览',
      previewTitle: '签名会放在页面这个区域',
      previewHint: '预览用于确认大致位置，最终以导出的 PDF 为准。',
      localTitle: '本地完成',
      localDesc: '适合把手写签名图片放到合同、确认单、申请表或回执上。若你需要法律级数字证书签名，后续应单独接入证书签署流程。',
      action: '生成签署 PDF',
      processing: '正在写入签名...',
      done: '签署副本已生成',
      download: '下载签署 PDF',
      remove: '移除',
      successTitle: '签署完成',
      successMessage: '带可视签名的新 PDF 已准备好，可以下载保存。',
      errorPdf: '无法读取这份 PDF，请重新选择文件后再试。',
      errorSignature: '请先上传签名图片。',
      errorFailed: '签署失败，请检查文件和签名图片后再试。',
    }
  }

  if (isEs.value) {
    return {
      title: 'Firmar PDF',
      subtitle: 'Coloca una imagen de firma en el PDF y crea una copia lista para enviar o archivar.',
      badge: 'Herramienta local',
      notice: 'Esta es una firma visual con imagen, no una firma digital con certificado. El PDF y la imagen se procesan localmente en el navegador.',
      pdfLabel: 'Archivo PDF',
      pdfTitleIdle: 'Elige el PDF que quieres firmar',
      pdfTitleReady: 'PDF listo',
      pdfDescIdle: 'El archivo original no se sobrescribe; se exporta una copia nueva.',
      pdfDescReady: 'Sube la imagen de firma y ajusta su posicion.',
      signLabel: 'Imagen de firma',
      signTitleIdle: 'Una firma PNG transparente funciona mejor',
      signTitleReady: 'Firma cargada',
      signDescIdle: 'Compatible con PNG, JPG y WEBP.',
      signDescReady: 'Ajusta la posicion y el tamano desde la vista previa.',
      pdfDropTitle: 'Arrastra tu PDF aqui',
      imageDropTitle: 'Arrastra tu firma aqui',
      dropSubtitle: 'o haz clic para elegir un archivo',
      settingsLabel: 'Posicion',
      settingsTitle: 'Ajusta la ubicacion de la firma',
      page: 'Pagina',
      x: 'Posicion horizontal',
      y: 'Posicion vertical',
      width: 'Ancho de firma',
      opacity: 'Opacidad',
      previewLabel: 'Vista previa',
      previewTitle: 'La firma se colocara en esta zona',
      previewHint: 'La vista previa confirma la posicion aproximada; el PDF exportado es el resultado final.',
      localTitle: 'Procesamiento local',
      localDesc: 'Util para contratos, formularios y recibos. Para firma legal con certificado, se necesita un flujo de firma digital separado.',
      action: 'Crear PDF firmado',
      processing: 'Aplicando firma...',
      done: 'Copia firmada lista',
      download: 'Descargar PDF firmado',
      remove: 'Quitar',
      successTitle: 'Firma aplicada',
      successMessage: 'La nueva copia con firma visual esta lista.',
      errorPdf: 'No se pudo leer este PDF. Elige el archivo de nuevo.',
      errorSignature: 'Sube primero una imagen de firma.',
      errorFailed: 'No se pudo firmar el PDF. Revisa los archivos e intenta de nuevo.',
    }
  }

  return {
    title: 'Sign PDF',
    subtitle: 'Place a signature image on a PDF and create a signed copy for sharing or archiving.',
    badge: 'Local tool',
    notice: 'This is a visual signature/image stamp tool, not certificate-based digital signing. The PDF and signature image are processed locally in your browser.',
    pdfLabel: 'PDF file',
    pdfTitleIdle: 'Choose the PDF to sign',
    pdfTitleReady: 'PDF is ready',
    pdfDescIdle: 'The original file is not overwritten; a new signed copy is exported.',
    pdfDescReady: 'Upload a signature image and adjust where it appears.',
    signLabel: 'Signature image',
    signTitleIdle: 'Transparent PNG signatures work best',
    signTitleReady: 'Signature image loaded',
    signDescIdle: 'PNG, JPG, and WEBP are supported.',
    signDescReady: 'Use the preview to adjust position and size.',
    pdfDropTitle: 'Drop your PDF here',
    imageDropTitle: 'Drop your signature here',
    dropSubtitle: 'or click to choose a file',
    settingsLabel: 'Placement',
    settingsTitle: 'Adjust the signature position',
    page: 'Page',
    x: 'Horizontal position',
    y: 'Vertical position',
    width: 'Signature width',
    opacity: 'Opacity',
    previewLabel: 'Quick preview',
    previewTitle: 'The signature will appear in this area',
    previewHint: 'The preview confirms approximate placement; the exported PDF is the final result.',
    localTitle: 'Local processing',
    localDesc: 'Useful for contracts, forms, and receipts. Certificate-based legal digital signing should be handled by a separate signing workflow.',
    action: 'Create signed PDF',
    processing: 'Applying signature...',
    done: 'Signed copy is ready',
    download: 'Download signed PDF',
    remove: 'Remove',
    successTitle: 'Signature applied',
    successMessage: 'Your new PDF copy with a visual signature is ready.',
    errorPdf: 'Could not read this PDF. Please choose the file again.',
    errorSignature: 'Please upload a signature image first.',
    errorFailed: 'Failed to sign the PDF. Please check the files and try again.',
  }
})

const canSign = computed(() => !!pdfFile.value && !!signatureFile.value && !isProcessing.value)

const handlePDFSelected = async (files: File[]) => {
  try {
    clearResult()
    pdfFile.value = files[0]
    pageCount.value = await getPDFPageCount(files[0])
    pageNumber.value = Math.min(pageNumber.value, pageCount.value || 1)
    errorMessage.value = ''
  } catch {
    pdfFile.value = null
    pageCount.value = 0
    errorMessage.value = copy.value.errorPdf
  }
}

const handleSignatureSelected = (files: File[]) => {
  const file = files[0]
  if (!file) return
  clearSignaturePreview()
  clearResult()
  signatureFile.value = file
  signaturePreviewUrl.value = URL.createObjectURL(file)
  errorMessage.value = ''
}

const clearSignaturePreview = () => {
  if (signaturePreviewUrl.value) {
    URL.revokeObjectURL(signaturePreviewUrl.value)
    signaturePreviewUrl.value = ''
  }
}

const clearResult = () => {
  if (resultUrl.value) {
    memoryManager.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
}

const removePDF = () => {
  pdfFile.value = null
  pageCount.value = 0
  clearResult()
}

const removeSignature = () => {
  signatureFile.value = null
  clearSignaturePreview()
  clearResult()
}

const handleError = (message: string) => {
  errorMessage.value = message
}

const signPDF = async () => {
  if (!pdfFile.value) return
  if (!signatureFile.value) {
    errorMessage.value = copy.value.errorSignature
    return
  }

  isProcessing.value = true
  progress.value = 18
  status.value = copy.value.processing
  errorMessage.value = ''
  clearResult()

  try {
    progress.value = 56
    const blob = await addVisualSignature(pdfFile.value, signatureFile.value, {
      pageNumber: pageNumber.value,
      xPercent: xPercent.value,
      yPercent: yPercent.value,
      widthPercent: widthPercent.value,
      opacity: opacity.value,
    })

    progress.value = 100
    status.value = copy.value.done
    resultUrl.value = memoryManager.createTemporaryURL(blob)

    historyManager.addHistory({
      type: 'sign',
      fileName: pdfFile.value.name,
      fileSize: pdfFile.value.size,
      resultSize: blob.size,
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : copy.value.errorFailed
  } finally {
    isProcessing.value = false
  }
}

const downloadResult = () => {
  if (!resultUrl.value || !pdfFile.value) return
  const link = document.createElement('a')
  link.href = resultUrl.value
  link.download = pdfFile.value.name.replace(/\.pdf$/i, '') + '-signed.pdf'
  link.click()
}

onUnmounted(() => {
  clearSignaturePreview()
  clearResult()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-950 dark:to-amber-950/20">
    <ToolHeader
      :title="copy.title"
      :subtitle="copy.subtitle"
      :badge="copy.badge"
      accent="amber"
    >
      <template #badgeIcon>
        <PenLine class="h-4 w-4" />
      </template>
    </ToolHeader>

    <section class="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-6">
      <ToolNoticeBar variant="amber">
        <template #icon>
          <ShieldCheck class="h-5 w-5" />
        </template>
        {{ copy.notice }}
      </ToolNoticeBar>

      <div
        v-if="errorMessage"
        class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 shadow-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-100"
      >
        {{ errorMessage }}
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div class="space-y-6">
          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-amber-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">
                  {{ copy.pdfLabel }}
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {{ pdfFile ? copy.pdfTitleReady : copy.pdfTitleIdle }}
                </h2>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ pdfFile ? copy.pdfDescReady : copy.pdfDescIdle }}
                </p>
              </div>

              <DragDropZone
                v-if="!pdfFile"
                accept="pdf"
                :multiple="false"
                :max-files="1"
                @files-selected="handlePDFSelected"
                @error="handleError"
              >
                <template #icon>
                  <FileSignature class="h-12 w-12" />
                </template>
                <template #title>
                  {{ copy.pdfDropTitle }}
                </template>
                <template #subtitle>
                  {{ copy.dropSubtitle }}
                </template>
              </DragDropZone>

              <FilePreview
                v-else
                :file="pdfFile"
                @remove="removePDF"
              />
            </div>
          </Card>

          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-amber-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
                  {{ copy.signLabel }}
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {{ signatureFile ? copy.signTitleReady : copy.signTitleIdle }}
                </h2>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ signatureFile ? copy.signDescReady : copy.signDescIdle }}
                </p>
              </div>

              <DragDropZone
                v-if="!signatureFile"
                accept="image"
                :multiple="false"
                :max-files="1"
                :max-size="20"
                @files-selected="handleSignatureSelected"
                @error="handleError"
              >
                <template #icon>
                  <ImagePlus class="h-12 w-12" />
                </template>
                <template #title>
                  {{ copy.imageDropTitle }}
                </template>
                <template #subtitle>
                  {{ copy.dropSubtitle }}
                </template>
              </DragDropZone>

              <div
                v-else
                class="flex items-center gap-4 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div class="flex h-20 w-32 items-center justify-center rounded-2xl bg-white p-3 dark:bg-slate-900">
                  <img
                    :src="signaturePreviewUrl"
                    alt=""
                    class="max-h-full max-w-full object-contain"
                  >
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {{ signatureFile.name }}
                  </p>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {{ Math.round(signatureFile.size / 1024) }} KB
                  </p>
                </div>
                <button
                  class="rounded-full px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  type="button"
                  @click="removeSignature"
                >
                  {{ copy.remove }}
                </button>
              </div>
            </div>
          </Card>

          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-amber-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">
                  {{ copy.settingsLabel }}
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {{ copy.settingsTitle }}
                </h2>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{{ copy.page }}</span>
                  <input
                    v-model.number="pageNumber"
                    type="number"
                    min="1"
                    :max="pageCount || 1"
                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{{ copy.width }}: {{ widthPercent }}%</span>
                  <input
                    v-model.number="widthPercent"
                    type="range"
                    min="8"
                    max="50"
                    step="1"
                    class="w-full accent-amber-500"
                  >
                </label>
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{{ copy.x }}: {{ xPercent }}%</span>
                  <input
                    v-model.number="xPercent"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    class="w-full accent-amber-500"
                  >
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{{ copy.y }}: {{ yPercent }}%</span>
                  <input
                    v-model.number="yPercent"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    class="w-full accent-amber-500"
                  >
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{{ copy.opacity }}: {{ Math.round(opacity * 100) }}%</span>
                  <input
                    v-model.number="opacity"
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    class="w-full accent-amber-500"
                  >
                </label>
              </div>

              <ProgressBar
                v-if="isProcessing || resultUrl"
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
                  :disabled="!canSign"
                  full-width
                  @click="signPDF"
                >
                  <PenLine class="mr-2 h-4 w-4" />
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
        </div>

        <div class="space-y-6">
          <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-amber-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="space-y-5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">
                  {{ copy.previewLabel }}
                </p>
                <h3 class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                  {{ copy.previewTitle }}
                </h3>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ copy.previewHint }}
                </p>
              </div>

              <div class="rounded-[28px] border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5 dark:border-amber-500/20 dark:from-amber-500/10 dark:to-orange-500/10">
                <div class="relative mx-auto aspect-[3/4] max-w-[340px] overflow-hidden rounded-2xl border border-white/80 bg-white shadow-inner dark:border-white/10 dark:bg-slate-950/50">
                  <div class="absolute left-7 right-7 top-8 space-y-3">
                    <div class="h-4 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div class="h-3 w-4/5 rounded-full bg-slate-100 dark:bg-slate-800" />
                    <div class="h-3 w-3/5 rounded-full bg-slate-100 dark:bg-slate-800" />
                  </div>
                  <div class="absolute bottom-8 left-7 right-7 h-px bg-slate-200 dark:bg-slate-700" />
                  <div
                    class="absolute rounded-xl border border-amber-300/70 bg-white/70 p-1 shadow-lg shadow-amber-200/50 dark:border-amber-300/30 dark:bg-slate-900/70 dark:shadow-none"
                    :style="{
                      left: `${Math.min(xPercent, 82)}%`,
                      top: `${Math.min(yPercent, 88)}%`,
                      width: `${widthPercent}%`,
                      opacity,
                    }"
                  >
                    <img
                      v-if="signaturePreviewUrl"
                      :src="signaturePreviewUrl"
                      alt=""
                      class="w-full object-contain"
                    >
                    <div
                      v-else
                      class="flex h-10 items-center justify-center rounded-lg border border-dashed border-amber-300 text-xs font-semibold text-amber-700 dark:text-amber-200"
                    >
                      Signature
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card class="rounded-[28px] border border-emerald-200 bg-emerald-50/90 shadow-xl shadow-emerald-100/70 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:shadow-none">
            <div class="flex items-start gap-4">
              <BadgeCheck class="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
              <div>
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                  {{ resultUrl ? copy.successTitle : copy.localTitle }}
                </h3>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ resultUrl ? copy.successMessage : copy.localDesc }}
                </p>
                <Button
                  v-if="resultUrl"
                  class="mt-4"
                  variant="primary"
                  @click="downloadResult"
                >
                  <Download class="mr-2 h-4 w-4" />
                  {{ copy.download }}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  </div>
</template>
