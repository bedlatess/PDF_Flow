<script setup lang="ts">
interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string
  height?: string
  count?: number
}

const props = withDefaults(defineProps<SkeletonProps>(), {
  variant: 'text',
  width: '100%',
  height: '1rem',
  count: 1,
})

const skeletonStyle = {
  width: props.width,
  height: props.height,
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="i in count"
      :key="i"
      :style="skeletonStyle"
      :class="[
        'animate-pulse bg-gray-200 dark:bg-gray-700',
        {
          'rounded-full': variant === 'circular',
          'rounded': variant === 'rectangular',
          'rounded-md': variant === 'text',
        },
      ]"
    />
  </div>
</template>
