<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  Building2,
  CheckCircle2,
  Cloud,
  Crown,
  FileText,
  LockKeyhole,
  Receipt,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import ProBadge from '@/components/common/ProBadge.vue'
import { useUserStore } from '@/stores/user'

type PlanId = 'free' | 'pro' | 'enterprise'
type ButtonVariant = 'primary' | 'outline' | 'ghost'

interface Plan {
  id: PlanId
  name: string
  eyebrow: string
  price: string
  period: string
  description: string
  bestFor: string
  features: string[]
  notes: string[]
  cta: string
  variant: ButtonVariant
  highlighted?: boolean
  current?: boolean
}

const router = useRouter()
const userStore = useUserStore()
const { locale } = useI18n()

const isChinese = computed(() => locale.value.toLowerCase().startsWith('zh'))
const currentTier = computed(() => userStore.user?.role || 'free')

const copy = computed(() => {
  if (isChinese.value) {
    return {
      eyebrow: '定价',
      title: '按实际使用选择套餐，不为暂时用不到的能力付费',
      description: '免费功能适合日常轻量处理。Pro 面向更大的文件、更长的任务，以及 OCR、Office、AI、表单、标注等需要云端能力的工作。',
      freeName: '免费',
      freeEyebrow: '日常 PDF 工具',
      freePeriod: '永久免费开始',
      freeDescription: '适合偶尔处理 PDF、快速完成合并拆分和轻量压缩。',
      freeBestFor: '个人轻量使用',
      freeCta: '开始免费使用',
      proName: 'Pro',
      proEyebrow: '云端增强与专业能力',
      proPeriod: '按月订阅',
      proDescription: '适合频繁处理文档、需要 OCR / Office / AI，或经常遇到大文件和长任务的用户。',
      proBestFor: '高频文档工作',
      proCta: '升级 Pro',
      enterpriseName: '企业',
      enterpriseEyebrow: '团队与集成',
      enterprisePrice: '按需',
      enterprisePeriod: '联系确认',
      enterpriseDescription: '适合团队统一使用、需要集成、权限控制或更稳定交付支持的场景。',
      enterpriseBestFor: '团队与业务流程',
      enterpriseCta: '联系咨询',
      currentPlan: '当前套餐',
      popular: '推荐',
      featuresLabel: '包含能力',
      notesLabel: '适合场景',
      cloudTitle: '为什么小文件本地反而更快？',
      cloudBody: '本地处理省去了上传、排队和下载，小文件通常会更快。Pro 云端的价值不在于每个小任务都抢时间，而在于把浏览器不擅长的重任务交给服务器：大文件、长任务、批量处理、OCR、Office 转换、AI 分析和弱设备场景会更稳定。',
      promiseTitle: 'Pro 的意义',
      promiseBody: '我们会把适合本地的任务留在本地，把适合云端的任务交给云端。以后新增 Pro 能力时，也会优先放在“云端更稳、更省心”的场景，而不是制造没有必要的上传等待。',
      faqTitle: '常见问题',
      faqSubtitle: '把购买前最容易犹豫的地方说清楚。',
      ctaTitle: '先免费跑通流程，再在需要时升级 Pro',
      ctaBody: '如果你的文件很小、只是偶尔处理，免费版已经能完成很多工作。当 OCR、Office、AI 或大文件成为日常，Pro 会更有价值。',
      authHint: '登录后可继续升级或查看当前套餐。',
      paymentFailed: '暂时无法打开支付页面，请稍后重试或通过反馈告诉我们。',
      freeFeatures: ['合并、拆分、旋转 PDF', '轻量压缩与常用导出', '图片转 PDF、PDF 转图片', '本地优先处理，减少不必要上传'],
      freeNotes: ['偶尔处理文件', '小文件优先追求速度', '先验证产品是否适合你'],
      proFeatures: ['OCR 文字识别', 'Office 转 PDF', 'AI PDF 分析器', 'PDF 表单填写与标注', '大文件与长任务云端处理'],
      proNotes: ['频繁处理 PDF', '浏览器处理吃力的大文件', '需要服务器能力的专业任务'],
      enterpriseFeatures: ['团队使用与权限规划', '更高额度与稳定性支持', '业务流程或 API 接入', '专属上线与维护建议'],
      enterpriseNotes: ['多人协作', '内部流程接入', '需要更明确的支持响应'],
      faq: [
        ['Pro 云端一定比本地快吗？', '不一定。小文件本地通常更快；大文件、长任务、OCR、Office、AI 等任务更适合 Pro 云端。'],
        ['免费功能会上传文件吗？', '本地处理优先在浏览器内完成。只有你主动选择云端能力，文件才会上传到服务器处理。'],
        ['我可以先免费试用吗？', '可以。建议先用免费功能确认流程，再根据真实需求决定是否升级。'],
        ['企业版适合谁？', '适合团队统一使用、需要更高额度、权限管理、流程接入或稳定支持的用户。'],
      ],
    }
  }

  return {
    eyebrow: 'Pricing',
    title: 'Choose by real usage, not by features you do not need yet',
    description: 'Free covers lightweight everyday PDF work. Pro is for larger files, longer jobs, and cloud-powered OCR, Office, AI, forms, and annotation workflows.',
    freeName: 'Free',
    freeEyebrow: 'Everyday PDF tools',
    freePeriod: 'Start forever',
    freeDescription: 'For occasional PDF work such as merging, splitting, rotating, and lightweight compression.',
    freeBestFor: 'Light personal use',
    freeCta: 'Start free',
    proName: 'Pro',
    proEyebrow: 'Cloud boost and advanced tools',
    proPeriod: 'Monthly subscription',
    proDescription: 'For frequent document work, OCR / Office / AI tasks, large files, and long-running jobs.',
    proBestFor: 'Frequent document work',
    proCta: 'Upgrade to Pro',
    enterpriseName: 'Enterprise',
    enterpriseEyebrow: 'Teams and integration',
    enterprisePrice: 'Custom',
    enterprisePeriod: 'Contact us',
    enterpriseDescription: 'For teams that need shared access, workflow integration, permissions, or delivery support.',
    enterpriseBestFor: 'Teams and workflows',
    enterpriseCta: 'Contact sales',
    currentPlan: 'Current plan',
    popular: 'Recommended',
    featuresLabel: 'Included',
    notesLabel: 'Best for',
    cloudTitle: 'Why can local processing be faster for small files?',
    cloudBody: 'Local work avoids upload, queue, and download time, so small files often finish faster in the browser. Pro cloud is valuable when the browser is the wrong place for the job: large files, long tasks, batch work, OCR, Office conversion, AI analysis, and weaker devices.',
    promiseTitle: 'What Pro is meant to do',
    promiseBody: 'We keep simple tasks local when that is better, and use cloud processing where it is more stable and useful. Future Pro features should follow the same principle: fewer browser limits, more reliable heavy workflows.',
    faqTitle: 'Questions',
    faqSubtitle: 'Clear answers before you upgrade.',
    ctaTitle: 'Start free, upgrade when Pro becomes useful',
    ctaBody: 'If your files are small and your usage is occasional, Free may already cover a lot. When OCR, Office, AI, or large files become routine, Pro becomes more valuable.',
    authHint: 'Sign in to upgrade or view your current plan.',
    paymentFailed: 'We could not open checkout. Please try again later or send feedback.',
    freeFeatures: ['Merge, split, and rotate PDFs', 'Light compression and everyday export', 'Image to PDF and PDF to images', 'Local-first processing when possible'],
    freeNotes: ['Occasional file work', 'Small files where speed matters', 'Trying the product first'],
    proFeatures: ['OCR text recognition', 'Office to PDF', 'AI PDF analyzer', 'PDF form filling and annotation', 'Cloud processing for large and long jobs'],
    proNotes: ['Frequent PDF work', 'Large files that strain the browser', 'Professional tasks that need server power'],
    enterpriseFeatures: ['Team access planning', 'Higher usage and stability support', 'Workflow or API integration', 'Launch and maintenance guidance'],
    enterpriseNotes: ['Multi-user teams', 'Internal workflow adoption', 'Clearer support expectations'],
    faq: [
      ['Is Pro cloud always faster than local?', 'No. Small files are often faster locally. Pro cloud is better for large files, long jobs, OCR, Office, and AI workflows.'],
      ['Do free tools upload my files?', 'Local tools try to run in the browser. Files are uploaded only when you choose a cloud-powered workflow.'],
      ['Can I start without paying?', 'Yes. Use the free tools first, then upgrade when the advanced workflows matter.'],
      ['Who is Enterprise for?', 'Teams that need shared usage, higher limits, access planning, workflow integration, or support expectations.'],
    ],
  }
})

