<script setup lang="ts">
import { computed } from 'vue'
import ProBadge from '@/components/common/ProBadge.vue'

type Accent = 'red' | 'purple' | 'blue' | 'amber' | 'cyan' | 'emerald' | 'pink' | 'slate'

const props = withDefaults(defineProps<{
  title: string
  subtitle: string
  badge: string
  pro?: boolean
  accent?: Accent
}>(), {
  pro: false,
  accent: 'red',
})

const accentClasses = computed(() => {
  const map: Record<Accent, { rail: string; pill: string; icon: string }> = {
    red: {
      rail: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200',
      pill: 'bg-red-600 text-white',
      icon: 'text-red-600 dark:text-red-300',
    },
    purple: {
      rail: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-200',
      pill: 'bg-purple-600 text-white',
      icon: 'text-purple-600 dark:text-purple-300',
    },
    blue: {
      rail: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200',
      pill: 'bg-blue-600 text-white',
      icon: 'text-blue-600 dark:text-blue-300',
    },
    amber: {
      rail: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200',
      pill: 'bg-amber-600 text-white',
      icon: 'text-amber-600 dark:text-amber-300',
    },
    cyan: {
      rail: 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200',
      pill: 'bg-cyan-600 text-white',
      icon: 'text-cyan-600 dark:text-cyan-300',
    },
    emerald: {
      rail: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200',
      pill: 'bg-emerald-600 text-white',
      icon: 'text-emerald-600 dark:text-emerald-300',
    },
    pink: {
      rail: 'border-pink-200 bg-pink-50 text-pink-800 dark:border-pink-500/20 dark:bg-pink-500/10 dark:text-pink-200',
      pill: 'bg-pink-600 text-white',
      icon: 'text-pink-600 dark:text-pink-300',
    },
    slate: {
      rail: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200',
      pill: 'bg-slate-900 text-white dark:bg-white dark:text-slate-950',
      icon: 'text-slate-700 dark:text-slate-200',
    },
  }

  return map[props.accent]
})
</script>

<template>
  <section class="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
    <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div class="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div :class="['inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]', accentClasses.rail]">
            <span :class="accentClasses.icon">
              <slot name="badgeIcon">
                *
              </slot>
            </span>
            <span>{{ badge }}</span>
          </div>

          <h1 class="mt-5 text-3xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-4xl">
            {{ title }}
          </h1>
          <p class="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {{ subtitle }}
          </p>
        </div>

        <ProBadge
          v-if="pro"
          :label="badge"
          variant="seal"
        />

        <div
          v-else
          :class="[
            'hidden rounded-md px-3 py-2 text-sm font-semibold shadow-sm lg:inline-flex',
            accentClasses.pill,
          ]"
        >
          {{ badge }}
        </div>
      </div>

      <div class="mt-6">
        <slot name="extra" />
      </div>
    </div>
  </section>
</template>
