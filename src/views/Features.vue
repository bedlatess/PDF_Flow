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
  Wand2,
  Zap,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import ProBadge from '@/components/common/ProBadge.vue'
import { useSiteConfigStore } from '@/stores/siteConfig'

type FeatureToolCopy = [title: string, desc: string]

interface FeaturesPageCopy {
  eyebrow: string
  title: string
  description: string
  start: string
  pricing: string
  freeLabel: string
  proLabel: string
  freeTitle: string
  freeDesc: string
  proTitle: string
  proDesc: string
  workflowTitle: string
  workflowDesc: string
  trustTitle: string
  trustDesc: string
  ctaTitle: string
  ctaDesc: string
  freeTools: FeatureToolCopy[]
  proTools: FeatureToolCopy[]
}

const { tm } = useI18n()
const router = useRouter()
const siteConfigStore = useSiteConfigStore()

const copy = computed(() => tm('features.page') as FeaturesPageCopy)

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
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <section class="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
      <div class="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div class="rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:shadow-none sm:p-10">
          <div class="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
            <BadgeCheck class="h-4 w-4" />
            {{ copy.eyebrow }}
          </div>
          <h1 class="mt-6 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {{ copy.title }}
          </h1>
          <p class="mt-5 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ copy.description }}
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" class="rounded-md px-6" @click="router.push('/')">
              {{ copy.start }}
            </Button>
            <Button variant="outline" size="lg" class="rounded-md px-6" @click="router.push('/pricing')">
              {{ copy.pricing }}
            </Button>
          </div>
        </div>

        <div class="grid gap-4">
          <article class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:shadow-none">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <ShieldCheck class="h-5 w-5" />
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-950 dark:text-white">{{ copy.freeTitle }}</p>
                <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ copy.freeDesc }}</p>
              </div>
            </div>
          </article>

          <article class="rounded-lg border border-amber-200 bg-white p-6 shadow-sm dark:border-amber-300/20 dark:bg-slate-900 dark:shadow-none">
            <div class="flex items-start gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                <Crown class="h-5 w-5" />
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-sm font-semibold text-slate-950 dark:text-white">{{ copy.proTitle }}</p>
                  <ProBadge compact tone="ivory" />
                </div>
                <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ copy.proDesc }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:shadow-none sm:p-8">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">{{ copy.freeLabel }}</p>
            <h2 class="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{{ copy.freeTitle }}</h2>
          </div>
          <span class="rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{{ copy.freeLabel }}</span>
        </div>

        <div class="mt-6 grid gap-3">
          <article
            v-for="card in freeCards"
            :key="card.title"
            class="flex gap-3 rounded-md border border-slate-200/80 bg-slate-50/82 p-4 dark:border-slate-800 dark:bg-slate-950/45"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300">
              <component :is="card.icon" class="h-5 w-5" />
            </div>
            <div>
              <h3 class="font-semibold text-slate-950 dark:text-white">{{ card.title }}</h3>
              <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ card.desc }}</p>
            </div>
          </article>
        </div>
      </div>

      <div class="rounded-lg border border-amber-200 bg-white p-6 shadow-sm dark:border-amber-300/20 dark:bg-slate-900 dark:shadow-none sm:p-8">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600 dark:text-amber-300">{{ copy.proLabel }}</p>
            <h2 class="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{{ copy.proTitle }}</h2>
          </div>
          <ProBadge tone="ivory" />
        </div>

        <div class="mt-6 grid gap-3">
          <article
            v-for="card in proCards"
            :key="card.title"
            class="flex gap-3 rounded-md border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-300/20 dark:bg-amber-500/10"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-200">
              <component :is="card.icon" class="h-5 w-5" />
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-semibold text-slate-950 dark:text-white">{{ card.title }}</h3>
                <ProBadge compact tone="ivory" />
              </div>
              <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ card.desc }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article class="rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:shadow-none">
          <div class="flex h-12 w-12 items-center justify-center rounded-md bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
            <BadgeCheck class="h-5 w-5" />
          </div>
          <h2 class="mt-5 text-2xl font-semibold text-slate-950 dark:text-white">{{ copy.workflowTitle }}</h2>
          <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ copy.workflowDesc }}</p>
        </article>

        <article class="rounded-lg bg-slate-950 p-8 text-white shadow-sm dark:bg-slate-900">
          <div class="flex h-12 w-12 items-center justify-center rounded-md bg-white/12 text-amber-100">
            <LockKeyhole class="h-5 w-5" />
          </div>
          <h2 class="mt-5 text-2xl font-semibold">{{ copy.trustTitle }}</h2>
          <p class="mt-3 text-sm leading-7 text-white/78">{{ copy.trustDesc }}</p>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <div class="rounded-lg bg-slate-950 p-8 text-white shadow-sm dark:bg-slate-900 sm:p-10">
        <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h2 class="text-3xl font-semibold sm:text-4xl">{{ copy.ctaTitle }}</h2>
            <p class="mt-4 max-w-3xl text-sm leading-7 text-white/82 sm:text-base">{{ copy.ctaDesc }}</p>
          </div>
          <div class="flex flex-wrap gap-3 lg:justify-end">
            <Button variant="outline" size="lg" class="rounded-md border-white text-white hover:bg-white hover:text-slate-950" @click="router.push('/')">
              {{ copy.start }}
            </Button>
            <Button variant="ghost" size="lg" class="rounded-md border border-white/20 bg-white/10 text-white hover:bg-white/18" @click="router.push('/pricing')">
              {{ copy.pricing }}
            </Button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