const plans = computed<Plan[]>(() => [
  {
    id: 'free',
    name: copy.value.freeName,
    eyebrow: copy.value.freeEyebrow,
    price: '$0',
    period: copy.value.freePeriod,
    description: copy.value.freeDescription,
    bestFor: copy.value.freeBestFor,
    features: copy.value.freeFeatures,
    notes: copy.value.freeNotes,
    cta: currentTier.value === 'free' ? copy.value.currentPlan : copy.value.freeCta,
    variant: 'outline',
    current: currentTier.value === 'free',
  },
  {
    id: 'pro',
    name: copy.value.proName,
    eyebrow: copy.value.proEyebrow,
    price: '$9.9',
    period: copy.value.proPeriod,
    description: copy.value.proDescription,
    bestFor: copy.value.proBestFor,
    features: copy.value.proFeatures,
    notes: copy.value.proNotes,
    cta: currentTier.value === 'pro' ? copy.value.currentPlan : copy.value.proCta,
    variant: 'primary',
    highlighted: true,
    current: currentTier.value === 'pro',
  },
  {
    id: 'enterprise',
    name: copy.value.enterpriseName,
    eyebrow: copy.value.enterpriseEyebrow,
    price: copy.value.enterprisePrice,
    period: copy.value.enterprisePeriod,
    description: copy.value.enterpriseDescription,
    bestFor: copy.value.enterpriseBestFor,
    features: copy.value.enterpriseFeatures,
    notes: copy.value.enterpriseNotes,
    cta: currentTier.value === 'enterprise' || currentTier.value === 'admin'
      ? copy.value.currentPlan
      : copy.value.enterpriseCta,
    variant: 'outline',
    current: currentTier.value === 'enterprise' || currentTier.value === 'admin',
  },
])

