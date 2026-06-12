<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: 'section' | 'article' | 'aside' | 'div'
    tone?: 'default' | 'subtle' | 'info' | 'success' | 'warning' | 'danger'
    padding?: 'sm' | 'md' | 'lg'
  }>(),
  {
    as: 'section',
    tone: 'default',
    padding: 'md',
  }
)
</script>

<template>
  <component
    :is="as"
    class="rounded-lg border"
    :class="[
      padding === 'sm' ? 'p-3' : padding === 'lg' ? 'p-6 sm:p-8' : 'p-5',
      tone === 'default'
        ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
        : tone === 'subtle'
          ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/45'
          : tone === 'info'
            ? 'border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10'
            : tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
              : tone === 'warning'
                ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                : 'border-rose-200 bg-rose-500/10 dark:border-rose-500/30',
    ]"
  >
    <slot />
  </component>
</template>
