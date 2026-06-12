<script setup lang="ts">
import { computed } from 'vue'
import { Clock3, ShieldCheck, Wrench } from 'lucide-vue-next'

interface AuthMarketingHighlight {
  title: string
  description: string
}

interface AuthMarketingCopy {
  heroTitle: string
  heroDescription: string
  panelTitle: string
  panelDescription: string
  highlights: AuthMarketingHighlight[]
}

const props = withDefaults(defineProps<{
  copy: AuthMarketingCopy
  accent?: 'sky' | 'teal'
}>(), {
  accent: 'sky',
})

const accentClasses = computed(() => {
  if (props.accent === 'teal') {
    return {
      badge: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/25 dark:bg-teal-500/10 dark:text-teal-200',
      panelLabel: 'text-teal-700 dark:text-teal-300',
      icon: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
      rail: 'bg-teal-500',
    }
  }

  return {
    badge: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200',
    panelLabel: 'text-sky-700 dark:text-sky-300',
    icon: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    rail: 'bg-sky-500',
  }
})

const highlightIcons = [Clock3, Wrench, ShieldCheck]
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
    <div class="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1fr)]">
      <section class="py-6">
        <div
          class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold"
          :class="accentClasses.badge"
        >
          <span class="h-2 w-2 rounded-full" :class="accentClasses.rail" />
          PDF-Flow
        </div>

        <div class="mt-8 max-w-xl">
          <h1 class="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {{ copy.heroTitle }}
          </h1>
          <p class="mt-5 text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ copy.heroDescription }}
          </p>
        </div>

        <div class="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p class="text-xs font-semibold uppercase tracking-[0.18em]" :class="accentClasses.panelLabel">
            {{ copy.panelTitle }}
          </p>
          <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {{ copy.panelDescription }}
          </p>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <article
            v-for="(item, index) in copy.highlights"
            :key="item.title"
            class="min-h-32 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="mb-4 flex h-8 w-8 items-center justify-center rounded-md" :class="accentClasses.icon">
              <component :is="highlightIcons[index % highlightIcons.length]" class="h-4 w-4" />
            </div>
            <p class="text-sm font-semibold text-slate-950 dark:text-white">
              {{ item.title }}
            </p>
            <p class="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
              {{ item.description }}
            </p>
          </article>
        </div>
      </section>

      <section class="py-6">
        <div class="mx-auto w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <slot />
        </div>
      </section>
    </div>
  </div>
</template>