const proofCards = computed(() => [
  {
    icon: Zap,
    title: isChinese.value ? '小文件优先本地' : 'Local first for small files',
    body: isChinese.value ? '减少上传等待，日常操作更直接。' : 'Avoid upload overhead for everyday work.',
  },
  {
    icon: Cloud,
    title: isChinese.value ? '重任务交给云端' : 'Cloud for heavier work',
    body: isChinese.value ? '大文件、长任务和专业能力更稳定。' : 'More stable for large files and advanced workflows.',
  },
  {
    icon: ShieldCheck,
    title: isChinese.value ? '清楚说明处理方式' : 'Clear processing choices',
    body: isChinese.value ? '用户能看懂本地和云端的区别。' : 'Users can understand local versus cloud tradeoffs.',
  },
])

const handleCTA = async (plan: Plan) => {
  if (plan.current) {
    router.push('/auth/profile')
    return
  }

  if (plan.id === 'free') {
    router.push('/')
    return
  }

  if (plan.id === 'enterprise') {
    window.location.href = 'mailto:sales@pdf-flow.com?subject=PDF-Flow Enterprise'
    return
  }

  if (!userStore.isAuthenticated) {
    router.push('/auth/login?redirect=/pricing')
    return
  }

  try {
    const { paymentAPI } = await import('@/services/api')
    const response = await paymentAPI.createCheckoutSession({
      plan: 'monthly',
      success_url: `${window.location.origin}/payment/success`,
      cancel_url: `${window.location.origin}/payment/cancel`,
    })
    window.location.href = response.checkout_url
  } catch (error) {
    console.error('Failed to create checkout session:', error)
    window.alert(copy.value.paymentFailed)
  }
}
</script>

