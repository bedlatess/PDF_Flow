<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Cloud, Cpu, Gauge } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import ProBadge from '@/components/common/ProBadge.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const router = useRouter()
const { t, locale } = useI18n()
const userStore = useUserStore()

const canUseCloud = computed(() => userStore.canUseCloudFeatures)

const copy = computed(() => {
  if (locale.value.startsWith('zh')) {
    return {
      localTitle: '本地即时处理',
      localDesc: '小文件通常更快，文件尽量留在浏览器内完成。',
      cloudTitle: 'Pro 云端加速',
      cloudDesc: '适合大文件、长任务、批量处理，以及 OCR / Office / AI 等服务器能力。',
      lockedDesc: '升级后可使用大文件、长任务、OCR / Office / AI 等云端能力。',
      switchLabel: '切换云端处理',
    }
  }

  return {
    localTitle: 'Instant local processing',
    localDesc: 'Usually faster for small files and keeps work in the browser.',
    cloudTitle: 'Pro cloud boost',
    cloudDesc: 'Best for large files, long-running jobs, batch work, OCR / Office / AI, and server-powered workflows.',
    lockedDesc: 'Upgrade for large files, long jobs, OCR / Office / AI, and cloud workflows.',
    switchLabel: 'Toggle cloud processing',
  }
})

const title = computed(() => (props.modelValue && canUseCloud.value ? copy.value.cloudTitle : copy.value.localTitle))
const description = computed(() => {
  if (!canUseCloud.value) return copy.value.lockedDesc
  return props.modelValue ? copy.value.cloudDesc : copy.value.localDesc
})

const toggle = () => {
  if (!canUseCloud.value) {
    router.push(userStore.isAuthenticated ? '/pricing' : '/auth/login')
    return
  }
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <div class="rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
    <div class="flex items-start justify-between gap-4">
      <div class="flex gap-3">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          :class="modelValue && canUseCloud ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'"
        >
          <Cloud v-if="modelValue && canUseCloud" class="h-5 w-5" />
          <Cpu v-else class="h-5 w-5" />
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ title }}
            </p>
            <ProBadge v-if="modelValue || !canUseCloud" compact tone="ivory" />
          </div>
          <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {{ description }}
          </p>
          <p class="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Gauge class="h-3.5 w-3.5" />
            {{ copy.cloudDesc }}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        :aria-checked="modelValue"
        :aria-label="copy.switchLabel"
        :title="canUseCloud ? '' : t('cloud.proOnly')"
        class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors"
        :class="[
          modelValue && canUseCloud ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700',
          !canUseCloud ? 'opacity-75' : '',
        ]"
        @click="toggle"
      >
        <span
          class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
          :class="modelValue && canUseCloud ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
    </div>
  </div>
</template>
