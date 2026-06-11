<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSiteConfigStore } from '@/stores/siteConfig'
import {
  Clock3,
  Database,
  FileClock,
  FileLock2,
  Mail,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
} from 'lucide-vue-next'

type LegalSection = {
  icon: unknown
  title: string
  paragraphs: string[]
  bullets?: string[]
}

type LegalContent = {
  eyebrow: string
  title: string
  updated: string
  description: string
  summaryTitle: string
  summary: string
  note: string
  sections: LegalSection[]
}

const { locale } = useI18n()
const siteConfigStore = useSiteConfigStore()

const isUsableContent = (value?: string | null) => {
  if (!value) return false
  const trimmed = value.trim()
  if (trimmed.length < 8) return false
  const questionCount = (trimmed.match(/\?/g) || []).length
  const mojibakeMatches = trimmed.match(/[锟閸闁缁鐟瀵閹鈧娴]/g) || []
  return questionCount / trimmed.length < 0.25 && mojibakeMatches.length < 3
}

const content: Record<'zh' | 'en', LegalContent> = {
  zh: {
    eyebrow: '隐私政策',
    title: '我们如何保护你的文件与账户信息',
    updated: '最后更新：2026 年 6 月 11 日',
    description:
      'PDF-Flow 是面向日常文档处理的在线 PDF 工具。基础功能会尽量在浏览器本地完成；当你主动使用 OCR、Office 转 PDF、AI 分析或勾选云端处理时，相关文件才会上传到服务器临时处理。',
    summaryTitle: '简短说明',
    summary:
      '我们不会出售你的个人信息，也不会为了广告画像读取你的文件内容。云端处理文件只用于完成你选择的任务、提供下载、排查异常和保障服务安全，并会按临时文件生命周期策略自动清理。',
    note:
      '如果你处理高度敏感、受监管或具有法律效力的文件，请优先使用本地处理能力，并自行评估是否适合上传到云端。',
    sections: [
      {
        icon: Database,
        title: '1. 我们收集的信息',
        paragraphs: [
          '访问网站时，我们可能接收必要的访问数据，例如浏览器类型、访问时间、页面路径、语言设置、IP 相关安全信息和错误日志。这些信息用于保持网站稳定、排查异常访问和改进体验。',
          '注册或登录账户时，我们会保存邮箱、显示名称、加密后的密码、账户角色、订阅状态、登录时间等必要信息。我们不会保存你的明文密码。',
        ],
        bullets: [
          '账户信息：邮箱、显示名称、认证状态、角色权限。',
          '运行信息：任务状态、错误编号、必要诊断日志。',
          '支付信息：如启用订阅，付款细节由支付服务商处理，PDF-Flow 只保存必要的订阅状态。',
        ],
      },
      {
        icon: FileLock2,
        title: '2. 文件如何被处理',
        paragraphs: [
          '合并、拆分、旋转、压缩、图片转 PDF、PDF 转图片等基础工具会优先在你的浏览器本地处理。此类本地处理不会把文件内容上传到 PDF-Flow 服务器。',
          'OCR 文字识别、Office 转 PDF、AI PDF 分析，以及你主动勾选“云端处理”的任务需要服务器参与。提交这些任务时，文件会被临时上传，只用于完成本次处理和下载。',
        ],
        bullets: [
          '本地处理：服务器通常看不到文件内容，也不会知道文件正文。',
          '云端处理：服务器会短暂接收文件、生成结果，并记录必要的任务状态。',
          '反馈排查：请不要在反馈里主动上传不必要的敏感文件或完整文件内容。',
        ],
      },
      {
        icon: FileClock,
        title: '3. 云端文件生命周期策略',
        paragraphs: [
          '云端上传文件、转换结果和临时下载包都会存放在受控的临时目录中。系统会通过自动清理和管理员手动清理两种方式删除过期文件。',
          '当前默认策略是：上传文件和处理结果通常保留约 1 小时，下载打包文件通常保留约 30 分钟。实际删除时间可能因任务队列、系统负载、异常排查或维护窗口略有延迟。',
        ],
        bullets: [
          '清理范围：临时上传目录、转换输出目录、下载打包目录。',
          '不清理内容：账户、审计日志、反馈、错误摘要和必要任务元数据不会被文件清理器删除。',
          '安全边界：清理器只扫描 PDF-Flow 配置的上传目录，并只删除带固定前缀的系统临时目录。',
        ],
      },
      {
        icon: ServerCog,
        title: '4. 我们如何使用信息',
        paragraphs: [
          '我们使用必要信息提供登录、文件处理、任务进度、结果下载、权限控制、订阅识别、异常排查和安全防护。',
          '如果你提交问题反馈，我们可能根据截图、时间点、错误编号、页面地址和操作步骤定位问题。反馈内容会尽量限制在排障所需范围内。',
        ],
      },
      {
        icon: Trash2,
        title: '5. 保留与删除',
        paragraphs: [
          '临时文件会按上述生命周期清理。Redis 中的文件/任务缓存也设置了过期时间，用于避免临时任务长期可访问。',
          '数据库中的账户信息、订阅状态、必要审计记录、错误摘要和反馈记录可能会按合理期限继续保留，用于安全、账务、排查和合规目的。',
        ],
      },
      {
        icon: UserCheck,
        title: '6. 你的选择与权利',
        paragraphs: [
          '你可以选择不注册账户而使用部分基础功能。对于需要登录、订阅或云端处理的功能，你可以自行决定是否继续。',
          '你可以请求查看、更正或删除账户相关信息。某些安全、支付、审计或故障排查记录可能需要按合理期限保留。',
        ],
      },
      {
        icon: ShieldCheck,
        title: '7. 安全措施',
        paragraphs: [
          '我们采用密码哈希、令牌登录、角色权限、基础安全日志、容器化部署和最小必要访问原则来降低风险。',
          '没有任何在线服务能保证绝对安全。处理高度敏感文件前，请优先考虑本地处理或自行脱敏。',
        ],
      },
      {
        icon: Clock3,
        title: '8. 政策更新',
        paragraphs: [
          '随着支付、团队协作、企业 API 或更多云端能力上线，本政策可能更新。重要变化会尽量通过页面提示、版本记录或站内说明告知。',
        ],
      },
      {
        icon: Mail,
        title: '9. 联系我们',
        paragraphs: [
          '如果你对隐私、文件处理或账户数据有疑问，请通过网站展示的支持渠道联系我们。报告问题时，建议提供页面截图、时间点、错误编号和简短复现步骤。',
        ],
      },
    ],
  },
  en: {
    eyebrow: 'Privacy Policy',
    title: 'How we protect your files and account information',
    updated: 'Last updated: June 11, 2026',
    description:
      'PDF-Flow is an online PDF workspace for everyday document tasks. Core tools are designed to run locally in your browser whenever possible. Files are uploaded only when you choose OCR, Office conversion, AI analysis, or cloud processing.',
    summaryTitle: 'Short version',
    summary:
      'We do not sell your personal information or read your documents for advertising profiles. Cloud files are used only to complete the task you requested, provide downloads, troubleshoot issues, and protect service security, then removed under our temporary file lifecycle policy.',
    note:
      'If you process highly sensitive, regulated, or legally binding documents, prefer local processing and assess whether cloud upload is appropriate.',
    sections: [
      {
        icon: Database,
        title: '1. Information we collect',
        paragraphs: [
          'When you visit the site, we may receive basic access data such as browser type, visit time, page path, language setting, IP-related security information, and error logs.',
          'When you create or use an account, we store information needed to operate the service, including email, display name, hashed password, account role, subscription status, and login timestamps.',
        ],
      },
      {
        icon: FileLock2,
        title: '2. How files are processed',
        paragraphs: [
          'Basic tools such as merge, split, rotate, compress, image to PDF, and PDF to image are designed to run locally in your browser whenever possible.',
          'OCR, Office to PDF, AI PDF analysis, and cloud-processing workflows require backend processing. When you submit these tasks, related files are uploaded temporarily.',
        ],
      },
      {
        icon: FileClock,
        title: '3. Cloud file lifecycle policy',
        paragraphs: [
          'Cloud uploads, generated results, and temporary download bundles are stored in controlled temporary directories. Expired files are removed through automatic cleanup and admin maintenance tools.',
          'Current defaults are about 1 hour for uploaded files and generated results, and about 30 minutes for download bundles. Actual deletion may be delayed by queues, load, troubleshooting, or maintenance windows.',
        ],
        bullets: [
          'Cleanup scope: temporary upload directories, generated result directories, and download bundle directories.',
          'Not removed by file cleanup: accounts, audit logs, feedback, error summaries, and necessary task metadata.',
          'Safety boundary: cleanup scans only PDF-Flow’s configured upload directory and deletes only system-generated directories with known prefixes.',
        ],
      },
      {
        icon: ServerCog,
        title: '4. How information is used',
        paragraphs: [
          'We use necessary information to provide login, file processing, task progress, downloads, permission checks, subscription recognition, troubleshooting, and security protection.',
          'If you contact support, we may use screenshots, timestamps, error codes, page URLs, and steps you provide to locate the issue. Please avoid sending unnecessary sensitive content.',
        ],
      },
      {
        icon: Trash2,
        title: '5. Retention and deletion',
        paragraphs: [
          'Temporary files are removed according to the lifecycle policy above. Redis file and job caches also use expiry times to avoid long-lived temporary access.',
          'Account records, subscription status, required audit records, error summaries, and feedback reports may remain for reasonable security, billing, troubleshooting, and compliance purposes.',
        ],
      },
      {
        icon: UserCheck,
        title: '6. Your choices and rights',
        paragraphs: [
          'You may use some basic features without creating an account. For login, subscription, or cloud features, you decide whether to continue.',
          'You may request access, correction, or deletion of account-related information. Some security, billing, audit, or troubleshooting records may need to remain for a reasonable period.',
        ],
      },
      {
        icon: ShieldCheck,
        title: '7. Security',
        paragraphs: [
          'We use hashed passwords, token-based authentication, role-based access, security logs, containerized deployment, and least-necessary access practices to reduce risk.',
          'No online service can be perfectly secure. If you handle highly sensitive files, consider local processing or redaction before upload.',
        ],
      },
      {
        icon: Clock3,
        title: '8. Updates',
        paragraphs: [
          'As billing, team, enterprise API, or cloud features expand, this policy may change. Material updates will be reflected on this page.',
        ],
      },
      {
        icon: Mail,
        title: '9. Contact',
        paragraphs: [
          'For privacy, file-processing, or account-data questions, contact us through the support channel shown by the site. Include screenshots, timestamps, error codes, and short reproduction steps when reporting issues.',
        ],
      },
    ],
  },
}

