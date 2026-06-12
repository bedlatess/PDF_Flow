<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ArrowRight,
  BadgeCheck,
  FileStack,
  Headphones,
  LifeBuoy,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-vue-next'
import { useSiteConfigStore } from '@/stores/siteConfig'

const { t } = useI18n()
const siteConfigStore = useSiteConfigStore()
const currentYear = new Date().getFullYear()

const brandName = computed(() => siteConfigStore.getSettingValue('site_name', t('app.title')))
const supportEmail = computed(() => siteConfigStore.getSettingValue('support_email', 'support@pdf-flow.com'))
const supportDescription = computed(() =>
  siteConfigStore.getSettingValue('support_contact', t('footer.contactDescription'))
)

const toolLinks = computed(() => [
  { label: t('nav.tools'), to: '/tools', featureKey: null },
  { label: t('tools.merge.title'), to: '/tools/merge', featureKey: 'merge_pdf' },
  { label: t('tools.compress.title'), to: '/tools/compress', featureKey: 'compress_pdf' },
  { label: t('tools.ocr.title'), to: '/tools/ocr', featureKey: 'ocr_pdf' },
])

const visibleToolLinks = computed(() =>
  toolLinks.value.filter((link) =>
    link.featureKey ? siteConfigStore.getFeatureFlag(link.featureKey, link.label).enabled : true
  )
)

const productLinks = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('nav.features'), to: '/features' },
  { label: t('nav.pricing'), to: '/pricing' },
  { label: t('auth.login'), to: '/auth/login' },
])

const legalLinks = computed(() => [
  { label: t('footer.privacyPolicy'), to: '/privacy' },
  { label: t('footer.termsOfService'), to: '/terms' },
])

const trustNotes = computed(() => [
  {
    title: t('footer.trustPrivacyTitle'),
    description: t('footer.trustPrivacyDescription'),
    icon: LockKeyhole,
  },
  {
    title: t('footer.trustWorkflowTitle'),
    description: t('footer.trustWorkflowDescription'),
    icon: FileStack,
  },
  {
    title: t('footer.trustSupportTitle'),
    description: t('footer.trustSupportDescription'),
    icon: Headphones,
  },
])

onMounted(() => {
  siteConfigStore.fetchPublicConfig()
})
</script>

<template>
  <footer class="border-t border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
    <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div class="grid gap-10 lg:grid-cols-[1.05fr_1fr_0.95fr]">
        <section>
          <button
            type="button"
            class="flex items-center gap-3 text-left"
            aria-label="PDF-Flow"
          >
            <span class="flex h-11 w-11 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm shadow-red-200 dark:shadow-none">
              <FileStack class="h-5 w-5" />
            </span>
            <span>
              <span class="block text-base font-semibold text-slate-950 dark:text-white">{{ brandName }}</span>
              <span class="block text-xs font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-300">
                {{ t('footer.eyebrow') }}
              </span>
            </span>
          </button>

          <p class="mt-5 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-400">
            {{ t('footer.brandDescription') }}
          </p>

          <div class="mt-6 grid gap-3">
            <article
              v-for="note in trustNotes"
              :key="note.title"
              class="grid grid-cols-[32px_1fr] gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900"
            >
              <span class="flex h-8 w-8 items-center justify-center rounded-md bg-white text-red-600 shadow-sm dark:bg-slate-950 dark:text-red-300">
                <component :is="note.icon" class="h-4 w-4" />
              </span>
              <span>
                <span class="block text-sm font-semibold text-slate-950 dark:text-white">{{ note.title }}</span>
                <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{{ note.description }}</span>
              </span>
            </article>
          </div>
        </section>

        <section class="grid gap-8 sm:grid-cols-2">
          <div>
            <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <Sparkles class="h-4 w-4 text-red-600 dark:text-red-300" />
              {{ t('footer.toolsTitle') }}
            </div>
            <ul class="mt-4 space-y-1">
              <li
                v-for="link in visibleToolLinks"
                :key="link.to"
              >
                <RouterLink
                  :to="link.to"
                  class="group flex min-h-10 items-center justify-between rounded-md px-2 text-sm font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-200"
                >
                  <span>{{ link.label }}</span>
                  <ArrowRight class="h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </RouterLink>
              </li>
            </ul>
          </div>

          <div>
            <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <ShieldCheck class="h-4 w-4 text-red-600 dark:text-red-300" />
              {{ t('footer.productTitle') }}
            </div>
            <ul class="mt-4 space-y-1">
              <li
                v-for="link in productLinks"
                :key="link.to"
              >
                <RouterLink
                  :to="link.to"
                  class="group flex min-h-10 items-center justify-between rounded-md px-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  <span>{{ link.label }}</span>
                  <ArrowRight class="h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </RouterLink>
              </li>
            </ul>
          </div>
        </section>

        <section>
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <LifeBuoy class="h-4 w-4 text-red-600 dark:text-red-300" />
            {{ t('footer.supportTitle') }}
          </div>

          <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-900">
            <p class="text-sm font-semibold text-slate-950 dark:text-white">
              {{ t('footer.contactTitle') }}
            </p>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {{ supportDescription }}
            </p>
            <a
              :href="`mailto:${supportEmail}`"
              class="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-red-600 dark:bg-white dark:text-slate-950 dark:hover:bg-red-200"
            >
              <Mail class="h-4 w-4" />
              {{ supportEmail }}
            </a>
          </div>

          <ul class="mt-5 flex flex-wrap gap-2">
            <li
              v-for="link in legalLinks"
              :key="link.to"
            >
              <RouterLink
                :to="link.to"
                class="inline-flex min-h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:text-red-700 dark:border-white/10 dark:text-slate-300 dark:hover:border-red-500/30 dark:hover:text-red-200"
              >
                {{ link.label }}
              </RouterLink>
            </li>
          </ul>
        </section>
      </div>

      <div class="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {{ currentYear }} {{ brandName }}. {{ t('footer.copyright') }}</p>
        <p class="inline-flex items-center gap-2">
          <BadgeCheck class="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
          {{ t('footer.bottomLine') }}
        </p>
      </div>
    </div>
  </footer>
</template>
