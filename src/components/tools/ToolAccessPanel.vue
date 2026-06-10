<script setup lang="ts">
import { computed } from 'vue'
import Button from '@/components/common/Button.vue'

type Accent = 'blue' | 'purple' | 'amber' | 'pink'

const props = withDefaults(defineProps<{
  accent?: Accent
  label: string
  title: string
  description: string
  actionLabel: string
  steps: string[]
}>(), {
  accent: 'blue',
})

const emit = defineEmits<{
  action: []
}>()

const accentClasses = computed(() => {
  const map: Record<Accent, {
    label: string
    button: string
    step: string
    shell: string
    marker: string
  }> = {
    blue: {
      label: 'text-blue-600 dark:text-blue-300',
      button: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      step: 'border-blue-100 bg-blue-50/70 text-blue-950 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-100',
      shell: 'shadow-blue-100/60 dark:shadow-none',
      marker: 'bg-blue-600 text-white',
    },
    purple: {
      label: 'text-purple-600 dark:text-purple-300',
      button: 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500',
      step: 'border-purple-100 bg-purple-50/70 text-purple-950 dark:border-purple-900/70 dark:bg-purple-950/30 dark:text-purple-100',
      shell: 'shadow-purple-100/60 dark:shadow-none',
      marker: 'bg-purple-600 text-white',
    },
    amber: {
      label: 'text-amber-600 dark:text-amber-300',
      button: 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500',
      step: 'border-amber-100 bg-amber-50/70 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100',
      shell: 'shadow-amber-100/60 dark:shadow-none',
      marker: 'bg-amber-600 text-white',
    },
    pink: {
      label: 'text-fuchsia-600 dark:text-fuchsia-300',
      button: 'bg-fuchsia-600 text-white hover:bg-fuchsia-700 focus:ring-fuchsia-500',
      step: 'border-fuchsia-100 bg-fuchsia-50/70 text-fuchsia-950 dark:border-fuchsia-900/70 dark:bg-fuchsia-950/30 dark:text-fuchsia-100',
      shell: 'shadow-fuchsia-100/60 dark:shadow-none',
      marker: 'bg-fuchsia-600 text-white',
    },
  }

  return map[props.accent]
})
</script>

<template>
  <section
    :class="[
      'overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/90',
      accentClasses.shell,
    ]"
  >
    <div class="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
      <div class="flex flex-col justify-center p-6 sm:p-8">
        <p :class="['text-xs font-semibold uppercase tracking-[0.2em]', accentClasses.label]">
          {{ label }}
        </p>
        <h2 class="mt-3 max-w-xl text-2xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-3xl">
          {{ title }}
        </h2>
        <p class="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {{ description }}
        </p>

        <Button
          size="lg"
          class="mt-6 w-full sm:w-fit"
          :class="accentClasses.button"
          @click="emit('action')"
        >
          <slot name="actionIcon" />
          {{ actionLabel }}
        </Button>
      </div>

      <div class="border-t border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40 lg:border-l lg:border-t-0">
        <div class="grid h-full gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div
            v-for="(step, index) in steps"
            :key="step"
            :class="['flex items-start gap-3 rounded-xl border p-4', accentClasses.step]"
          >
            <span :class="['flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold', accentClasses.marker]">
              {{ index + 1 }}
            </span>
            <p class="pt-0.5 text-sm leading-6">
              {{ step }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