const activeContent = computed(() => {
  const key = locale.value.startsWith('zh') ? 'zh' : 'en'
  const base = content[key]
  const block = siteConfigStore.getContentBlock('privacy_policy', locale.value)

  return {
    ...base,
    title: isUsableContent(block?.title) ? block?.title || base.title : base.title,
    summary: isUsableContent(block?.content) ? block?.content || base.summary : base.summary,
  }
})

onMounted(() => {
  siteConfigStore.fetchPublicConfig()
})
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_100%_0%,rgba(34,197,94,0.1),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_100%_0%,rgba(34,197,94,0.1),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
    <section class="px-4 pb-10 pt-16 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-6xl">
        <div class="grid gap-6 rounded-[36px] border border-white/70 bg-white/88 p-7 shadow-2xl shadow-sky-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/78 dark:shadow-none lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
              <Sparkles class="h-4 w-4" />
              {{ activeContent.eyebrow }}
            </div>
            <h1 class="mt-6 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              {{ activeContent.title }}
            </h1>
            <p class="mt-5 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              {{ activeContent.description }}
            </p>
            <p class="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">
              {{ activeContent.updated }}
            </p>
          </div>
          <aside class="rounded-[30px] border border-slate-200/80 bg-slate-50/88 p-6 dark:border-slate-800 dark:bg-slate-950/50">
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ activeContent.summaryTitle }}
            </p>
            <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {{ activeContent.summary }}
            </p>
            <p class="mt-5 rounded-2xl bg-white p-4 text-xs leading-6 text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
              {{ activeContent.note }}
            </p>
          </aside>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6 lg:px-8">
      <div class="mx-auto grid max-w-6xl gap-5 lg:grid-cols-2">
        <article
          v-for="section in activeContent.sections"
          :key="section.title"
          class="rounded-[30px] border border-white/70 bg-white/84 p-6 shadow-lg shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none sm:p-7"
        >
          <div class="flex items-start gap-4">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
              <component :is="section.icon" class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-xl font-semibold text-slate-950 dark:text-white">
                {{ section.title }}
              </h2>
              <p
                v-for="paragraph in section.paragraphs"
                :key="paragraph"
                class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-[15px]"
              >
                {{ paragraph }}
              </p>
              <ul v-if="section.bullets" class="mt-4 space-y-2">
                <li
                  v-for="bullet in section.bullets"
                  :key="bullet"
                  class="flex gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300"
                >
                  <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                  <span>{{ bullet }}</span>
                </li>
              </ul>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
