<script setup lang="ts">
import { ref, computed } from 'vue'
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

// 所有页码数组
const allPages = computed(() => {
  return Array.from({ length: props.totalPages }, (_, i) => i + 1)
})

// 根据选择模式自动更新选中页面
const applySelectMode = (mode: typeof selectMode.value) => {
  selectMode.value = mode

  switch (mode) {
    case 'all':
      selectedPages.value = new Set(allPages.value)
      break
    case 'odd':
      selectedPages.value = new Set(allPages.value.filter((p) => p % 2 === 1))
      break
    case 'even':
      selectedPages.value = new Set(allPages.value.filter((p) => p % 2 === 0))
      break
    case 'manual':
    case 'range':
      // 保持当前选择
      break
  }
}

// 切换页面选中状态
const togglePage = (pageNum: number, event?: MouseEvent) => {
  if (selectMode.value === 'range' && event?.shiftKey && lastClickedPage.value) {
    // Shift + 点击：范围选择
    const start = Math.min(lastClickedPage.value, pageNum)
    const end = Math.max(lastClickedPage.value, pageNum)

    for (let i = start; i <= end; i++) {
      selectedPages.value.add(i)
    }
  } else {
    // 普通点击：切换选中状态
    if (selectedPages.value.has(pageNum)) {
      selectedPages.value.delete(pageNum)
    } else {
      selectedPages.value.add(pageNum)
    }
  }

  lastClickedPage.value = pageNum
}

// 全选
const selectAll = () => {
  applySelectMode('all')
}

// 全不选
const deselectAll = () => {
  selectedPages.value.clear()
  selectMode.value = 'manual'
}

// 反选
const invertSelection = () => {
  const newSelection = new Set<number>()
  allPages.value.forEach((p) => {
    if (!selectedPages.value.has(p)) {
      newSelection.add(p)
    }
  })
  selectedPages.value = newSelection
  selectMode.value = 'manual'
}

// 确认选择
const handleConfirm = () => {
  const pages = Array.from(selectedPages.value).sort((a, b) => a - b)
  emit('confirm', pages)
}

// 取消
const handleCancel = () => {
  emit('cancel')
}

const selectedCount = computed(() => selectedPages.value.size)
</script>

<template>
  <div class="page-selector">
    <!-- 工具栏 -->
    <div class="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
      <div class="flex-1">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
          已选择 {{ selectedCount }} / {{ totalPages }} 页
        </p>
      </div>

      <!-- 快速选择按钮 -->
      <div class="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          :class="{ 'bg-primary/10 text-primary': selectMode === 'all' }"
          @click="selectAll"
        >
          全选
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="deselectAll"
        >
          全不选
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="invertSelection"
        >
          反选
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :class="{ 'bg-primary/10 text-primary': selectMode === 'odd' }"
          @click="applySelectMode('odd')"
        >
          奇数页
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :class="{ 'bg-primary/10 text-primary': selectMode === 'even' }"
          @click="applySelectMode('even')"
        >
          偶数页
        </Button>
      </div>
    </div>

    <!-- 提示 -->
    <div class="mb-4 text-sm text-gray-600 dark:text-gray-400">
      💡 点击页面进行选择，按住 Shift 点击可范围选择
    </div>

    <!-- 页面网格 -->
    <div class="max-h-[500px] overflow-y-auto rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <div
          v-for="pageNum in allPages"
          :key="pageNum"
          @click="togglePage(pageNum, $event)"
        >
          <PageThumbnail
            :file="file"
            :page-number="pageNum"
            :selected="selectedPages.has(pageNum)"
          />
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="mt-4 flex gap-3">
      <Button
        variant="primary"
        size="lg"
        full-width
        :disabled="selectedCount === 0"
        @click="handleConfirm"
      >
        确认选择 ({{ selectedCount }} 页)
      </Button>
      <Button
        variant="outline"
        size="lg"
        @click="handleCancel"
      >
        取消
      </Button>
    </div>
  </div>
</template>
