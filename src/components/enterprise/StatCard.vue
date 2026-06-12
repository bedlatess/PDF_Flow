<template>
  <div class="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <p class="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
          {{ title }}
        </p>
        <p class="mb-1 text-3xl font-semibold text-slate-950 dark:text-white">
          {{ value }}
        </p>
        <p class="text-xs text-slate-500 dark:text-slate-500">
          {{ subtitle }}
        </p>
      </div>
      <div
        :class="[
          'rounded-md p-3',
          iconBackgroundClass
        ]"
      >
        <component
          :is="iconComponent"
          :class="['h-6 w-6', iconColorClass]"
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
  color?: 'blue' | 'green' | 'violet' | 'orange' | 'red'
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
    blue: 'bg-sky-50 dark:bg-sky-900/30',
    green: 'bg-emerald-50 dark:bg-emerald-900/30',
    violet: 'bg-violet-50 dark:bg-violet-900/30',
    orange: 'bg-amber-50 dark:bg-amber-900/30',
    red: 'bg-rose-50 dark:bg-rose-900/30'
  }
  return classes[props.color]
})

const iconColorClass = computed(() => {
  const classes = {
    blue: 'text-sky-700 dark:text-sky-300',
    green: 'text-emerald-700 dark:text-emerald-300',
    violet: 'text-violet-700 dark:text-violet-300',
    orange: 'text-amber-700 dark:text-amber-300',
    red: 'text-rose-700 dark:text-rose-300'
  }
  return classes[props.color]
})
</script>
