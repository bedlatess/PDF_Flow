<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Database,
  FileLock2,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const activeLocale = computed(() => locale.value)

const sections = computed(() => [
  {
    icon: ShieldCheck,
    title: t('legal.privacy.sections.overview.title'),
    body: t('legal.privacy.sections.overview.body'),
  },
  {
    icon: Database,
    title: t('legal.privacy.sections.data.title'),
    body: t('legal.privacy.sections.data.body'),
  },
  {
    icon: FileLock2,
    title: t('legal.privacy.sections.files.title'),
    body: t('legal.privacy.sections.files.body'),
  },
  {
    icon: Trash2,
    title: t('legal.privacy.sections.retention.title'),
    body: t('legal.privacy.sections.retention.body'),
  },
  {
    icon: Mail,
    title: t('legal.privacy.sections.contact.title'),
    body: t('legal.privacy.sections.contact.body'),
  },
])
</script>

<template>
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_100%_0%,rgba(34,197,94,0.1),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_100%_0%,rgba(34,197,94,0.1),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]"
    :data-locale="activeLocale"
  >
    <section class="px-4 pb-10 pt-16 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-5xl">
        <div class="rounded-[36px] border border-white/70 bg-white/86 p-8 shadow-2xl shadow-sky-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/74 dark:shadow-none sm:p-10">
          <div class="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
            <Sparkles class="h-4 w-4" />
            Privacy
          </div>

          <h1 class="mt-6 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {{ t('legal.privacy.title') }}
          </h1>
          <p class="mt-5 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ t('legal.privacy.description') }}
          </p>

          <div class="mt-8 rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ t('legal.privacy.summaryTitle') }}
            </p>
            <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {{ t('legal.privacy.summaryBody') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6 lg:px-8">
      <div class="mx-auto grid max-w-5xl gap-6">
        <article
          v-for="section in sections"
          :key="section.title"
          class="rounded-[30px] border border-white/70 bg-white/82 p-6 shadow-lg shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none sm:p-7"
        >
          <div class="flex items-start gap-4">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
              <component :is="section.icon" class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-xl font-semibold text-slate-950 dark:text-white">
                {{ section.title }}
              </h2>
              <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-[15px]">
                {{ section.body }}
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
