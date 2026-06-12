<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    block?: boolean
  }>(),
  {
    label: '',
    block: true,
  }
)
</script>

<template>
  <label
    class="text-sm font-medium text-slate-600 dark:text-slate-300"
    :class="block ? 'block' : 'inline-flex items-center gap-2'"
  >
    <span v-if="label">{{ label }}</span>
    <slot />
  </label>
</template>
