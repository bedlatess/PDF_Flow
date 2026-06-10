<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  Blocks,
  CheckCircle2,
  Cloud,
  Gauge,
  Globe2,
  LayoutPanelTop,
  Lock,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-vue-next'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'

const { t, locale } = useI18n()
const router = useRouter()
const activeLocale = computed(() => locale.value)

const pageCopy = computed(() => {
  if (locale.value === 'zh') {
    return {
      heroEyebrow: '\u4e3a\u771f\u5b9e\u6587\u6863\u5de5\u4f5c\u800c\u8bbe\u8ba1',
      supportTitle: '\u4f60\u4f1a\u5148\u611f\u53d7\u5230\u7684\u4e09\u4ef6\u4e8b',
      supportDescription: '\u4ece\u7b2c\u4e00\u4e2a\u6587\u4ef6\u5f00\u59cb\uff0c\u5c31\u80fd\u611f\u53d7\u5230\u66f4\u6e05\u6670\u3001\u66f4\u5b89\u5fc3\u7684 PDF \u5de5\u4f5c\u6d41\u7a0b\u3002',
      summaryPrivacy: '\u57fa\u7840\u5904\u7406\u5c3d\u91cf\u4e0d\u79bb\u5f00\u8bbe\u5907\u3002',
      summarySpeed: '\u8fdb\u5ea6\u53cd\u9988\u66f4\u6e05\u695a\uff0c\u957f\u4efb\u52a1\u4e5f\u4e0d\u4f1a\u53ea\u5269\u7b49\u5f85\u3002',
      summaryCloud: '\u9700\u8981 OCR \u6216 Office \u8f6c\u6362\u65f6\u518d\u89e3\u9501\u4e91\u7aef\u80fd\u529b\u3002',
      usageTitle: '\u9002\u5408\u4ece\u54ea\u91cc\u5f00\u59cb',
      usageDescription: '\u65e5\u5e38\u5408\u5e76\u3001\u62c6\u5206\u3001\u538b\u7f29\u53ef\u76f4\u63a5\u4f7f\u7528\uff0c\u8fdb\u9636\u80fd\u529b\u5728\u767b\u5f55\u540e\u6309\u9700\u5f00\u542f\u3002',
      valueTitle: '\u7528\u8d77\u6765\u4f1a\u66f4\u4e0d\u4e00\u6837',
      valueDescription: '\u4e0d\u7528\u5728\u591a\u4e2a\u5165\u53e3\u4e4b\u95f4\u6765\u56de\u5207\u6362\uff0c\u4e0a\u4f20\u3001\u5904\u7406\u548c\u4e0b\u8f7d\u90fd\u66f4\u8fde\u8d2f\u3002',
      technicalEyebrow: '\u5de5\u4f5c\u65b9\u5f0f',
      technicalDescription: '\u524d\u7aef\u4f53\u9a8c\u4fdd\u6301\u8f7b\u5feb\uff0c\u9700\u8981\u65f6\u518d\u7531\u540e\u7aef\u63a5\u624b\u957f\u4efb\u52a1\u548c\u4e91\u7aef\u80fd\u529b\u3002',
      comparisonEyebrow: '\u4e3a\u4ec0\u4e48\u56e2\u961f\u4f1a\u9009\u5b83',
      comparisonDescription: '\u771f\u6b63\u62c9\u5f00\u5dee\u8ddd\u7684\uff0c\u5f80\u5f80\u4e0d\u662f\u529f\u80fd\u540d\u5b57\u672c\u8eab\uff0c\u800c\u662f\u4f7f\u7528\u65f6\u7684\u8fde\u8d2f\u611f\u548c\u53ef\u89c2\u6d4b\u6027\u3002',
      yes: '\u662f',
      no: '\u5426',
      ctaEyebrow: '\u4ece\u7b2c\u4e00\u4e2a\u6587\u4ef6\u5f00\u59cb',
      ctaTitle: '\u5148\u7528\u57fa\u7840 PDF \u5de5\u5177\uff0c\u9700\u8981\u65f6\u518d\u5347\u7ea7',
      ctaDescription: '\u5148\u611f\u53d7\u5408\u5e76\u3001\u62c6\u5206\u3001\u538b\u7f29\u7b49\u65e5\u5e38\u6d41\u7a0b\uff0c\u5982\u679c\u4f60\u771f\u7684\u9700\u8981 OCR\u3001Office \u8f6c\u6362\u6216 AI \u5206\u6790\uff0c\u518d\u89e3\u9501\u5bf9\u5e94\u80fd\u529b\u3002',
      ctaPointA: '\u6e38\u5ba2\u53ef\u4ee5\u5148\u4f53\u9a8c\u57fa\u7840\u5de5\u5177',
      ctaPointB: '\u9ad8\u7ea7\u80fd\u529b\u8d70\u767b\u5f55\u540e\u6309\u9700\u5f00\u901a\u8def\u5f84',
    }
  }

  if (locale.value === 'es') {
    return {
      heroEyebrow: 'Pensado para trabajo real',
      supportTitle: 'Lo primero que se nota',
      supportDescription: 'Desde el primer archivo se siente un flujo PDF mas claro, mas tranquilo y mas facil de seguir.',
      summaryPrivacy: 'El trabajo esencial se mantiene local siempre que sea posible.',
      summarySpeed: 'El progreso es visible y las tareas largas no se convierten en espera ciega.',
      summaryCloud: 'OCR, Office y otras funciones avanzadas se activan solo cuando realmente hacen falta.',
      usageTitle: 'Donde suele encajar mejor',
      usageDescription: 'Combinar, dividir y comprimir se pueden usar enseguida; los flujos avanzados se abren tras iniciar sesion.',
      valueTitle: 'Se siente mas continuo',
      valueDescription: 'Subida, proceso y descarga viven en el mismo espacio en lugar de repartir el trabajo entre pantallas sueltas.',
      technicalEyebrow: 'Como funciona',
      technicalDescription: 'La interfaz se mantiene ligera y el backend entra cuando la tarea necesita tiempo, colas o servicios en la nube.',
      comparisonEyebrow: 'Por que destaca',
      comparisonDescription: 'La diferencia real no suele estar en el nombre de la funcion, sino en la claridad del flujo cuando la usas.',
      yes: 'Si',
      no: 'No',
      ctaEyebrow: 'Empieza por lo esencial',
      ctaTitle: 'Usa primero las herramientas base y amplia despues',
      ctaDescription: 'Prueba las tareas PDF mas comunes y activa OCR, Office o IA solo cuando ese trabajo pase a formar parte de tu rutina.',
      ctaPointA: 'Las herramientas base se pueden probar de inmediato',
      ctaPointB: 'Las funciones avanzadas siguen un acceso mas claro tras iniciar sesion',
    }
  }

  return {
    heroEyebrow: 'Built for real document work',
    supportTitle: 'What people notice first',
    supportDescription: 'From the first file onward, the experience feels calmer, clearer, and easier to trust.',
    summaryPrivacy: 'Core work stays local whenever it can.',
    summarySpeed: 'Progress stays visible instead of turning long tasks into guesswork.',
    summaryCloud: 'OCR, Office, and other advanced flows unlock only when they are actually needed.',
    usageTitle: 'Where it fits best',
    usageDescription: 'Merge, split, and compress are ready immediately, while advanced cloud flows open after sign-in.',
    valueTitle: 'The workflow feels cleaner',
    valueDescription: 'Upload, processing, and download stay inside one workspace instead of bouncing between disconnected screens.',
    technicalEyebrow: 'How it works',
    technicalDescription: 'The interface stays light, while the backend only steps in when a task needs queueing, time, or cloud services.',
    comparisonEyebrow: 'Why teams choose it',
    comparisonDescription: 'The real difference is rarely the feature name itself. It is how understandable the workflow feels while you are using it.',
    yes: 'Yes',
    no: 'No',
    ctaEyebrow: 'Start with the essentials',
    ctaTitle: 'Use the core PDF tools first, expand only when you need more',
    ctaDescription: 'Begin with the everyday PDF flow, then unlock OCR, Office conversion, or AI when those tasks become part of regular work.',
    ctaPointA: 'Core tools are ready to try immediately',
    ctaPointB: 'Advanced capabilities follow a clearer sign-in path',
  }
})

