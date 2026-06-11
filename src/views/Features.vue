<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  BadgeCheck,
  Cloud,
  Crown,
  FileCheck2,
  FileStack,
  Images,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  ScanText,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import ProBadge from '@/components/common/ProBadge.vue'
import { useSiteConfigStore } from '@/stores/siteConfig'

const { locale } = useI18n()
const router = useRouter()
const siteConfigStore = useSiteConfigStore()

const zh = computed(() => locale.value.startsWith('zh'))

const copy = computed(() => zh.value
  ? {
      eyebrow: '功能特性',
      title: '把 PDF 日常工作做得更顺手，而不是更复杂',
      description: 'PDF-Flow 把常用处理、云端增强和 AI 能力放进同一套清晰流程里。免费功能适合快速处理，Pro 能力适合大文件、长任务和需要服务器参与的工作。',
      start: '开始使用',
      pricing: '查看定价',
      freeLabel: '免费功能',
      proLabel: 'Pro 增强',
      freeTitle: '免费功能适合快速完成日常处理',
      freeDesc: '小文件和常见 PDF 操作优先在浏览器内完成，打开就能用，速度快，也更少涉及上传。',
      proTitle: 'Pro 适合更重、更长、更需要云端能力的工作',
      proDesc: '当任务需要 OCR、Office 转换、AI 分析、批量或大文件处理时，云端能力会让流程更稳定、更省心。',
      workflowTitle: '一套清晰的处理流程',
      workflowDesc: '选择工具、上传文件、确认设置、获取结果，每个页面都保持相似节奏。用户不需要在每个功能里重新学习一遍。',
      trustTitle: '为什么不是所有任务都默认走云端？',
      trustDesc: '小文件本地处理通常更快，因为省去了上传和下载。Pro 云端的价值在大文件、长任务、高级格式转换和浏览器性能不足时体现出来。我们会在界面里说明适合场景，而不是用模糊承诺骗用户。',
      ctaTitle: '先用免费功能跑通日常，再在需要时升级 Pro',
      ctaDesc: '如果你只是偶尔合并、拆分、压缩 PDF，免费功能已经够用。等 OCR、Office、AI 或大文件处理成为日常，再升级会更自然。',
      freeTools: [
        ['合并 PDF', '把多个 PDF 按顺序合成一个文件。'],
        ['拆分 PDF', '按页码提取需要的内容。'],
        ['压缩 PDF', '在不误导结果的前提下尝试减小体积。'],
        ['旋转页面', '快速修正扫描件或横竖方向。'],
        ['图片转 PDF', '把图片整理成一个 PDF。'],
        ['PDF 转图片', '导出页面图片，本地或 Pro 云端均可选择。'],
        ['添加水印', '给文件加上状态标记或预览水印。'],
      ],
      proTools: [
        ['OCR 文字识别', '从扫描件和图片中提取文字。'],
        ['Office 转 PDF', '把 Word、Excel、PowerPoint 转成 PDF。'],
        ['AI PDF 分析器', '摘要、问答和结构化提取。'],
        ['填写 PDF 表单', '识别表单字段并生成填写后的文件。'],
        ['PDF 标注', '添加文字批注或高亮标记。'],
        ['云端大文件处理', '把大文件和长任务交给云端完成，让浏览器更轻松。'],
      ],
    }
  : {
      eyebrow: 'Features',
      title: 'Make everyday PDF work smoother, not more complicated',
      description: 'PDF-Flow brings core tools, cloud enhancement, and AI workflows into one clear product. Free tools are best for quick local work. Pro is for large files, long jobs, and server-powered tasks.',
      start: 'Start using',
      pricing: 'View pricing',
      freeLabel: 'Free tools',
      proLabel: 'Pro boost',
      freeTitle: 'Free tools are built for fast everyday work',
      freeDesc: 'Small files and common PDF operations run in the browser whenever possible, so they start quickly and avoid unnecessary uploads.',
      proTitle: 'Pro is for heavier work that benefits from cloud power',
      proDesc: 'When a job needs OCR, Office conversion, AI analysis, batch work, or large-file handling, cloud processing makes the flow more reliable.',
      workflowTitle: 'One clear processing flow',
      workflowDesc: 'Pick a tool, upload files, confirm settings, and get the result. Tool pages follow a similar rhythm so users do not relearn the product every time.',
      trustTitle: 'Why not send every task to the cloud?',
      trustDesc: 'Local processing is usually faster for small files because there is no upload or download round trip. Pro cloud matters most for large files, long-running jobs, advanced conversion, and weak browser environments. The product should explain that honestly.',
      ctaTitle: 'Start free, upgrade when Pro becomes useful',
      ctaDesc: 'If you only merge, split, or compress occasionally, the free path may be enough. Upgrade when OCR, Office, AI, or large-file processing becomes part of regular work.',
      freeTools: [
        ['Merge PDF', 'Combine multiple PDFs into one file.'],
        ['Split PDF', 'Extract the pages you need.'],
        ['Compress PDF', 'Try to reduce size without hiding the real result.'],
        ['Rotate pages', 'Fix scanned or sideways pages quickly.'],
        ['Image to PDF', 'Turn images into a PDF document.'],
        ['PDF to images', 'Export pages locally or with Pro cloud.'],
        ['Watermark PDF', 'Add review labels, status marks, or preview watermarks.'],
      ],
      proTools: [
        ['OCR text recognition', 'Extract text from scans and images.'],
        ['Office to PDF', 'Convert Word, Excel, and PowerPoint files.'],
        ['AI PDF analyzer', 'Summaries, Q&A, and structured extraction.'],
        ['Fill PDF forms', 'Detect form fields and create filled PDFs.'],
        ['PDF annotation', 'Add text notes or highlight areas.'],
        ['Cloud large-file processing', 'Move large files and long jobs to the cloud so the browser stays responsive.'],
      ],
    })

