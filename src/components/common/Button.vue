<script setup lang="ts">
import { computed } from 'vue'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  fullWidth: false,
  type: 'button',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClasses = computed(() => {
  const classes = [
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ]

  // Variant styles
  switch (props.variant) {
    case 'primary':
      classes.push(
        'bg-primary text-white hover:bg-primary-600',
        'focus:ring-primary-500',
        'shadow-sm hover:shadow-md'
      )
      break
    case 'secondary':
      classes.push(
        'bg-gray-200 text-gray-900 hover:bg-gray-300',
        'dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
        'focus:ring-gray-500'
      )
      break
    case 'outline':
      classes.push(
        'border-2 border-primary text-primary hover:bg-primary hover:text-white',
        'focus:ring-primary-500'
      )
      break
    case 'ghost':
      classes.push(
        'text-gray-700 hover:bg-gray-100',
        'dark:text-gray-300 dark:hover:bg-gray-800',
        'focus:ring-gray-500'
      )
      break
    case 'danger':
      classes.push(
        'bg-error text-white hover:bg-error-dark',
        'focus:ring-error',
        'shadow-sm hover:shadow-md'
      )
      break
  }

  // Size styles
  switch (props.size) {
    case 'sm':
      classes.push('px-3 py-1.5 text-sm')
      break
    case 'md':
      classes.push('px-4 py-2 text-base')
      break
    case 'lg':
      classes.push('px-6 py-3 text-lg')
      break
  }

  // Full width
  if (props.fullWidth) {
    classes.push('w-full')
  }

  return classes.join(' ')
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<template>
  <button
    :type="type"
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <!-- Loading spinner -->
    <svg
      v-if="loading"
      class="mr-2 h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>

    <slot />
  </button>
</template>
