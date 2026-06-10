<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ArrowUpRight,
  FileStack,
  Headphones,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const activeLocale = computed(() => locale.value)
const currentYear = new Date().getFullYear()

const toolLinks = computed(() => [
  { label: t('tools.merge.title'), href: '/tools/merge' },
  { label: t('tools.split.title'), href: '/tools/split' },
  { label: t('tools.rotate.title'), href: '/tools/rotate' },
  { label: t('tools.officeToPdf.title'), href: '/tools/office-to-pdf' },
])

const productLinks = computed(() => [
  { label: t('nav.features'), href: '/features' },
  { label: t('nav.pricing'), href: '/pricing' },
  { label: t('auth.login'), href: '/auth/login' },
  { label: t('auth.signUp'), href: '/auth/register' },
])

const legalLinks = computed(() => [
  { label: t('footer.privacyPolicy'), href: '/privacy' },
  { label: t('footer.termsOfService'), href: '/terms' },
])

const trustNotes = computed(() => [
  {
    title: t('footer.trustPrivacyTitle'),
    description: t('footer.trustPrivacyDescription'),
    icon: LockKeyhole,
  },
  {
    title: t('footer.trustSupportTitle'),
    description: t('footer.trustSupportDescription'),
    icon: Headphones,
  },
  {
    title: t('footer.trustWorkflowTitle'),
    description: t('footer.trustWorkflowDescription'),
    icon: FileStack,
  },
])
</script>

<template>
  <footer
    class="border-t border-white/60 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.09),transparent_26%),radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.08),transparent_22%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_100%)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_26%),radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.10),transparent_22%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]"
    :data-locale="activeLocale"
  >
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
        <section class="rounded-[32px] border border-white/70 bg-white/82 p-6 shadow-xl shadow-sky-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#0ea5e9_60%,#22c55e_100%)] text-white shadow-lg shadow-sky-500/20">
              <Sparkles class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">
                PDF Workflow
              </p>
              <h3 class="text-xl font-semibold text-slate-950 dark:text-white">
                {{ t('app.title') }}
              </h3>
            </div>
          </div>

          <p class="mt-5 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300">
            {{ t('footer.brandDescription') }}
          </p>

          <div class="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div
              v-for="note in trustNotes"
              :key="note.title"
              class="rounded-[24px] border border-slate-200/80 bg-slate-50/85 p-4 dark:border-slate-800 dark:bg-slate-950/55"
            >
              <component :is="note.icon" class="h-5 w-5 text-sky-600 dark:text-sky-300" />
              <p class="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                {{ note.title }}
              </p>
              <p class="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-400">
                {{ note.description }}
              </p>
            </div>
          </div>
        </section>

        <section class="rounded-[32px] border border-white/70 bg-white/78 p-6 shadow-lg shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/65 dark:shadow-none">
          <div class="flex items-center gap-2">
            <FileStack class="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
            <h4 class="text-sm font-semibold uppercase tracking-[0.22em] text-slate-900 dark:text-white">
              {{ t('footer.tools') }}
            </h4>
          </div>

          <ul class="mt-5 space-y-3">
            <li
              v-for="link in toolLinks"
              :key="link.href"
            >
              <a
                :href="link.href"
                class="group flex items-center justify-between rounded-2xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
              >
                <span>{{ link.label }}</span>
                <ArrowUpRight class="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
              </a>
            </li>
          </ul>
        </section>

        <section class="rounded-[32px] border border-white/70 bg-white/78 p-6 shadow-lg shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/65 dark:shadow-none">
          <div class="flex items-center gap-2">
            <ShieldCheck class="h-4 w-4 text-sky-600 dark:text-sky-300" />
            <h4 class="text-sm font-semibold uppercase tracking-[0.22em] text-slate-900 dark:text-white">
              {{ t('footer.productTitle') }}
            </h4>
          </div>

          <ul class="mt-5 space-y-3">
            <li
              v-for="link in productLinks"
              :key="link.href"
            >
              <a
                :href="link.href"
                class="group flex items-center justify-between rounded-2xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
              >
                <span>{{ link.label }}</span>
                <ArrowUpRight class="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
              </a>
            </li>
          </ul>
        </section>

        <section class="rounded-[32px] border border-white/70 bg-white/78 p-6 shadow-lg shadow-slate-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-900/65 dark:shadow-none">
          <div class="flex items-center gap-2">
            <Mail class="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <h4 class="text-sm font-semibold uppercase tracking-[0.22em] text-slate-900 dark:text-white">
              {{ t('footer.legalAndSupportTitle') }}
            </h4>
          </div>

          <ul class="mt-5 space-y-3">
            <li
              v-for="link in legalLinks"
              :key="link.href"
            >
              <a
                :href="link.href"
                class="group flex items-center justify-between rounded-2xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
              >
                <span>{{ link.label }}</span>
                <ArrowUpRight class="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
              </a>
            </li>
          </ul>

          <div class="mt-6 rounded-[24px] border border-slate-200/80 bg-slate-50/85 p-4 dark:border-slate-800 dark:bg-slate-950/55">
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ t('footer.contactTitle') }}
            </p>
            <p class="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-400">
              {{ t('footer.contactDescription') }}
            </p>
            <a
              href="mailto:support@pdf-flow.com"
              class="mt-3 inline-flex items-center gap-2 text-sm font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300"
            >
              support@pdf-flow.com
              <ArrowUpRight class="h-4 w-4" />
            </a>
          </div>
        </section>
      </div>

      <div class="mt-8 flex flex-col gap-3 border-t border-slate-200/80 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {{ currentYear }} {{ t('app.title') }}. {{ t('footer.madeWith') }}</p>
        <p>{{ t('footer.bottomLine') }}</p>
      </div>
    </div>
  </footer>
</template>
