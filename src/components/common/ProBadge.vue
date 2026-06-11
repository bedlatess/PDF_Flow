<script setup lang="ts">
import { Crown, Sparkles } from 'lucide-vue-next'

withDefaults(defineProps<{
  label?: string
  tone?: 'gold' | 'dark' | 'soft'
  compact?: boolean
}>(), {
  label: 'Pro',
  tone: 'gold',
  compact: false,
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-full font-semibold shadow-sm ring-1 ring-inset',
      compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
      tone === 'gold' ? 'bg-[linear-gradient(135deg,#fef3c7_0%,#f59e0b_55%,#f97316_100%)] text-amber-950 ring-amber-200/70' : '',
      tone === 'dark' ? 'bg-slate-950 text-amber-100 ring-amber-300/30 dark:bg-white dark:text-slate-950' : '',
      tone === 'soft' ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-300/20' : '',
    ]"
  >
    <Crown v-if="!compact" class="h-3.5 w-3.5" />
    <Sparkles v-else class="h-3 w-3" />
    {{ label }}
  </span>
</template>
