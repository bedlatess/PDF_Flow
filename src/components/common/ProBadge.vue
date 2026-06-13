<script setup lang="ts">
import { computed } from 'vue'
import { Crown } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  label?: string
  tone?: 'gold' | 'dark' | 'soft' | 'ivory'
  variant?: 'pill' | 'seal' | 'corner'
  compact?: boolean
}>(), {
  label: 'Pro',
  tone: 'gold',
  variant: 'pill',
  compact: false,
})

const classes = computed(() => {
  if (props.variant === 'corner') {
    return [
      'absolute right-4 top-4 z-10 inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
      'bg-white text-slate-800 ring-amber-300 dark:bg-slate-950 dark:text-amber-100 dark:ring-amber-300/45',
    ]
  }

  if (props.variant === 'seal') {
    return [
      'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset',
      'bg-slate-950 text-amber-100 ring-amber-300/30 dark:bg-slate-950 dark:text-amber-100 dark:ring-amber-300/30',
    ]
  }

  const size = props.compact
    ? 'px-2 py-0.5 text-[11px]'
    : 'px-2.5 py-1 text-xs'

  const toneClasses = {
    gold: 'bg-white text-slate-800 ring-amber-300 dark:bg-slate-950 dark:text-amber-100 dark:ring-amber-300/45',
    dark: 'bg-slate-950 text-amber-100 ring-amber-300/30 dark:bg-slate-950 dark:text-amber-100',
    soft: 'bg-white text-slate-700 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-700',
    ivory: 'bg-white text-slate-800 ring-amber-300 dark:bg-slate-950 dark:text-amber-100 dark:ring-amber-300/45',
  }[props.tone]

  return [
    'inline-flex items-center rounded-md font-semibold ring-1 ring-inset',
    size,
    toneClasses,
  ]
})
</script>

<template>
  <span :class="classes">
    <Crown v-if="variant === 'seal'" class="h-3.5 w-3.5" />
    {{ label }}
  </span>
</template>
