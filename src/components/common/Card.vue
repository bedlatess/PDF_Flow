<script setup lang="ts">
import { computed } from 'vue'

interface CardProps {
  variant?: 'default' | 'glass' | 'outlined'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<CardProps>(), {
  variant: 'default',
  padding: 'md',
  hoverable: false,
  clickable: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const cardClasses = computed(() => {
  const classes = ['rounded-xl transition-all duration-200']

  // Variant styles
  switch (props.variant) {
    case 'default':
      classes.push('bg-white dark:bg-gray-800 shadow-sm')
      break
    case 'glass':
      classes.push('glass glass-shadow')
      break
    case 'outlined':
      classes.push(
        'border-2 border-gray-200 dark:border-gray-700',
        'bg-transparent'
      )
      break
  }

  // Padding
  switch (props.padding) {
    case 'none':
      classes.push('p-0')
      break
    case 'sm':
      classes.push('p-4')
      break
    case 'md':
      classes.push('p-6')
      break
    case 'lg':
      classes.push('p-8')
      break
  }

  // Hoverable
  if (props.hoverable) {
    classes.push('hover:shadow-lg hover:scale-[1.02]')
  }

  // Clickable
  if (props.clickable) {
    classes.push('cursor-pointer')
  }

  return classes.join(' ')
})

const handleClick = (event: MouseEvent) => {
  if (props.clickable) {
    emit('click', event)
  }
}
</script>

<template>
  <div
    :class="cardClasses"
    @click="handleClick"
  >
    <slot />
  </div>
</template>
