<script setup lang="ts">
import { computed } from 'vue'
import { Crown, Sparkles } from 'lucide-vue-next'

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
      'absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] shadow-lg ring-1 ring-inset backdrop-blur',
      'bg-white/88 text-amber-700 ring-amber-200/70 shadow-amber-100/70 dark:bg-slate-950/78 dark:text-amber-200 dark:ring-amber-300/20 dark:shadow-none',
    ]
  }

  if (props.variant === 'seal') {
    return [
      'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-xl ring-1 ring-inset',
      'bg-[linear-gradient(135deg,#111827_0%,#2f1f0b_46%,#f59e0b_100%)] text-amber-50 ring-amber-200/30',
      'dark:bg-[linear-gradient(135deg,#fff7ed_0%,#fcd34d_48%,#f97316_100%)] dark:text-slate-950 dark:ring-amber-100/50',
    ]
  }

  const size = props.compact
    ? 'px-2.5 py-1 text-[11px]'
    : 'px-3.5 py-1.5 text-xs'

  const toneClasses = {
    gold: 'bg-[linear-gradient(135deg,#fef3c7_0%,#f59e0b_55%,#f97316_100%)] text-amber-950 ring-amber-200/70',
    dark: 'bg-slate-950 text-amber-100 ring-amber-300/30 dark:bg-white dark:text-slate-950',
    soft: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-300/20',
    ivory: 'bg-white text-amber-700 ring-amber-200 shadow-amber-100/60 dark:bg-slate-950 dark:text-amber-200 dark:ring-amber-300/20',
  }[props.tone]

  return [
    'inline-flex items-center gap-1.5 rounded-full font-semibold shadow-sm ring-1 ring-inset',
    size,
    toneClasses,
  ]
})
</script>

<template>
  <span :class="classes">
    <Crown v-if="variant === 'seal' || (!compact && variant !== 'corner')" class="h-3.5 w-3.5" />
    <Sparkles v-else class="h-3 w-3" />
    {{ label }}
  </span>
</template>
