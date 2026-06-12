<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import Button from './Button.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    summary: string
    details?: string[]
    confirmLabel: string
    cancelLabel: string
    tone?: 'danger' | 'warning'
    loading?: boolean
  }>(),
  {
    details: () => [],
    tone: 'danger',
    loading: false,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

const dialog = ref<HTMLElement | null>(null)

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      void nextTick(() => dialog.value?.focus())
    }
  }
)

const close = () => {
  if (props.loading) return
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm sm:items-center"
        role="presentation"
        @click.self="close"
        @keydown.esc="close"
      >
        <section
          ref="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-dialog-title"
          class="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-900"
          tabindex="-1"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
              :class="
                tone === 'warning'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
              "
            >
              <AlertTriangle class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <h2
                id="confirmation-dialog-title"
                class="text-lg font-semibold text-slate-950 dark:text-white"
              >
                {{ title }}
              </h2>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {{ summary }}
              </p>
            </div>
          </div>

          <ul
            v-if="details.length"
            class="mt-5 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/45 dark:text-slate-300"
          >
            <li v-for="detail in details" :key="detail" class="flex gap-2">
              <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span class="break-words">{{ detail }}</span>
            </li>
          </ul>

          <div class="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" :disabled="loading" @click="close">
              {{ cancelLabel }}
            </Button>
            <Button variant="danger" :loading="loading" @click="emit('confirm')">
              {{ confirmLabel }}
            </Button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