<template>
  <div class="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_0%_0%,rgba(14,165,233,0.16),transparent_30%),radial-gradient(circle_at_100%_0%,rgba(245,158,11,0.18),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef7ff_45%,#fff7ed_100%)] px-4 pb-20 pt-16 dark:bg-[radial-gradient(circle_at_0%_0%,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_100%_0%,rgba(245,158,11,0.12),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <section class="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
        <div class="rounded-[40px] border border-white/70 bg-white/88 p-8 shadow-2xl shadow-sky-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/78 dark:shadow-none sm:p-10">
          <div class="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
            <Sparkles class="h-4 w-4" />
            {{ copy.eyebrow }}
          </div>
          <h1 class="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {{ copy.title }}
          </h1>
          <p class="mt-5 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ copy.description }}
          </p>

          <div class="mt-8 grid gap-3 sm:grid-cols-3">
            <article
              v-for="card in proofCards"
              :key="card.title"
              class="rounded-[26px] border border-slate-200/80 bg-slate-50/82 p-4 dark:border-slate-800 dark:bg-slate-950/45"
            >
              <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm dark:bg-slate-900 dark:text-sky-300">
                <component :is="card.icon" class="h-5 w-5" />
              </div>
              <h2 class="mt-4 text-sm font-semibold text-slate-950 dark:text-white">
                {{ card.title }}
              </h2>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {{ card.body }}
              </p>
            </article>
          </div>
        </div>

        <aside class="rounded-[40px] bg-[linear-gradient(135deg,#0f172a_0%,#164e63_46%,#92400e_100%)] p-8 text-white shadow-2xl shadow-slate-900/20 sm:p-10">
          <div class="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/12 text-amber-100">
            <Crown class="h-6 w-6" />
          </div>
          <h2 class="mt-6 text-3xl font-semibold">
            {{ copy.promiseTitle }}
          </h2>
          <p class="mt-4 text-sm leading-7 text-white/78">
            {{ copy.promiseBody }}
          </p>
          <div class="mt-6 rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur">
            <div class="flex items-center gap-2">
              <ProBadge tone="dark" />
              <span class="text-sm font-semibold">{{ copy.proBestFor }}</span>
            </div>
            <p class="mt-3 text-sm leading-7 text-white/76">
              {{ copy.cloudBody }}
            </p>
          </div>
        </aside>
      </section>

      <section class="mt-10 grid gap-6 xl:grid-cols-3">
        <article
          v-for="plan in plans"
          :key="plan.id"
          :class="[
            'relative overflow-hidden rounded-[36px] border bg-white/88 p-7 shadow-2xl backdrop-blur dark:bg-slate-900/76',
            plan.highlighted
              ? 'border-amber-200 shadow-amber-100/70 dark:border-amber-300/20 dark:shadow-none xl:-translate-y-3'
              : 'border-white/70 shadow-slate-100/60 dark:border-white/10 dark:shadow-none',
          ]"
        >
          <div
            v-if="plan.highlighted"
            class="absolute right-5 top-5 rounded-full bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_100%)] px-3 py-1 text-xs font-semibold text-white shadow-lg"
          >
            {{ copy.popular }}
          </div>

          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <Sparkles v-if="plan.id === 'free'" class="h-5 w-5" />
            <Crown v-else-if="plan.id === 'pro'" class="h-5 w-5" />
            <Building2 v-else class="h-5 w-5" />
          </div>

          <div class="mt-5 flex flex-wrap items-center gap-2">
            <h2 class="text-2xl font-semibold text-slate-950 dark:text-white">
              {{ plan.name }}
            </h2>
            <ProBadge v-if="plan.id === 'pro'" tone="ivory" />
          </div>
          <p class="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {{ plan.eyebrow }}
          </p>
          <p class="mt-4 min-h-[72px] text-sm leading-7 text-slate-600 dark:text-slate-300">
            {{ plan.description }}
          </p>

          <div class="mt-6 rounded-[28px] bg-slate-50/90 p-5 dark:bg-slate-950/50">
            <div class="flex items-end gap-2">
              <span class="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {{ plan.price }}
              </span>
            </div>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {{ plan.period }}
            </p>
          </div>

          <div
            v-if="plan.current"
            class="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            {{ copy.currentPlan }}
          </div>

          <Button
            :variant="plan.variant"
            size="lg"
            full-width
            class="mt-5 rounded-2xl"
            @click="handleCTA(plan)"
          >
            {{ plan.cta }}
          </Button>

          <div class="mt-7">
            <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {{ copy.featuresLabel }}
            </h3>
            <ul class="mt-4 space-y-3">
              <li
                v-for="feature in plan.features"
                :key="feature"
                class="flex items-start gap-3"
              >
                <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <span class="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ feature }}
                </span>
              </li>
            </ul>
          </div>

          <div class="mt-6 rounded-[26px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <h3 class="text-sm font-semibold text-slate-950 dark:text-white">
              {{ copy.notesLabel }}: {{ plan.bestFor }}
            </h3>
            <ul class="mt-3 space-y-2">
              <li
                v-for="note in plan.notes"
                :key="note"
                class="text-xs leading-6 text-slate-500 dark:text-slate-400"
              >
                {{ note }}
              </li>
            </ul>
          </div>
        </article>
      </section>

      <section class="mt-12 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article class="rounded-[36px] border border-white/70 bg-white/86 p-8 shadow-2xl shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/72 dark:shadow-none sm:p-10">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
            <Cloud class="h-5 w-5" />
          </div>
          <h2 class="mt-5 text-2xl font-semibold text-slate-950 dark:text-white">
            {{ copy.cloudTitle }}
          </h2>
          <p class="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {{ copy.cloudBody }}
          </p>
        </article>

        <article class="rounded-[36px] border border-white/70 bg-white/86 p-8 shadow-2xl shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/72 dark:shadow-none sm:p-10">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                {{ copy.faqTitle }}
              </p>
              <h2 class="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                {{ copy.faqSubtitle }}
              </h2>
            </div>
            <div class="flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
              <LockKeyhole class="h-4 w-4" />
              {{ copy.authHint }}
            </div>
          </div>

          <div class="mt-7 grid gap-4 md:grid-cols-2">
            <div
              v-for="[question, answer] in copy.faq"
              :key="question"
              class="rounded-[26px] border border-slate-200/80 bg-slate-50/78 p-5 dark:border-slate-800 dark:bg-slate-950/45"
            >
              <h3 class="font-semibold text-slate-950 dark:text-white">
                {{ question }}
              </h3>
              <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {{ answer }}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section class="mt-12 rounded-[40px] bg-[linear-gradient(135deg,#0369a1_0%,#0f766e_52%,#f59e0b_100%)] p-8 text-white shadow-2xl shadow-sky-900/20 sm:p-10">
        <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-semibold">
              <Receipt class="h-4 w-4" />
              {{ copy.eyebrow }}
            </div>
            <h2 class="mt-5 text-3xl font-semibold sm:text-4xl">
              {{ copy.ctaTitle }}
            </h2>
            <p class="mt-4 max-w-3xl text-sm leading-7 text-white/82 sm:text-base">
              {{ copy.ctaBody }}
            </p>
          </div>
          <div class="flex flex-wrap gap-3 lg:justify-end">
            <Button variant="outline" size="lg" class="rounded-full border-white text-white hover:bg-white hover:text-slate-950" @click="router.push('/')">
              {{ copy.freeCta }}
            </Button>
            <Button variant="ghost" size="lg" class="rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/18" @click="router.push('/features')">
              <FileText class="mr-2 h-4 w-4" />
              {{ isChinese ? '查看功能' : 'View features' }}
            </Button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
