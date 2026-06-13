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
  <div class="min-h-screen bg-[#f6f8fb] dark:bg-slate-950">
    <section class="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
      <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div class="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(340px,0.55fr)] lg:items-end">
          <div>
            <div class="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
              <BadgeCheck class="h-4 w-4" />
              {{ copy.eyebrow }}
            </div>
            <h1 class="mt-5 max-w-4xl text-3xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-5xl">
              {{ copy.title }}
            </h1>
            <p class="mt-4 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300">
              {{ copy.description }}
            </p>
            <div class="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" size="lg" class="rounded-md px-6" @click="router.push('/')">
                {{ copy.start }}
              </Button>
              <Button variant="outline" size="lg" class="rounded-md px-6" @click="router.push('/pricing')">
                {{ copy.pricing }}
              </Button>
            </div>
          </div>

          <aside class="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/45">
            <div class="flex gap-3">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300">
                <ShieldCheck class="h-5 w-5" />
              </div>
              <div>
                <h2 class="font-semibold text-slate-950 dark:text-white">{{ copy.freeTitle }}</h2>
                <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ copy.freeDesc }}</p>
              </div>
            </div>
            <div class="mt-5 flex gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-200">
                <Crown class="h-5 w-5" />
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="font-semibold text-slate-950 dark:text-white">{{ copy.proTitle }}</h2>
                  <ProBadge compact tone="ivory" />
                </div>
                <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ copy.proDesc }}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <section class="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.86fr] lg:px-8">
      <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{{ copy.freeLabel }}</p>
            <h2 class="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{{ copy.freeTitle }}</h2>
          </div>
          <span class="rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{{ copy.freeLabel }}</span>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <article
            v-for="card in freeCards"
            :key="card.title"
            class="flex min-h-[104px] gap-3 rounded-md border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/45"
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

      <div class="rounded-lg border border-amber-200 bg-amber-50/55 p-5 shadow-sm dark:border-amber-300/20 dark:bg-amber-500/10">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-amber-700 dark:text-amber-300">{{ copy.proLabel }}</p>
            <h2 class="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{{ copy.proTitle }}</h2>
          </div>
          <ProBadge tone="ivory" />
        </div>

        <div class="mt-5 grid gap-3">
          <article
            v-for="card in proCards"
            :key="card.title"
            class="flex min-h-[94px] gap-3 rounded-md border border-amber-200 bg-white p-4 dark:border-amber-300/20 dark:bg-slate-900"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
              <component :is="card.icon" class="h-5 w-5" />
            </div>
            <div>
              <h3 class="font-semibold text-slate-950 dark:text-white">{{ card.title }}</h3>
              <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ card.desc }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto grid max-w-7xl gap-5 px-4 pb-16 sm:px-6 lg:grid-cols-3 lg:px-8">
      <article class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div class="flex h-11 w-11 items-center justify-center rounded-md bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
          <BadgeCheck class="h-5 w-5" />
        </div>
        <h2 class="mt-5 text-xl font-semibold text-slate-950 dark:text-white">{{ copy.workflowTitle }}</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ copy.workflowDesc }}</p>
      </article>

      <article class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div class="flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <LockKeyhole class="h-5 w-5" />
        </div>
        <h2 class="mt-5 text-xl font-semibold text-slate-950 dark:text-white">{{ copy.trustTitle }}</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ copy.trustDesc }}</p>
      </article>

      <article class="rounded-lg border border-red-200 bg-red-50/70 p-6 shadow-sm dark:border-red-500/20 dark:bg-red-500/10">
        <h2 class="text-2xl font-semibold text-slate-950 dark:text-white">{{ copy.ctaTitle }}</h2>
        <p class="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">{{ copy.ctaDesc }}</p>
        <div class="mt-5 flex flex-wrap gap-3">
          <Button variant="primary" class="rounded-md" @click="router.push('/')">
            {{ copy.start }}
          </Button>
          <Button variant="outline" class="rounded-md bg-white" @click="router.push('/pricing')">
            {{ copy.pricing }}
          </Button>
        </div>
      </article>
    </section>
  </div>
</template>
