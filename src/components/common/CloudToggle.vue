<script setup lang="ts">
/**
 * CloudToggle — 本地/云端处理切换开关
 *
 * - 未登录或免费用户：显示禁用状态 + 升级提示（点击跳转登录/定价）
 * - Pro/Enterprise：可切换"云端处理"
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const router = useRouter()
const { t } = useI18n()
const userStore = useUserStore()

const canUseCloud = computed(() => userStore.canUseCloudFeatures)

const toggle = () => {
  if (!canUseCloud.value) {
    // 引导未登录/免费用户
    router.push(userStore.isAuthenticated ? '/pricing' : '/auth/login')
    return
  }
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <div
    class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-600 dark:bg-gray-800"
  >
    <div class="flex items-center gap-3">
      <div class="text-primary">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
          />
        </svg>
      </div>
      <div>
        <p class="text-sm font-medium text-gray-900 dark:text-white">
          {{ t('cloud.title') }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ canUseCloud ? t('cloud.desc') : t('cloud.proOnly') }}
        </p>
      </div>
    </div>

    <!-- 开关 -->
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :title="canUseCloud ? '' : t('cloud.proOnly')"
      class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
      :class="[
        modelValue && canUseCloud ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
        !canUseCloud ? 'opacity-60' : '',
      ]"
      @click="toggle"
    >
      <span
        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
        :class="modelValue && canUseCloud ? 'translate-x-6' : 'translate-x-1'"
      />
      <span
        v-if="!canUseCloud"
        class="absolute -top-2 -right-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
      >Pro</span>
    </button>
  </div>
</template>
