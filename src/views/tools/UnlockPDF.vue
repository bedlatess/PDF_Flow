<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  KeyRound,
  LogIn,
  ShieldAlert,
  UnlockKeyhole,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import DiagnosticAlert from '@/components/common/DiagnosticAlert.vue'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import FilePreview from '@/components/pdf/FilePreview.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import ToolAccessPanel from '@/components/tools/ToolAccessPanel.vue'
import ToolHeader from '@/components/tools/ToolHeader.vue'
import ToolNoticeBar from '@/components/tools/ToolNoticeBar.vue'
import { advancedAPI } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { formatUserFacingError, type FormattedUserError } from '@/utils/error-messages'
import { redirectForFeatureAccess } from '@/utils/feature-access'
import { historyManager } from '@/utils/history-manager'

const { locale } = useI18n()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const selectedFile = ref<File | null>(null)
const password = ref('')
const showPassword = ref(false)
const isProcessing = ref(false)
const progress = ref(0)
const status = ref('')
const resultUrl = ref('')
const errorState = ref<FormattedUserError | null>(null)

const isZh = computed(() => locale.value.toLowerCase().startsWith('zh'))
const isEs = computed(() => locale.value.toLowerCase().startsWith('es'))

const copy = computed(() => {
  if (isZh.value) {
    return {
      title: '解锁 PDF',
      subtitle: '输入你已知道的打开密码，生成一份便于整理、合并和归档的无密码副本。',
      badge: '登录可用',
      notice: '此功能不会破解未知密码。只有在你拥有文件权限并知道当前密码时，才应使用它移除打开密码。文件会上传到服务器处理，并按云端文件生命周期策略清理临时副本。',
      accessLabel: '需要登录',
      accessTitle: '登录后解锁你有权限处理的 PDF',
      accessDescription: '解锁需要云端读取加密 PDF 并重新导出副本。请只处理你拥有权限、且知道密码的文件。',
      goToSignIn: '登录后使用',
      accessSteps: ['登录账号', '上传受密码保护的 PDF', '输入当前密码并下载副本'],
      uploadLabel: '受保护文件',
      uploadTitleIdle: '选择要解锁的 PDF',
      uploadTitleSelected: '文件已准备好',
      uploadDescriptionIdle: '请上传需要打开密码的 PDF。普通 PDF 无需解锁。',
      uploadDescriptionSelected: '输入当前打开密码后，会生成新的无密码 PDF 副本。',
      dropTitle: '拖放受保护 PDF 到这里',
      dropSubtitle: '或点击选择文件',
      passwordLabel: '当前打开密码',
      passwordPlaceholder: '输入这份 PDF 现在使用的打开密码',
      noFile: '请先上传一份受密码保护的 PDF 文件。',
      noPassword: '请输入当前 PDF 的打开密码。',
      unlock: '生成无密码副本',
      processing: '正在移除打开密码...',
      uploading: '正在上传文件...',
      ready: '无密码副本已生成',
      successTitle: 'PDF 已解锁',
      successMessage: '新的 PDF 副本已不再需要打开密码。建议下载后打开确认。',
      download: '下载无密码 PDF',
      workspaceTitle: '先解锁，再继续整理',
      workspaceDescription: '适合处理你自己的合同、资料包或归档文件，解锁后可以继续合并、拆分、加页码或转换格式。',
      step1: '必须输入当前密码。平台不会尝试猜测、绕过或破解密码。',
      step2: '导出的文件是新副本，原始受保护文件不会被覆盖。',
      step3: '如果密码错误或文件不是标准加密 PDF，页面会给出可截图的诊断提示。',
      guardTitle: '权限提醒',
      guardBody: '请只解锁你拥有处理权限的文件。对于第三方文件，请先确认授权。',
    }
  }

  if (isEs.value) {
    return {
      title: 'Desbloquear PDF',
      subtitle: 'Introduce la contraseña que ya conoces y crea una copia sin contraseña para organizar o archivar.',
      badge: 'Requiere inicio de sesion',
      notice: 'Esta funcion no rompe contrasenas desconocidas. Usala solo cuando tengas permiso sobre el archivo y conozcas la contrasena actual. El PDF se procesa en el servidor y los temporales se limpian segun la politica de ciclo de vida.',
      accessLabel: 'Inicio de sesion requerido',
      accessTitle: 'Inicia sesion para desbloquear PDFs autorizados',
      accessDescription: 'El desbloqueo necesita leer el PDF cifrado en la nube y exportar una copia nueva. Procesa solo archivos para los que tienes permiso.',
      goToSignIn: 'Iniciar sesion',
      accessSteps: ['Inicia sesion', 'Sube el PDF protegido', 'Introduce la contrasena y descarga la copia'],
      uploadLabel: 'Archivo protegido',
      uploadTitleIdle: 'Elige el PDF que quieres desbloquear',
      uploadTitleSelected: 'Archivo listo',
      uploadDescriptionIdle: 'Sube un PDF que requiera contrasena de apertura. Un PDF normal no necesita desbloqueo.',
      uploadDescriptionSelected: 'Introduce la contrasena actual para crear una copia sin contrasena.',
      dropTitle: 'Arrastra el PDF protegido aqui',
      dropSubtitle: 'o haz clic para elegir un archivo',
      passwordLabel: 'Contrasena actual',
      passwordPlaceholder: 'Introduce la contrasena de apertura actual',
      noFile: 'Sube primero un PDF protegido por contrasena.',
      noPassword: 'Introduce la contrasena actual del PDF.',
      unlock: 'Crear copia sin contrasena',
      processing: 'Quitando contrasena de apertura...',
      uploading: 'Subiendo archivo...',
      ready: 'Copia sin contrasena lista',
      successTitle: 'PDF desbloqueado',
      successMessage: 'La nueva copia ya no requiere contrasena para abrirse.',
      download: 'Descargar PDF desbloqueado',
      workspaceTitle: 'Desbloquea antes de organizar',
      workspaceDescription: 'Util para tus propios contratos, paquetes de documentos y archivos que despues quieres combinar, dividir o numerar.',
      step1: 'Debes conocer la contrasena actual. No intentamos adivinarla ni saltarla.',
      step2: 'Se exporta una copia nueva; el archivo protegido original no se sobrescribe.',
      step3: 'Si la contrasena es incorrecta, veras un mensaje con codigo de diagnostico.',
      guardTitle: 'Recordatorio de permisos',
      guardBody: 'Desbloquea solo archivos que tienes derecho a procesar. Para archivos de terceros, confirma la autorizacion primero.',
    }
  }

  return {
    title: 'Unlock PDF',
    subtitle: 'Enter the password you already know and create an unlocked copy for organizing or archiving.',
    badge: 'Sign-in required',
    notice: 'This tool does not break unknown passwords. Use it only when you have permission to process the file and know the current password. The PDF is processed on the server and temporary files are cleaned by the cloud file lifecycle policy.',
    accessLabel: 'Sign-in required',
    accessTitle: 'Sign in to unlock PDFs you are allowed to process',
    accessDescription: 'Unlocking needs cloud processing to read the encrypted PDF and export a fresh copy. Only process files you are authorized to handle.',
    goToSignIn: 'Sign in to use',
    accessSteps: ['Sign in', 'Upload the protected PDF', 'Enter the password and download the copy'],
    uploadLabel: 'Protected file',
    uploadTitleIdle: 'Choose the PDF to unlock',
    uploadTitleSelected: 'File is ready',
    uploadDescriptionIdle: 'Upload a PDF that requires an open password. A normal PDF does not need unlocking.',
    uploadDescriptionSelected: 'Enter the current open password to create an unlocked copy.',
    dropTitle: 'Drop your protected PDF here',
    dropSubtitle: 'or click to choose a file',
    passwordLabel: 'Current open password',
    passwordPlaceholder: 'Enter the password currently used by this PDF',
    noFile: 'Please upload a password-protected PDF first.',
    noPassword: 'Please enter the current PDF password.',
    unlock: 'Create unlocked copy',
    processing: 'Removing open password...',
    uploading: 'Uploading file...',
    ready: 'Unlocked copy is ready',
    successTitle: 'PDF unlocked',
    successMessage: 'The new PDF copy no longer requires a password to open.',
    download: 'Download unlocked PDF',
    workspaceTitle: 'Unlock first, then organize',
    workspaceDescription: 'Useful for your own contracts, document packs, and archives before merging, splitting, numbering, or converting.',
    step1: 'You must know the current password. We do not guess, bypass, or break passwords.',
    step2: 'A new copy is exported; the original protected file is not overwritten.',
    step3: 'If the password is incorrect, you will see a diagnostic code you can share with support.',
    guardTitle: 'Permission reminder',
    guardBody: 'Only unlock files you are allowed to process. For third-party files, confirm authorization first.',
  }
})

