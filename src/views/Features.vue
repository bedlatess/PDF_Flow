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

const heroBadges = computed(() => [
  { label: t('marketing.featuresPage.coreFeatures.privacy.title'), icon: ShieldCheck, tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300' },
  { label: t('marketing.featuresPage.coreFeatures.speed.title'), icon: Zap, tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
  { label: t('marketing.featuresPage.coreFeatures.cloud.title'), icon: Cloud, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' },
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
    class="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_100%_0%,rgba(139,92,246,0.09),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_100%_0%,rgba(139,92,246,0.10),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]"
    :data-locale="activeLocale"
  >
    <section class="px-4 pb-10 pt-16 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <div class="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div class="rounded-[36px] border border-white/70 bg-white/86 p-8 shadow-2xl shadow-sky-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/74 dark:shadow-none sm:p-10">
            <div class="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
              <Sparkles class="h-4 w-4" />
              Product Brief
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

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-[30px] border border-white/70 bg-white/82 p-6 shadow-lg shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/68 dark:shadow-none">
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Workflow
              </p>
              <h2 class="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                {{ t('marketing.featuresPage.coreTitle') }}
              </h2>
              <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {{ t('marketing.featuresPage.coreDescription') }}
              </p>
            </div>

            <div class="rounded-[30px] border border-white/70 bg-gradient-to-br from-slate-950 via-sky-900 to-emerald-900 p-6 text-white shadow-xl shadow-sky-900/10 dark:border-white/10">
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/80">
                Outcome
              </p>
              <p class="mt-4 text-sm leading-7 text-white/82">
                {{ t('marketing.featuresPage.comparisonDescription') }}
              </p>
            </div>

            <div class="rounded-[30px] border border-white/70 bg-white/82 p-6 shadow-lg shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/68 dark:shadow-none sm:col-span-2">
              <div class="grid gap-4 sm:grid-cols-3">
                <div class="rounded-[24px] bg-slate-50/90 p-4 dark:bg-slate-950/50">
                  <p class="text-sm font-semibold text-slate-900 dark:text-white">
                    {{ t('marketing.featuresPage.comparisonRows.privacy') }}
                  </p>
                </div>
                <div class="rounded-[24px] bg-slate-50/90 p-4 dark:bg-slate-950/50">
                  <p class="text-sm font-semibold text-slate-900 dark:text-white">
                    {{ t('marketing.featuresPage.comparisonRows.progress') }}
                  </p>
                </div>
                <div class="rounded-[24px] bg-slate-50/90 p-4 dark:bg-slate-950/50">
                  <p class="text-sm font-semibold text-slate-900 dark:text-white">
                    {{ t('marketing.featuresPage.comparisonRows.ocr') }}
                  </p>
                </div>
              </div>
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
              System Notes
            </p>
            <h2 class="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
              {{ t('marketing.featuresPage.technicalTitle') }}
            </h2>
          </div>
          <p class="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            {{ t('marketing.featuresPage.technicalDescription') }}
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
                Reality Check
              </p>
              <h2 class="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
                {{ t('marketing.featuresPage.comparisonTitle') }}
              </h2>
            </div>
            <p class="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              {{ t('marketing.featuresPage.comparisonDescription') }}
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
                    Yes
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
                    Yes
                  </span>
                </template>
                <template v-else-if="renderComparisonValue(row.competitorA) === false">
                  <span class="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                    No
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
                    Yes
                  </span>
                </template>
                <template v-else-if="renderComparisonValue(row.competitorB) === false">
                  <span class="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                    No
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
      <div class="mx-auto max-w-7xl rounded-[36px] bg-[linear-gradient(135deg,#0f172a_0%,#0ea5e9_48%,#14b8a6_100%)] p-8 text-white shadow-2xl shadow-sky-900/15 sm:p-10">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-2xl">
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-sky-100/80">
              Next Step
            </p>
            <h2 class="mt-4 text-3xl font-semibold sm:text-4xl">
              {{ t('marketing.featuresPage.ctaTitle') }}
            </h2>
            <p class="mt-4 text-sm leading-7 text-white/82 sm:text-base">
              {{ t('marketing.featuresPage.ctaDescription') }}
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
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
    </section>
  </div>
</template>