const freeIcons = [FileStack, Layers3, Zap, FileCheck2, Images, FileStack, MessageSquareText]
const proIcons = [ScanText, Cloud, Wand2, FileCheck2, MessageSquareText, Crown]

const freeCards = computed(() => copy.value.freeTools.map(([title, desc], index) => ({
  title,
  desc,
  icon: freeIcons[index] || FileCheck2,
})))

const proCards = computed(() => copy.value.proTools.map(([title, desc], index) => ({
  title,
  desc,
  icon: proIcons[index] || Crown,
})))

onMounted(() => {
  siteConfigStore.fetchPublicConfig()
})
</script>

<template>
  <div class="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_0%_0%,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_100%_10%,rgba(245,158,11,0.16),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_0%_0%,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_100%_10%,rgba(245,158,11,0.12),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
    <section class="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
      <div class="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div class="rounded-[38px] border border-white/70 bg-white/88 p-8 shadow-2xl shadow-sky-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/78 dark:shadow-none sm:p-10">
          <div class="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
            <Sparkles class="h-4 w-4" />
            {{ copy.eyebrow }}
          </div>
          <h1 class="mt-6 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {{ copy.title }}
          </h1>
          <p class="mt-5 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ copy.description }}
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" class="rounded-full px-6" @click="router.push('/')">
              {{ copy.start }}
            </Button>
            <Button variant="outline" size="lg" class="rounded-full px-6" @click="router.push('/pricing')">
              {{ copy.pricing }}
            </Button>
          </div>
        </div>

        <div class="grid gap-4">
          <article class="rounded-[34px] border border-white/70 bg-white/82 p-6 shadow-xl shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <ShieldCheck class="h-5 w-5" />
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-950 dark:text-white">{{ copy.freeTitle }}</p>
                <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ copy.freeDesc }}</p>
              </div>
            </div>
          </article>

          <article class="rounded-[34px] border border-amber-200/80 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_58%,#ecfeff_100%)] p-6 shadow-xl shadow-amber-100/50 backdrop-blur dark:border-amber-300/20 dark:bg-[linear-gradient(135deg,rgba(120,53,15,0.28)_0%,rgba(15,23,42,0.84)_60%,rgba(8,47,73,0.34)_100%)] dark:shadow-none">
            <div class="flex items-start gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                <Crown class="h-5 w-5" />
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-sm font-semibold text-slate-950 dark:text-white">{{ copy.proTitle }}</p>
                  <ProBadge compact />
                </div>
                <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ copy.proDesc }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div class="rounded-[36px] border border-white/70 bg-white/86 p-6 shadow-xl shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/72 dark:shadow-none sm:p-8">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">{{ copy.freeLabel }}</p>
            <h2 class="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{{ copy.freeTitle }}</h2>
          </div>
          <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{{ copy.freeLabel }}</span>
        </div>

        <div class="mt-6 grid gap-3">
          <article
            v-for="card in freeCards"
            :key="card.title"
            class="flex gap-3 rounded-[24px] border border-slate-200/80 bg-slate-50/82 p-4 dark:border-slate-800 dark:bg-slate-950/45"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300">
              <component :is="card.icon" class="h-5 w-5" />
            </div>
            <div>
              <h3 class="font-semibold text-slate-950 dark:text-white">{{ card.title }}</h3>
              <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ card.desc }}</p>
            </div>
          </article>
        </div>
      </div>

      <div class="rounded-[36px] border border-amber-200/80 bg-white/88 p-6 shadow-xl shadow-amber-100/50 backdrop-blur dark:border-amber-300/20 dark:bg-slate-900/72 dark:shadow-none sm:p-8">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600 dark:text-amber-300">{{ copy.proLabel }}</p>
            <h2 class="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{{ copy.proTitle }}</h2>
          </div>
          <ProBadge />
        </div>

        <div class="mt-6 grid gap-3">
          <article
            v-for="card in proCards"
            :key="card.title"
            class="flex gap-3 rounded-[24px] border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-300/20 dark:bg-amber-500/10"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-200">
              <component :is="card.icon" class="h-5 w-5" />
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-semibold text-slate-950 dark:text-white">{{ card.title }}</h3>
                <ProBadge compact />
              </div>
              <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ card.desc }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article class="rounded-[36px] border border-white/70 bg-white/84 p-8 shadow-xl shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/72 dark:shadow-none">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
            <BadgeCheck class="h-5 w-5" />
          </div>
          <h2 class="mt-5 text-2xl font-semibold text-slate-950 dark:text-white">{{ copy.workflowTitle }}</h2>
          <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ copy.workflowDesc }}</p>
        </article>

        <article class="rounded-[36px] bg-[linear-gradient(135deg,#0f172a_0%,#164e63_48%,#92400e_100%)] p-8 text-white shadow-2xl shadow-slate-900/20">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-amber-100">
            <LockKeyhole class="h-5 w-5" />
          </div>
          <h2 class="mt-5 text-2xl font-semibold">{{ copy.trustTitle }}</h2>
          <p class="mt-3 text-sm leading-7 text-white/78">{{ copy.trustDesc }}</p>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <div class="rounded-[38px] bg-[linear-gradient(135deg,#0369a1_0%,#0f766e_52%,#f59e0b_100%)] p-8 text-white shadow-2xl shadow-sky-900/20 sm:p-10">
        <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h2 class="text-3xl font-semibold sm:text-4xl">{{ copy.ctaTitle }}</h2>
            <p class="mt-4 max-w-3xl text-sm leading-7 text-white/82 sm:text-base">{{ copy.ctaDesc }}</p>
          </div>
          <div class="flex flex-wrap gap-3 lg:justify-end">
            <Button variant="outline" size="lg" class="rounded-full border-white text-white hover:bg-white hover:text-slate-950" @click="router.push('/')">
              {{ copy.start }}
            </Button>
            <Button variant="ghost" size="lg" class="rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/18" @click="router.push('/pricing')">
              {{ copy.pricing }}
            </Button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
