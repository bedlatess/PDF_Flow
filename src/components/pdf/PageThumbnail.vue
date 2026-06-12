<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { usePDFThumbnail } from '@/composables/usePDFThumbnail'

interface PageThumbnailProps {
  file: File
  pageNumber: number
  selected?: boolean
  rotation?: number
  draggable?: boolean
}

const props = withDefaults(defineProps<PageThumbnailProps>(), {
  selected: false,
  rotation: 0,
  draggable: false,
})

const emit = defineEmits<{
  click: [pageNumber: number, event: MouseEvent | KeyboardEvent]
  remove: [pageNumber: number]
  rotate: [pageNumber: number]
  dragstart: [event: DragEvent, pageNumber: number]
  dragend: [event: DragEvent]
}>()

const { generateThumbnail, getThumbnail } = usePDFThumbnail()

const thumbnailUrl = ref('')
const isLoading = ref(true)
const isHovered = ref(false)
const hasError = ref(false)

const loadThumbnail = async () => {
  isLoading.value = true
  hasError.value = false

  try {
    const cached = getThumbnail(props.file, props.pageNumber)
    if (cached) {
      thumbnailUrl.value = cached
      isLoading.value = false
      return
    }

    const result = await generateThumbnail(props.file, props.pageNumber, {
      width: 200,
      quality: 0.8,
    })

    if (result) {
      thumbnailUrl.value = result
    } else {
      hasError.value = true
    }
  } catch (error) {
    hasError.value = true
  } finally {
    isLoading.value = false
  }
}

onMounted(loadThumbnail)

watch(() => props.file, loadThumbnail)

const handleClick = (event: MouseEvent | KeyboardEvent) => {
  emit('click', props.pageNumber, event)
}

const handleRemove = (event: Event) => {
  event.stopPropagation()
  emit('remove', props.pageNumber)
}

const handleRotate = (event: Event) => {
  event.stopPropagation()
  emit('rotate', props.pageNumber)
}

const handleDragStart = (event: DragEvent) => {
  if (!props.draggable) {
    event.preventDefault()
    return
  }
  emit('dragstart', event, props.pageNumber)
}

const handleDragEnd = (event: DragEvent) => {
  emit('dragend', event)
}
</script>

<template>
  <div
    data-testid="page-thumbnail"
    :class="[
      'group relative cursor-pointer rounded-lg border-2 p-2 transition-all',
      selected
        ? 'border-primary bg-primary/5 shadow-lg'
        : 'border-gray-200 hover:border-primary/50 hover:shadow-md dark:border-gray-700',
      draggable ? 'cursor-move' : 'cursor-pointer',
    ]"
    :draggable="draggable"
    role="button"
    tabindex="0"
    :aria-label="`Page ${pageNumber}`"
    :aria-pressed="selected"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <div class="relative aspect-[3/4] overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
      <div
        v-if="isLoading"
        class="flex h-full w-full items-center justify-center"
      >
        <svg
          class="h-8 w-8 animate-spin text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
      </div>

      <div
        v-else-if="hasError"
        class="flex h-full w-full flex-col items-center justify-center text-gray-400"
      >
        <svg
          class="h-12 w-12"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        <p class="mt-2 text-xs">
          Preview unavailable
        </p>
      </div>

      <img
        v-else-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="`Page ${pageNumber}`"
        :style="{ transform: `rotate(${rotation}deg)` }"
        class="h-full w-full object-contain transition-transform"
      >

      <div
        v-else
        class="flex h-full w-full items-center justify-center text-gray-400"
      >
        <svg
          class="h-12 w-12"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clip-rule="evenodd"
          />
        </svg>
      </div>

      <div
        :class="[
          'absolute inset-0 flex items-center justify-center gap-2 bg-black/50 transition-opacity group-focus-within:opacity-100',
          isHovered ? 'opacity-100' : 'opacity-0',
        ]"
      >
        <button
          class="rounded-full bg-white p-2 text-gray-700 transition-colors hover:bg-gray-100"
          title="Rotate"
          type="button"
          :aria-label="`Rotate page ${pageNumber}`"
          @click="handleRotate"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        <button
          class="rounded-full bg-white p-2 text-error transition-colors hover:bg-gray-100"
          title="Remove"
          type="button"
          :aria-label="`Remove page ${pageNumber}`"
          @click="handleRemove"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      <div
        v-if="selected"
        class="absolute right-2 top-2 rounded-full bg-primary p-1"
        aria-hidden="true"
      >
        <svg
          class="h-4 w-4 text-white"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </div>

      <div
        v-if="draggable"
        class="absolute left-2 top-2 rounded bg-white/90 p-1 shadow-sm"
        aria-hidden="true"
      >
        <svg
          class="h-4 w-4 text-gray-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2zm0-4a1 1 0 100-2 1 1 0 000 2zm0-4a1 1 0 100-2 1 1 0 000 2z"
          />
        </svg>
      </div>
    </div>

    <div class="mt-2 text-center">
      <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
        Page {{ pageNumber }}
      </span>
    </div>
  </div>
</template>