const canSubmit = computed(() =>
  !!selectedFile.value
  && password.value.length > 0
  && !isProcessing.value
)

const ensureLogin = () => redirectForFeatureAccess({
  router,
  route,
  isAuthenticated: userStore.isAuthenticated,
})

const revokeResultUrl = () => {
  if (resultUrl.value) {
    URL.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
}

const handleFilesSelected = (files: File[]) => {
  const file = files[0]
  if (!file) return
  selectedFile.value = file
  errorState.value = null
  revokeResultUrl()
}

const removeFile = () => {
  selectedFile.value = null
  errorState.value = null
  progress.value = 0
  status.value = ''
  revokeResultUrl()
}

const validate = () => {
  if (!selectedFile.value) {
    errorState.value = formatUserFacingError(new Error(copy.value.noFile), {
      area: 'UNLOCK',
      fallbackMessage: copy.value.noFile,
    })
    return false
  }

  if (!password.value) {
    errorState.value = formatUserFacingError(new Error(copy.value.noPassword), {
      area: 'UNLOCK',
      fallbackMessage: copy.value.noPassword,
    })
    return false
  }

  return true
}

const unlockPDF = async () => {
  if (!ensureLogin() || !validate() || !selectedFile.value) {
    return
  }

  isProcessing.value = true
  progress.value = 15
  status.value = copy.value.uploading
  errorState.value = null
  revokeResultUrl()

  try {
    progress.value = 55
    status.value = copy.value.processing
    const blob = await advancedAPI.unlockPDF(selectedFile.value, password.value)
    resultUrl.value = URL.createObjectURL(blob)
    progress.value = 100
    status.value = copy.value.ready

    historyManager.addHistory({
      type: 'unlock',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      resultSize: blob.size,
    })
  } catch (error) {
    errorState.value = formatUserFacingError(error, {
      area: 'UNLOCK',
      fallbackMessage: 'The PDF could not be unlocked. Please confirm the password and retry with a standard protected PDF.',
    })
  } finally {
    isProcessing.value = false
  }
}

const downloadResult = () => {
  if (!resultUrl.value || !selectedFile.value) return
  const link = document.createElement('a')
  link.href = resultUrl.value
  link.download = selectedFile.value.name.replace(/\.pdf$/i, '') + '-unlocked.pdf'
  link.click()
}

onUnmounted(() => {
  revokeResultUrl()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/20">
    <ToolHeader
      :title="copy.title"
      :subtitle="copy.subtitle"
      :badge="copy.badge"
      accent="emerald"
    >
      <template #badgeIcon>
        <UnlockKeyhole class="h-4 w-4" />
      </template>
    </ToolHeader>

    <section class="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-6">
      <ToolNoticeBar variant="emerald">
        <template #icon>
          <ShieldAlert class="h-5 w-5" />
        </template>
        {{ copy.notice }}
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
        v-if="!userStore.isAuthenticated"
        class="mt-6"
        accent="blue"
        :label="copy.accessLabel"
        :title="copy.accessTitle"
        :description="copy.accessDescription"
        :action-label="copy.goToSignIn"
        :steps="copy.accessSteps"
        @action="ensureLogin()"
      >
        <template #actionIcon>
          <LogIn class="mr-2 h-4 w-4" />
        </template>
      </ToolAccessPanel>

      <div
        v-if="userStore.isAuthenticated"
        class="mt-6 grid gap-6 lg:grid-cols-[1fr_0.95fr]"
      >
        <Card class="rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-emerald-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
          <div class="space-y-6">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                {{ copy.uploadLabel }}
              </p>
              <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {{ selectedFile ? copy.uploadTitleSelected : copy.uploadTitleIdle }}
              </h2>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {{ selectedFile ? copy.uploadDescriptionSelected : copy.uploadDescriptionIdle }}
              </p>
            </div>

            <DragDropZone
              v-if="!selectedFile"
              accept="pdf"
              :multiple="false"
              :max-files="1"
              @files-selected="handleFilesSelected"
            >
              <template #icon>
                <UnlockKeyhole class="h-12 w-12" />
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

            <label class="block">
              <span class="mb-2 block text-sm font-medium text-slate-900 dark:text-white">
                {{ copy.passwordLabel }}
              </span>
              <div class="relative">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  :placeholder="copy.passwordPlaceholder"
                  class="w-full rounded-2xl border border-slate-300 px-4 py-3 pr-12 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="h-5 w-5" />
                  <Eye v-else class="h-5 w-5" />
                </button>
              </div>
            </label>

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
                :disabled="!canSubmit"
                full-width
                @click="unlockPDF"
              >
                <KeyRound class="mr-2 h-4 w-4" />
                {{ isProcessing ? copy.processing : copy.unlock }}
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

        <div class="space-y-6">
          <Card class="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-emerald-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
            <div class="relative">
              <div class="absolute -left-20 -top-20 h-44 w-44 rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-500/15" />
              <div class="relative space-y-6">
                <div class="rounded-[24px] border border-emerald-100 bg-emerald-50/80 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div class="flex items-start gap-3">
                    <FileCheck2 class="mt-1 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                    <div>
                      <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                        {{ copy.guardTitle }}
                      </h3>
                      <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {{ copy.guardBody }}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 class="text-xl font-semibold text-slate-900 dark:text-white">
                    {{ copy.workspaceTitle }}
                  </h3>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {{ copy.workspaceDescription }}
                  </p>
                </div>

                <div class="grid gap-3">
                  <div
                    v-for="(step, index) in [copy.step1, copy.step2, copy.step3]"
                    :key="step"
                    class="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                      {{ index + 1 }}
                    </span>
                    <p class="pt-0.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {{ step }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card
            v-if="resultUrl"
            class="rounded-[28px] border border-emerald-200 bg-emerald-50/90 shadow-xl shadow-emerald-100/70 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:shadow-none"
          >
            <div class="flex items-start gap-4">
              <CheckCircle2 class="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
              <div class="space-y-3">
                <div>
                  <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                    {{ copy.successTitle }}
                  </h3>
                  <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {{ copy.successMessage }}
                  </p>
                </div>

                <Button
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
