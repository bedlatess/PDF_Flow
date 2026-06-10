<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  FileText,
  Flag,
  Loader2,
  LockKeyhole,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-vue-next'
import {
  adminAPI,
  type AdminAuditLog,
  type AdminOverview,
  type ContentBlock,
  type FeatureFlag,
  type SiteSetting,
} from '@/services/api'
import { useSiteConfigStore } from '@/stores/siteConfig'

type TabId = 'flags' | 'settings' | 'content' | 'audit'

const siteConfigStore = useSiteConfigStore()
const loading = ref(true)
const savingKey = ref<string | null>(null)
const activeTab = ref<TabId>('flags')
const error = ref('')
const success = ref('')

const overview = ref<AdminOverview | null>(null)
const settings = ref<SiteSetting[]>([])
const flags = ref<FeatureFlag[]>([])
const contentBlocks = ref<ContentBlock[]>([])
const auditLogs = ref<AdminAuditLog[]>([])

const tabs = [
  { id: 'flags' as const, label: '功能开关', icon: Flag },
  { id: 'settings' as const, label: '站点配置', icon: Settings2 },
  { id: 'content' as const, label: '内容块', icon: FileText },
  { id: 'audit' as const, label: '审计日志', icon: Activity },
]

const enabledFlagCount = computed(() => flags.value.filter((flag) => flag.enabled).length)
const lockedFlagCount = computed(() => flags.value.filter((flag) => flag.requires_login || flag.requires_pro).length)
const selectedContent = ref<ContentBlock | null>(null)

const formatDate = (value: string) => new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

const setMessage = (message: string) => {
  success.value = message
  window.setTimeout(() => {
    if (success.value === message) {
      success.value = ''
    }
  }, 2200)
}

const loadAdminData = async () => {
  loading.value = true
  error.value = ''

  try {
    const [overviewData, settingsData, flagsData, contentData, auditData] = await Promise.all([
      adminAPI.getOverview(),
      adminAPI.listSettings(),
      adminAPI.listFeatureFlags(),
      adminAPI.listContentBlocks(),
      adminAPI.listAuditLogs(),
    ])

    overview.value = overviewData
    settings.value = settingsData
    flags.value = flagsData
    contentBlocks.value = contentData
    auditLogs.value = auditData
    selectedContent.value = contentData[0] ?? null
  } catch (err: any) {
    error.value = err?.response?.status === 403
      ? '当前账号没有后台权限。'
      : '后台数据加载失败，请稍后重试或检查服务端日志。'
  } finally {
    loading.value = false
  }
}

const saveFlag = async (flag: FeatureFlag) => {
  savingKey.value = `flag:${flag.key}`
  error.value = ''

  try {
    const updated = await adminAPI.updateFeatureFlag(flag.key, {
      label: flag.label,
      description: flag.description,
      enabled: flag.enabled,
      requires_login: flag.requires_login,
      requires_pro: flag.requires_pro,
      maintenance_message: flag.maintenance_message,
    })
    const index = flags.value.findIndex((item) => item.key === updated.key)
    if (index >= 0) flags.value[index] = updated
    auditLogs.value = await adminAPI.listAuditLogs()
    await siteConfigStore.fetchPublicConfig(true)
    setMessage(`已保存：${updated.label}`)
  } catch {
    error.value = '功能开关保存失败，请检查输入或稍后重试。'
  } finally {
    savingKey.value = null
  }
}

const saveSetting = async (setting: SiteSetting) => {
  savingKey.value = `setting:${setting.key}`
  error.value = ''

  try {
    const updated = await adminAPI.updateSetting(setting.key, {
      value: setting.value,
      value_type: setting.value_type,
      group: setting.group,
      label: setting.label,
      description: setting.description,
      is_public: setting.is_public,
    })
    const index = settings.value.findIndex((item) => item.key === updated.key)
    if (index >= 0) settings.value[index] = updated
    auditLogs.value = await adminAPI.listAuditLogs()
    await siteConfigStore.fetchPublicConfig(true)
    setMessage(`已保存：${updated.label}`)
  } catch {
    error.value = '站点配置保存失败，请检查输入或稍后重试。'
  } finally {
    savingKey.value = null
  }
}

const saveContentBlock = async (block: ContentBlock) => {
  savingKey.value = `content:${block.key}:${block.locale}`
  error.value = ''

  try {
    const updated = await adminAPI.updateContentBlock(block.key, block.locale, {
      locale: block.locale,
      title: block.title,
      content: block.content,
      description: block.description,
      is_public: block.is_public,
    })
    const index = contentBlocks.value.findIndex(
      (item) => item.key === updated.key && item.locale === updated.locale
    )
    if (index >= 0) contentBlocks.value[index] = updated
    selectedContent.value = updated
    auditLogs.value = await adminAPI.listAuditLogs()
    await siteConfigStore.fetchPublicConfig(true)
    setMessage(`已保存：${updated.title}`)
  } catch {
    error.value = '内容块保存失败，请检查输入或稍后重试。'
  } finally {
    savingKey.value = null
  }
}

