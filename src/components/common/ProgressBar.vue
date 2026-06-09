<script setup lang="ts">
import { computed } from 'vue'

interface ProgressBarProps {
  progress: number // 0-100
  variant?: 'primary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
  indeterminate?: boolean
}

const props = withDefaults(defineProps<ProgressBarProps>(), {
  variant: 'primary',
  size: 'md',
  showLabel: true,
  indeterminate: false,
})

const clampedProgress = computed(() => {
  return Math.min(100, Math.max(0, props.progress))
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-primary'
    case 'success':
      return 'bg-success'
    case 'warning':
      return 'bg-warning'
    case 'error':
      return 'bg-error'
    default:
      return 'bg-primary'
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-1'
    case 'md':
      return 'h-2'
    case 'lg':
      return 'h-3'
    default:
      return 'h-2'
  }
})
</script>

<template>
  <div class="w-full" data-testid="progress-bar">
    <!-- Label -->
    <div
      v-if="showLabel && (label || !indeterminate)"
      class="mb-1 flex items-center justify-between text-sm"
    >
      <span class="font-medium text-gray-700 dark:text-gray-300">
        {{ label || '处理中...' }}
      </span>
      <span
        v-if="!indeterminate"
        class="text-gray-500 dark:text-gray-400"
      >
        {{ Math.round(clampedProgress) }}%
      </span>
    </div>

    <!-- Progress Bar -->
    <div
      :class="[
        'w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
        sizeClasses,
      ]"
    >
      <div
        v-if="indeterminate"
        :class="[
          'h-full animate-pulse',
          variantClasses,
        ]"
        style="width: 100%"
      />
      <div
        v-else
        :class="[
          'h-full transition-all duration-300 ease-out',
          variantClasses,
        ]"
        :style="{ width: `${clampedProgress}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-indeterminate {
  animation: indeterminate 1.5s infinite;
}
</style>
