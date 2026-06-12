<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSiteConfigStore } from '@/stores/siteConfig'
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  CreditCard,
  FileText,
  Gavel,
  Mail,
  Shield,
  UserCog,
} from 'lucide-vue-next'

type LegalSection = {
  icon: unknown
  title: string
  paragraphs: string[]
  bullets?: string[]
}

type LegalCopySection = Omit<LegalSection, 'icon'>

type LegalCopy = {
  eyebrow: string
  title: string
  updated: string
  description: string
  summaryTitle: string
  summary: string
  note: string
  sections: LegalCopySection[]
}

const { locale, tm } = useI18n()
const siteConfigStore = useSiteConfigStore()

const isUsableContent = (value?: string | null) => {
  if (!value) return false
  const trimmed = value.trim()
  if (trimmed.length < 8) return false
  const questionCount = (trimmed.match(/\?/g) || []).length
  const mojibakePattern = /[\uFFFD\u9340\u9422\u7AD4\u6D60\u95C2\u95FF\u6769\u7459\u5BEE\u93B4\u93C8\u20AC]/g
  const mojibakeMatches = trimmed.match(mojibakePattern) || []
  return questionCount / trimmed.length < 0.25 && mojibakeMatches.length < 3
}

const sectionIcons = [
  BadgeCheck,
  UserCog,
  FileText,
  Ban,
  CreditCard,
  Shield,
  AlertTriangle,
  Gavel,
  Mail,
] as const

const fallbackIcon = FileText

const localizedContent = computed(() => tm('legal.terms') as unknown as LegalCopy)

const activeContent = computed(() => {
  const base = localizedContent.value
  const block = siteConfigStore.getContentBlock('terms_of_service', locale.value)

  return {
    ...base,
    title: isUsableContent(block?.title) ? block?.title || base.title : base.title,
    summary: isUsableContent(block?.content) ? block?.content || base.summary : base.summary,
    sections: base.sections.map((section, index) => ({
      ...section,
      icon: sectionIcons[index] || fallbackIcon,
    })),
  }
})

onMounted(() => {
  siteConfigStore.fetchPublicConfig()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <section class="px-4 pb-10 pt-16 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-6xl">
        <div class="grid gap-6 rounded-lg border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div>
            <div class="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Gavel class="h-4 w-4" />
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
          <aside class="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/55">
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ activeContent.summaryTitle }}
            </p>
            <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {{ activeContent.summary }}
            </p>
            <p class="mt-5 rounded-md border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
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
          class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7"
        >
          <div class="flex items-start gap-4">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
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
                  <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
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