onMounted(loadAdminData)
</script>

<template>
  <div class="min-h-screen overflow-hidden bg-[#09111f] text-white">
    <div class="pointer-events-none fixed inset-0">
      <div class="absolute left-[-10%] top-[-12%] h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      <div class="absolute right-[-8%] top-24 h-[28rem] w-[28rem] rounded-full bg-emerald-400/10 blur-3xl" />
      <div class="absolute bottom-[-20%] left-[35%] h-[26rem] w-[26rem] rounded-full bg-blue-500/10 blur-3xl" />
    </div>

    <main class="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section class="rounded-[34px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
              <EyeOff class="h-4 w-4" />
              Hidden Operations
            </div>
            <h1 class="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              PDF-Flow Control Room
            </h1>
            <p class="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              这是隐藏后台的第一阶段。这里不会出现在普通用户导航里，但真正的保护来自后端 ADMIN 权限、接口鉴权和审计日志。
            </p>
          </div>

          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="rounded-3xl border border-white/10 bg-white/[0.07] p-4">
              <p class="text-2xl font-semibold">{{ enabledFlagCount }}</p>
              <p class="mt-1 text-xs text-slate-400">已开启</p>
            </div>
            <div class="rounded-3xl border border-white/10 bg-white/[0.07] p-4">
              <p class="text-2xl font-semibold">{{ lockedFlagCount }}</p>
              <p class="mt-1 text-xs text-slate-400">受限功能</p>
            </div>
            <div class="rounded-3xl border border-white/10 bg-white/[0.07] p-4">
              <p class="text-2xl font-semibold">{{ overview?.content_blocks_count ?? 0 }}</p>
              <p class="mt-1 text-xs text-slate-400">内容块</p>
            </div>
          </div>
        </div>
      </section>

      <div v-if="error" class="mt-6 rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
        <div class="flex items-start gap-3">
          <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" />
          <span>{{ error }}</span>
        </div>
      </div>

      <div v-if="success" class="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
        <div class="flex items-start gap-3">
          <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0" />
          <span>{{ success }}</span>
        </div>
      </div>

      <div v-if="loading" class="mt-10 flex items-center justify-center rounded-[34px] border border-white/10 bg-white/[0.05] p-16">
        <Loader2 class="h-8 w-8 animate-spin text-cyan-200" />
      </div>

      <section v-else class="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside class="rounded-[30px] border border-white/10 bg-white/[0.06] p-3 backdrop-blur-xl">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition"
            :class="activeTab === tab.id ? 'bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/20' : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'"
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" class="h-4 w-4" />
            <span class="font-semibold">{{ tab.label }}</span>
          </button>
        </aside>

        <div class="min-w-0">
          <div v-if="activeTab === 'flags'" class="grid gap-4 xl:grid-cols-2">
            <article
              v-for="flag in flags"
              :key="flag.key"
              class="rounded-[28px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-lg font-semibold">{{ flag.label }}</p>
                  <p class="mt-1 text-xs uppercase tracking-[0.2em] text-cyan-200/70">{{ flag.key }}</p>
                  <p class="mt-3 text-sm leading-6 text-slate-300">{{ flag.description }}</p>
                </div>
                <label class="relative inline-flex cursor-pointer items-center">
                  <input v-model="flag.enabled" type="checkbox" class="peer sr-only" />
                  <span class="h-7 w-12 rounded-full bg-slate-700 transition peer-checked:bg-emerald-400" />
                  <span class="absolute left-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
                </label>
              </div>

              <div class="mt-5 grid gap-3 sm:grid-cols-2">
                <label class="flex items-center gap-2 rounded-2xl bg-black/20 px-3 py-2 text-sm text-slate-200">
                  <input v-model="flag.requires_login" type="checkbox" class="rounded border-white/20 bg-slate-900 text-cyan-300" />
                  需要登录
                </label>
                <label class="flex items-center gap-2 rounded-2xl bg-black/20 px-3 py-2 text-sm text-slate-200">
                  <input v-model="flag.requires_pro" type="checkbox" class="rounded border-white/20 bg-slate-900 text-cyan-300" />
                  需要 Pro
                </label>
              </div>

              <textarea
                v-model="flag.maintenance_message"
                rows="2"
                placeholder="维护提示，留空则使用默认提示"
                class="mt-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
              />

              <button
                type="button"
                class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="savingKey === `flag:${flag.key}`"
                @click="saveFlag(flag)"
              >
                <Loader2 v-if="savingKey === `flag:${flag.key}`" class="h-4 w-4 animate-spin" />
                <Save v-else class="h-4 w-4" />
                保存开关
              </button>
            </article>
          </div>

          <div v-else-if="activeTab === 'settings'" class="grid gap-4">
            <article
              v-for="setting in settings"
              :key="setting.key"
              class="rounded-[28px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl"
            >
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p class="text-lg font-semibold">{{ setting.label }}</p>
                  <p class="mt-1 text-xs uppercase tracking-[0.2em] text-cyan-200/70">{{ setting.group }} / {{ setting.key }}</p>
                  <p class="mt-3 text-sm leading-6 text-slate-300">{{ setting.description }}</p>
                </div>
                <label class="flex items-center gap-2 text-sm text-slate-300">
                  <input v-model="setting.is_public" type="checkbox" class="rounded border-white/20 bg-slate-900 text-cyan-300" />
                  可公开读取
                </label>
              </div>

              <textarea
                v-if="setting.value_type === 'textarea'"
                v-model="setting.value"
                rows="4"
                class="mt-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
              />
              <input
                v-else
                v-model="setting.value"
                type="text"
                class="mt-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
              />

              <button
                type="button"
                class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="savingKey === `setting:${setting.key}`"
                @click="saveSetting(setting)"
              >
                <Loader2 v-if="savingKey === `setting:${setting.key}`" class="h-4 w-4 animate-spin" />
                <Save v-else class="h-4 w-4" />
                保存配置
              </button>
            </article>
          </div>

          <div v-else-if="activeTab === 'content'" class="grid gap-5 xl:grid-cols-[280px_1fr]">
            <aside class="rounded-[28px] border border-white/10 bg-white/[0.07] p-3">
              <button
                v-for="block in contentBlocks"
                :key="`${block.key}:${block.locale}`"
                type="button"
                class="mb-2 w-full rounded-2xl px-4 py-3 text-left text-sm transition"
                :class="selectedContent?.id === block.id ? 'bg-emerald-300 text-slate-950' : 'text-slate-300 hover:bg-white/[0.08]'"
                @click="selectedContent = block"
              >
                <span class="block font-semibold">{{ block.title }}</span>
                <span class="mt-1 block text-xs opacity-70">{{ block.key }} / {{ block.locale }}</span>
              </button>
            </aside>

            <article v-if="selectedContent" class="rounded-[28px] border border-white/10 bg-white/[0.07] p-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="text-sm text-slate-300">
                  标题
                  <input
                    v-model="selectedContent.title"
                    type="text"
                    class="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/60"
                  />
                </label>
                <label class="text-sm text-slate-300">
                  语言
                  <input
                    v-model="selectedContent.locale"
                    type="text"
                    class="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/60"
                  />
                </label>
              </div>
              <label class="mt-4 block text-sm text-slate-300">
                描述
                <input
                  v-model="selectedContent.description"
                  type="text"
                  class="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label class="mt-4 block text-sm text-slate-300">
                正文内容
                <textarea
                  v-model="selectedContent.content"
                  rows="12"
                  class="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                <label class="flex items-center gap-2 text-sm text-slate-300">
                  <input v-model="selectedContent.is_public" type="checkbox" class="rounded border-white/20 bg-slate-900 text-emerald-300" />
                  可公开读取
                </label>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="savingKey === `content:${selectedContent.key}:${selectedContent.locale}`"
                  @click="saveContentBlock(selectedContent)"
                >
                  <Loader2 v-if="savingKey === `content:${selectedContent.key}:${selectedContent.locale}`" class="h-4 w-4 animate-spin" />
                  <Save v-else class="h-4 w-4" />
                  保存内容
                </button>
              </div>
            </article>
          </div>

          <div v-else class="rounded-[28px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl">
            <div class="mb-5 flex items-center gap-3">
              <ShieldCheck class="h-5 w-5 text-cyan-200" />
              <div>
                <p class="font-semibold">最近管理员操作</p>
                <p class="text-sm text-slate-400">只展示最近 50 条，完整留存由后端审计表负责。</p>
              </div>
            </div>

            <div class="space-y-3">
              <div
                v-for="log in auditLogs"
                :key="log.id"
                class="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p class="font-medium">{{ log.action }} {{ log.target_type }}</p>
                  <p class="mt-1 text-sm text-slate-400">{{ log.target_key }}</p>
                </div>
                <div class="flex items-center gap-3 text-sm text-slate-400">
                  <LockKeyhole class="h-4 w-4" />
                  <span>{{ formatDate(log.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="mt-8 rounded-[28px] border border-amber-300/20 bg-amber-300/10 p-5 text-sm leading-7 text-amber-50">
        <div class="flex items-start gap-3">
          <SlidersHorizontal class="mt-1 h-5 w-5 shrink-0" />
          <p>
            当前阶段已经能通过后台维护配置、功能开关和内容块。下一阶段需要把公开页面和工具页统一接入这些后端开关，让“关闭功能 / 维护提示 / 登录要求 / Pro 要求”真正影响用户界面和 API 行为。
          </p>
        </div>
      </section>
    </main>
  </div>
</template>