const heroBadges = computed(() => [
  { label: t('marketing.featuresPage.coreFeatures.privacy.title'), icon: ShieldCheck, tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300' },
  { label: t('marketing.featuresPage.coreFeatures.speed.title'), icon: Zap, tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
  { label: t('marketing.featuresPage.coreFeatures.cloud.title'), icon: Cloud, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' },
])

const summaryCards = computed(() => [
  {
    icon: ShieldCheck,
    title: t('marketing.featuresPage.coreFeatures.privacy.title'),
    body: pageCopy.value.summaryPrivacy,
  },
  {
    icon: Zap,
    title: t('marketing.featuresPage.coreFeatures.speed.title'),
    body: pageCopy.value.summarySpeed,
  },
  {
    icon: Cloud,
    title: t('marketing.featuresPage.coreFeatures.cloud.title'),
    body: pageCopy.value.summaryCloud,
  },
])

const coreFeatures = computed(() => [
  {
    icon: ShieldCheck,
    title: t('marketing.featuresPage.coreFeatures.privacy.title'),
    description: t('marketing.featuresPage.coreFeatures.privacy.description'),
    details: [
      t('marketing.featuresPage.coreFeatures.privacy.details.0'),
      t('marketing.featuresPage.coreFeatures.privacy.details.1'),
      t('marketing.featuresPage.coreFeatures.privacy.details.2'),
      t('marketing.featuresPage.coreFeatures.privacy.details.3'),
    ],
    accent: 'from-sky-500/15 to-cyan-500/10',
    iconTone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  },
  {
    icon: Zap,
    title: t('marketing.featuresPage.coreFeatures.speed.title'),
    description: t('marketing.featuresPage.coreFeatures.speed.description'),
    details: [
      t('marketing.featuresPage.coreFeatures.speed.details.0'),
      t('marketing.featuresPage.coreFeatures.speed.details.1'),
      t('marketing.featuresPage.coreFeatures.speed.details.2'),
      t('marketing.featuresPage.coreFeatures.speed.details.3'),
    ],
    accent: 'from-amber-500/15 to-orange-500/10',
    iconTone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  },
  {
    icon: Cloud,
    title: t('marketing.featuresPage.coreFeatures.cloud.title'),
    description: t('marketing.featuresPage.coreFeatures.cloud.description'),
    details: [
      t('marketing.featuresPage.coreFeatures.cloud.details.0'),
      t('marketing.featuresPage.coreFeatures.cloud.details.1'),
      t('marketing.featuresPage.coreFeatures.cloud.details.2'),
      t('marketing.featuresPage.coreFeatures.cloud.details.3'),
    ],
    accent: 'from-emerald-500/15 to-teal-500/10',
    iconTone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  },
  {
    icon: LayoutPanelTop,
    title: t('marketing.featuresPage.coreFeatures.design.title'),
    description: t('marketing.featuresPage.coreFeatures.design.description'),
    details: [
      t('marketing.featuresPage.coreFeatures.design.details.0'),
      t('marketing.featuresPage.coreFeatures.design.details.1'),
      t('marketing.featuresPage.coreFeatures.design.details.2'),
      t('marketing.featuresPage.coreFeatures.design.details.3'),
    ],
    accent: 'from-violet-500/15 to-fuchsia-500/10',
    iconTone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  },
  {
    icon: Globe2,
    title: t('marketing.featuresPage.coreFeatures.languages.title'),
    description: t('marketing.featuresPage.coreFeatures.languages.description'),
    details: [
      t('marketing.featuresPage.coreFeatures.languages.details.0'),
      t('marketing.featuresPage.coreFeatures.languages.details.1'),
      t('marketing.featuresPage.coreFeatures.languages.details.2'),
      t('marketing.featuresPage.coreFeatures.languages.details.3'),
    ],
    accent: 'from-slate-500/12 to-sky-500/10',
    iconTone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  {
    icon: Blocks,
    title: t('marketing.featuresPage.coreFeatures.tools.title'),
    description: t('marketing.featuresPage.coreFeatures.tools.description'),
    details: [
      t('marketing.featuresPage.coreFeatures.tools.details.0'),
      t('marketing.featuresPage.coreFeatures.tools.details.1'),
      t('marketing.featuresPage.coreFeatures.tools.details.2'),
      t('marketing.featuresPage.coreFeatures.tools.details.3'),
    ],
    accent: 'from-rose-500/12 to-orange-500/10',
    iconTone: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  },
])

const technicalFeatures = computed(() => [
  {
    icon: Workflow,
    title: t('marketing.featuresPage.technicalFeatures.stack.title'),
    items: [
      t('marketing.featuresPage.technicalFeatures.stack.items.0'),
      t('marketing.featuresPage.technicalFeatures.stack.items.1'),
      t('marketing.featuresPage.technicalFeatures.stack.items.2'),
      t('marketing.featuresPage.technicalFeatures.stack.items.3'),
    ],
  },
  {
    icon: Lock,
    title: t('marketing.featuresPage.technicalFeatures.security.title'),
    items: [
      t('marketing.featuresPage.technicalFeatures.security.items.0'),
      t('marketing.featuresPage.technicalFeatures.security.items.1'),
      t('marketing.featuresPage.technicalFeatures.security.items.2'),
      t('marketing.featuresPage.technicalFeatures.security.items.3'),
    ],
  },
  {
    icon: Gauge,
    title: t('marketing.featuresPage.technicalFeatures.performance.title'),
    items: [
      t('marketing.featuresPage.technicalFeatures.performance.items.0'),
      t('marketing.featuresPage.technicalFeatures.performance.items.1'),
      t('marketing.featuresPage.technicalFeatures.performance.items.2'),
      t('marketing.featuresPage.technicalFeatures.performance.items.3'),
    ],
  },
  {
    icon: CheckCircle2,
    title: t('marketing.featuresPage.technicalFeatures.quality.title'),
    items: [
      t('marketing.featuresPage.technicalFeatures.quality.items.0'),
      t('marketing.featuresPage.technicalFeatures.quality.items.1'),
      t('marketing.featuresPage.technicalFeatures.quality.items.2'),
      t('marketing.featuresPage.technicalFeatures.quality.items.3'),
    ],
  },
])

const comparisonRows = computed(() => [
  {
    label: t('marketing.featuresPage.comparisonRows.privacy'),
    product: true,
    competitorA: false,
    competitorB: false,
  },
  {
    label: t('marketing.featuresPage.comparisonRows.free'),
    product: true,
    competitorA: t('marketing.featuresPage.comparisonRows.partial'),
    competitorB: false,
  },
  {
    label: t('marketing.featuresPage.comparisonRows.progress'),
    product: true,
    competitorA: false,
    competitorB: false,
  },
  {
    label: t('marketing.featuresPage.comparisonRows.ocr'),
    product: true,
    competitorA: true,
    competitorB: t('marketing.featuresPage.comparisonRows.paid'),
  },
  {
    label: t('marketing.featuresPage.comparisonRows.open'),
    product: true,
    competitorA: false,
    competitorB: false,
  },
  {
    label: t('marketing.featuresPage.comparisonRows.api'),
    product: true,
    competitorA: t('marketing.featuresPage.comparisonRows.expensive'),
    competitorB: true,
  },
])

const renderComparisonValue = (value: boolean | string) => value
</script>

<template>
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_100%_0%,rgba(139,92,246,0.10),transparent_24%),linear-gradient(180deg,#fbf9ff_0%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_100%_0%,rgba(139,92,246,0.11),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]"
    :data-locale="activeLocale"
  >
    <section class="px-4 pb-10 pt-16 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <div class="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div class="rounded-[36px] border border-white/70 bg-white/86 p-8 shadow-2xl shadow-sky-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/74 dark:shadow-none sm:p-10">
            <div class="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-violet-50/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
              <Sparkles class="h-4 w-4" />
              {{ pageCopy.heroEyebrow }}
            </div>

            <h1 class="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              {{ t('marketing.featuresPage.heroTitle') }}
            </h1>
            <p class="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              {{ t('marketing.featuresPage.heroDescription') }}
            </p>

            <div class="mt-8 flex flex-wrap gap-3">
              <div
                v-for="badge in heroBadges"
                :key="badge.label"
                :class="['inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium', badge.tone]"
              >
                <component :is="badge.icon" class="h-4 w-4" />
                {{ badge.label }}
              </div>
            </div>

            <div class="mt-8 flex flex-wrap gap-3">
              <Button
                variant="primary"
                size="lg"
                class="rounded-full px-6"
                @click="router.push('/')"
              >
                {{ t('marketing.featuresPage.startButton') }}
              </Button>
              <Button
                variant="outline"
                size="lg"
                class="rounded-full px-6"
                @click="router.push('/pricing')"
              >
                {{ t('marketing.featuresPage.pricingButton') }}
              </Button>
            </div>
          </div>

          <div class="grid gap-4">
            <div class="rounded-[32px] border border-white/70 bg-[linear-gradient(145deg,#1e1b4b_0%,#6d28d9_48%,#0f172a_100%)] p-6 text-white shadow-xl shadow-violet-900/15 dark:border-white/10 sm:p-7">
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-violet-100/85">
                {{ pageCopy.supportTitle }}
              </p>
              <p class="mt-3 max-w-2xl text-sm leading-7 text-white/82 sm:text-base">
                {{ pageCopy.supportDescription }}
              </p>

              <div class="mt-6 grid gap-3 sm:grid-cols-3">
                <article
                  v-for="card in summaryCards"
                  :key="card.title"
                  class="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur"
                >
                  <component :is="card.icon" class="h-5 w-5 text-violet-100" />
                  <p class="mt-3 text-sm font-semibold text-white">
                    {{ card.title }}
                  </p>
                  <p class="mt-2 text-xs leading-6 text-white/72">
                    {{ card.body }}
                  </p>
                </article>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <article class="rounded-[30px] border border-white/70 bg-white/82 p-6 shadow-lg shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/68 dark:shadow-none">
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {{ pageCopy.usageTitle }}
                </p>
                <h2 class="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                  {{ t('marketing.featuresPage.coreTitle') }}
                </h2>
                <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {{ pageCopy.usageDescription }}
                </p>
              </article>

              <article class="rounded-[30px] border border-white/70 bg-white/82 p-6 shadow-lg shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/68 dark:shadow-none">
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {{ pageCopy.valueTitle }}
                </p>
                <h2 class="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                  {{ t('marketing.featuresPage.comparisonTitle') }}
                </h2>
                <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {{ pageCopy.valueDescription }}
                </p>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 py-10 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card
            v-for="feature in coreFeatures"
            :key="feature.title"
            class="overflow-hidden rounded-[32px] border border-white/70 bg-white/84 shadow-xl shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none"
            padding="none"
          >
            <div :class="['bg-gradient-to-r p-[1px]', feature.accent]">
              <div class="rounded-[31px] bg-white/94 p-6 dark:bg-slate-900/94">
                <div :class="['flex h-12 w-12 items-center justify-center rounded-2xl', feature.iconTone]">
                  <component :is="feature.icon" class="h-5 w-5" />
                </div>
                <h3 class="mt-5 text-xl font-semibold text-slate-950 dark:text-white">
                  {{ feature.title }}
                </h3>
                <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {{ feature.description }}
                </p>

                <ul class="mt-5 space-y-3">
                  <li
                    v-for="detail in feature.details"
                    :key="detail"
                    class="flex items-start gap-3"
                  >
                    <span class="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950">
                      <CheckCircle2 class="h-3.5 w-3.5" />
                    </span>
                    <span class="text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {{ detail }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>

    <section class="px-4 py-10 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl rounded-[36px] border border-white/70 bg-white/82 p-8 shadow-2xl shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none sm:p-10">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              {{ pageCopy.technicalEyebrow }}
            </p>
            <h2 class="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
              {{ t('marketing.featuresPage.technicalTitle') }}
            </h2>
          </div>
          <p class="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            {{ pageCopy.technicalDescription }}
          </p>
        </div>

        <div class="mt-8 grid gap-4 lg:grid-cols-4">
          <article
            v-for="tech in technicalFeatures"
            :key="tech.title"
            class="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 dark:border-slate-800 dark:bg-slate-950/50"
          >
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white">
              <component :is="tech.icon" class="h-5 w-5" />
            </div>
            <h3 class="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
              {{ tech.title }}
            </h3>
            <ul class="mt-4 space-y-3">
              <li
                v-for="item in tech.items"
                :key="item"
                class="text-sm leading-6 text-slate-600 dark:text-slate-300"
              >
                {{ item }}
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <section class="px-4 py-10 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <div class="rounded-[36px] border border-white/70 bg-white/84 p-8 shadow-2xl shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/72 dark:shadow-none sm:p-10">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                {{ pageCopy.comparisonEyebrow }}
              </p>
              <h2 class="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
                {{ t('marketing.featuresPage.comparisonTitle') }}
              </h2>
            </div>
            <p class="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              {{ pageCopy.comparisonDescription }}
            </p>
          </div>

          <div class="mt-8 overflow-hidden rounded-[30px] border border-slate-200/80 dark:border-slate-800">
            <div class="grid grid-cols-[1.6fr_0.7fr_0.7fr_0.7fr] bg-slate-50/85 text-sm font-semibold text-slate-900 dark:bg-slate-950/60 dark:text-white">
              <div class="px-5 py-4">{{ t('marketing.featuresPage.comparisonHeaders.feature') }}</div>
              <div class="px-5 py-4 text-center">PDF-Flow</div>
              <div class="px-5 py-4 text-center">{{ t('marketing.featuresPage.comparisonHeaders.competitorA') }}</div>
              <div class="px-5 py-4 text-center">{{ t('marketing.featuresPage.comparisonHeaders.competitorB') }}</div>
            </div>

            <div
              v-for="row in comparisonRows"
              :key="row.label"
              class="grid grid-cols-[1.6fr_0.7fr_0.7fr_0.7fr] border-t border-slate-200/80 bg-white text-sm dark:border-slate-800 dark:bg-slate-900/72"
            >
              <div class="px-5 py-4 font-medium text-slate-900 dark:text-white">
                {{ row.label }}
              </div>
              <div class="flex items-center justify-center px-5 py-4">
                <template v-if="renderComparisonValue(row.product) === true">
                  <span class="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <CheckCircle2 class="mr-1 h-3.5 w-3.5" />
                    {{ pageCopy.yes }}
                  </span>
                </template>
                <template v-else>
                  <span class="text-slate-500">{{ row.product }}</span>
                </template>
              </div>
              <div class="flex items-center justify-center px-5 py-4">
                <template v-if="renderComparisonValue(row.competitorA) === true">
                  <span class="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <CheckCircle2 class="mr-1 h-3.5 w-3.5" />
                    {{ pageCopy.yes }}
                  </span>
                </template>
                <template v-else-if="renderComparisonValue(row.competitorA) === false">
                  <span class="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                    {{ pageCopy.no }}
                  </span>
                </template>
                <template v-else>
                  <span class="text-center text-xs font-medium text-slate-500 dark:text-slate-400">{{ row.competitorA }}</span>
                </template>
              </div>
              <div class="flex items-center justify-center px-5 py-4">
                <template v-if="renderComparisonValue(row.competitorB) === true">
                  <span class="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <CheckCircle2 class="mr-1 h-3.5 w-3.5" />
                    {{ pageCopy.yes }}
                  </span>
                </template>
                <template v-else-if="renderComparisonValue(row.competitorB) === false">
                  <span class="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                    {{ pageCopy.no }}
                  </span>
                </template>
                <template v-else>
                  <span class="text-center text-xs font-medium text-slate-500 dark:text-slate-400">{{ row.competitorB }}</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl rounded-[36px] bg-[linear-gradient(135deg,#2e1065_0%,#6d28d9_50%,#0ea5e9_100%)] p-8 text-white shadow-2xl shadow-violet-900/15 sm:p-10">
        <div class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div class="max-w-2xl">
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-violet-100/85">
              {{ pageCopy.ctaEyebrow }}
            </p>
            <h2 class="mt-4 text-3xl font-semibold sm:text-4xl">
              {{ pageCopy.ctaTitle }}
            </h2>
            <p class="mt-4 text-sm leading-7 text-white/82 sm:text-base">
              {{ pageCopy.ctaDescription }}
            </p>
          </div>

          <div class="rounded-[30px] border border-white/15 bg-white/10 p-6 backdrop-blur">
            <div class="space-y-3">
              <div class="flex items-start gap-3 rounded-[22px] bg-white/10 px-4 py-3">
                <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-violet-100" />
                <p class="text-sm leading-6 text-white/85">
                  {{ pageCopy.ctaPointA }}
                </p>
              </div>
              <div class="flex items-start gap-3 rounded-[22px] bg-white/10 px-4 py-3">
                <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-violet-100" />
                <p class="text-sm leading-6 text-white/85">
                  {{ pageCopy.ctaPointB }}
                </p>
              </div>
            </div>

            <div class="mt-6 flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="lg"
                class="rounded-full border-white text-white hover:bg-white hover:text-slate-950"
                @click="router.push('/auth/register')"
              >
                {{ t('marketing.featuresPage.ctaRegister') }}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                class="rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/18"
                @click="router.push('/pricing')"
              >
                {{ t('marketing.featuresPage.ctaPricing') }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
