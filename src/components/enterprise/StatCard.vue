<template>
  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-700">
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <p class="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
          {{ title }}
        </p>
        <p class="text-3xl font-bold text-slate-900 dark:text-white mb-1">
          {{ value }}
        </p>
        <p class="text-xs text-slate-500 dark:text-slate-500">
          {{ subtitle }}
        </p>
      </div>
      <div
        :class="[
          'p-3 rounded-lg',
          iconBackgroundClass
        ]"
      >
        <component
          :is="iconComponent"
          :class="['w-6 h-6', iconColorClass]"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Key, Activity, Zap, DollarSign, Users, FileText } from 'lucide-vue-next'

interface Props {
  title: string
  value: string | number
  subtitle: string
  icon: 'key' | 'activity' | 'zap' | 'dollar-sign' | 'users' | 'file-text'
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'blue'
})

const iconComponent = computed(() => {
  const icons = {
    'key': Key,
    'activity': Activity,
    'zap': Zap,
    'dollar-sign': DollarSign,
    'users': Users,
    'file-text': FileText
  }
  return icons[props.icon]
})

const iconBackgroundClass = computed(() => {
  const classes = {
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    green: 'bg-green-100 dark:bg-green-900/30',
    purple: 'bg-purple-100 dark:bg-purple-900/30',
    orange: 'bg-orange-100 dark:bg-orange-900/30',
    red: 'bg-red-100 dark:bg-red-900/30'
  }
  return classes[props.color]
})

const iconColorClass = computed(() => {
  const classes = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400'
  }
  return classes[props.color]
})
</script>
