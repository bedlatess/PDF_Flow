<script setup lang="ts">
import { computed, ref } from 'vue'
import PageThumbnail from './PageThumbnail.vue'
import Button from '@/components/common/Button.vue'

interface PageSelectorProps {
  file: File
  totalPages: number
}

const props = defineProps<PageSelectorProps>()

const emit = defineEmits<{
  confirm: [pages: number[]]
  cancel: []
}>()

const selectedPages = ref<Set<number>>(new Set())
const selectMode = ref<'manual' | 'range' | 'odd' | 'even' | 'all'>('manual')
const lastClickedPage = ref<number | null>(null)

const allPages = computed(() => {
  return Array.from({ length: props.totalPages }, (_, index) => index + 1)
})

const applySelectMode = (mode: typeof selectMode.value) => {
  selectMode.value = mode

  switch (mode) {
    case 'all':
      selectedPages.value = new Set(allPages.value)
      break
    case 'odd':
      selectedPages.value = new Set(allPages.value.filter((page) => page % 2 === 1))
      break
    case 'even':
      selectedPages.value = new Set(allPages.value.filter((page) => page % 2 === 0))
      break
    case 'manual':
    case 'range':
      break
  }
}

const togglePage = (pageNumber: number, event?: MouseEvent | KeyboardEvent) => {
  if (event?.shiftKey && lastClickedPage.value) {
    const start = Math.min(lastClickedPage.value, pageNumber)
    const end = Math.max(lastClickedPage.value, pageNumber)

    for (let page = start; page <= end; page += 1) {
      selectedPages.value.add(page)
    }
    selectMode.value = 'range'
  } else if (selectedPages.value.has(pageNumber)) {
    selectedPages.value.delete(pageNumber)
    selectMode.value = 'manual'
  } else {
    selectedPages.value.add(pageNumber)
    selectMode.value = 'manual'
  }

  lastClickedPage.value = pageNumber
}

const selectAll = () => {
  applySelectMode('all')
}

const deselectAll = () => {
  selectedPages.value.clear()
  selectMode.value = 'manual'
}

const invertSelection = () => {
  const nextSelection = new Set<number>()
  allPages.value.forEach((page) => {
    if (!selectedPages.value.has(page)) {
      nextSelection.add(page)
    }
  })
  selectedPages.value = nextSelection
  selectMode.value = 'manual'
}

const handleConfirm = () => {
  const pages = Array.from(selectedPages.value).sort((a, b) => a - b)
  emit('confirm', pages)
}

const handleCancel = () => {
  emit('cancel')
}

const selectedCount = computed(() => selectedPages.value.size)
</script>

<template>
  <div class="page-selector">
    <div class="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
      <div class="flex-1">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Selected {{ selectedCount }} / {{ totalPages }} pages
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          :class="{ 'bg-primary/10 text-primary': selectMode === 'all' }"
          @click="selectAll"
        >
          Select all
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="deselectAll"
        >
          Clear
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="invertSelection"
        >
          Invert
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :class="{ 'bg-primary/10 text-primary': selectMode === 'odd' }"
          @click="applySelectMode('odd')"
        >
          Odd pages
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :class="{ 'bg-primary/10 text-primary': selectMode === 'even' }"
          @click="applySelectMode('even')"
        >
          Even pages
        </Button>
      </div>
    </div>

    <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
      Click a page to select it. Hold Shift while clicking to select a range.
    </p>

    <div class="max-h-[500px] overflow-y-auto rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <PageThumbnail
          v-for="pageNumber in allPages"
          :key="pageNumber"
          :file="file"
          :page-number="pageNumber"
          :selected="selectedPages.has(pageNumber)"
          @click="togglePage"
        />
      </div>
    </div>

    <div class="mt-4 flex gap-3">
      <Button
        variant="primary"
        size="lg"
        full-width
        :disabled="selectedCount === 0"
        @click="handleConfirm"
      >
        Confirm selection ({{ selectedCount }} pages)
      </Button>
      <Button
        variant="outline"
        size="lg"
        @click="handleCancel"
      >
        Cancel
      </Button>
    </div>
  </div>
</template>
