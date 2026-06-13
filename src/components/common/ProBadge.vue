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
      'absolute right-4 top-4 z-10 inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 ring-inset',
      'bg-[#fff7df] text-[#6f5200] ring-[#ead28a] dark:bg-[#fff7df] dark:text-[#6f5200] dark:ring-[#ead28a]',
    ]
  }

  if (props.variant === 'seal') {
    return [
      'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset',
      'bg-slate-950 text-amber-100 ring-amber-300/30 dark:bg-slate-950 dark:text-amber-100 dark:ring-amber-300/30',
    ]
  }

  const size = props.compact
    ? 'px-2.5 py-1 text-[11px]'
    : 'px-3.5 py-1.5 text-xs'

  const toneClasses = {
    gold: 'bg-[#fff4cf] text-[#6f5200] ring-[#e6c86d]',
    dark: 'bg-slate-950 text-amber-100 ring-amber-300/30 dark:bg-slate-950 dark:text-amber-100',
    soft: 'bg-[#fff9e8] text-[#7a5c00] ring-[#edd88f] dark:bg-[#fff9e8] dark:text-[#7a5c00] dark:ring-[#edd88f]',
    ivory: 'bg-[#fff7df] text-[#6f5200] ring-[#ead28a] dark:bg-[#fff7df] dark:text-[#6f5200] dark:ring-[#ead28a]',
  }[props.tone]

  return [
    'inline-flex items-center rounded-full font-semibold ring-1 ring-inset',
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
