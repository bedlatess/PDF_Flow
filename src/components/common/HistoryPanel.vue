<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { historyManager, formatToolType, formatHistoryTime, type HistoryItem } from '@/utils/history-manager'
import { formatFileSize } from '@/utils/file-validator'
import Button from '@/components/common/Button.vue'

const history = ref<HistoryItem[]>([])
const stats = computed(() => historyManager.getStats())

const loadHistory = () => {
  history.value = historyManager.getHistory()
}

const removeItem = (id: string) => {
  historyManager.removeHistory(id)
  loadHistory()
}

const clearAll = () => {
  if (confirm('确定要清除所有历史记录吗？')) {
    historyManager.clearHistory()
    loadHistory()
  }
}

onMounted(() => {
  loadHistory()
})

// 按日期分组
const groupedHistory = computed(() => {
  const today: HistoryItem[] = []
  const yesterday: HistoryItem[] = []
  const older: HistoryItem[] = []

  const now = Date.now()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  history.value.forEach(item => {
    if (item.timestamp >= todayStart.getTime()) {
      today.push(item)
    } else if (item.timestamp >= yesterdayStart.getTime()) {
      yesterday.push(item)
    } else {
      older.push(item)
    }
  })

  return { today, yesterday, older }
})

const getToolIcon = (type: HistoryItem['type']) => {
  const icons: Record<HistoryItem['type'], string> = {
    merge: '📄',
    split: '✂️',
    rotate: '🔄',
    compress: '📦',
    imageToPdf: '🖼️',
    pdfToImage: '🎨',
  }
  return icons[type]
}

const getToolColor = (type: HistoryItem['type']) => {
  const colors: Record<HistoryItem['type'], string> = {
    merge: 'bg-blue-500',
    split: 'bg-green-500',
    rotate: 'bg-purple-500',
    compress: 'bg-indigo-500',
    imageToPdf: 'bg-orange-500',
    pdfToImage: 'bg-red-500',
  }
  return colors[type]
}
</script>

<template>
  <div class="history-panel">
    <!-- Stats -->
    <div v-if="history.length > 0" class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="rounded-lg bg-white p-4 dark:bg-gray-800">
        <p class="text-sm text-gray-500 dark:text-gray-400">总文件</p>
        <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          {{ stats.totalFiles }}
        </p>
      </div>
      <div class="rounded-lg bg-white p-4 dark:bg-gray-800">
        <p class="text-sm text-gray-500 dark:text-gray-400">今日处理</p>
        <p class="mt-1 text-2xl font-bold text-primary">
          {{ stats.todayFiles }}
        </p>
      </div>
      <div class="rounded-lg bg-white p-4 dark:bg-gray-800">
        <p class="text-sm text-gray-500 dark:text-gray-400">最常用</p>
        <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
          {{ formatToolType(stats.mostUsedTool as any) }}
        </p>
      </div>
      <div v-if="stats.totalSaved" class="rounded-lg bg-white p-4 dark:bg-gray-800">
        <p class="text-sm text-gray-500 dark:text-gray-400">节省空间</p>
        <p class="mt-1 text-sm font-bold text-success">
          {{ formatFileSize(stats.totalSaved) }}
        </p>
      </div>
    </div>

    <!-- History List -->
    <div v-if="history.length === 0" class="rounded-lg bg-white p-8 text-center dark:bg-gray-800">
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="mt-4 text-gray-600 dark:text-gray-400">暂无历史记录</p>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-500">
        处理 PDF 文件后，历史记录会显示在这里
      </p>
    </div>

    <div v-else class="space-y-6">
      <!-- Today -->
      <div v-if="groupedHistory.today.length > 0">
        <h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          今天
        </h3>
        <div class="space-y-2">
          <div
            v-for="item in groupedHistory.today"
            :key="item.id"
            class="group flex items-center gap-3 rounded-lg bg-white p-3 transition-all hover:shadow-md dark:bg-gray-800"
          >
            <div :class="['flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white', getToolColor(item.type)]">
              <span class="text-xl">{{ getToolIcon(item.type) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                {{ item.fileName }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatToolType(item.type) }} · {{ formatHistoryTime(item.timestamp) }}
              </p>
            </div>
            <button
              class="opacity-0 transition-opacity group-hover:opacity-100"
              @click="removeItem(item.id)"
            >
              <svg class="h-5 w-5 text-gray-400 hover:text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Yesterday -->
      <div v-if="groupedHistory.yesterday.length > 0">
        <h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          昨天
        </h3>
        <div class="space-y-2">
          <div
            v-for="item in groupedHistory.yesterday"
            :key="item.id"
            class="group flex items-center gap-3 rounded-lg bg-white p-3 transition-all hover:shadow-md dark:bg-gray-800"
          >
            <div :class="['flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white', getToolColor(item.type)]">
              <span class="text-xl">{{ getToolIcon(item.type) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                {{ item.fileName }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatToolType(item.type) }} · {{ formatHistoryTime(item.timestamp) }}
              </p>
            </div>
            <button
              class="opacity-0 transition-opacity group-hover:opacity-100"
              @click="removeItem(item.id)"
            >
              <svg class="h-5 w-5 text-gray-400 hover:text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Older -->
      <div v-if="groupedHistory.older.length > 0">
        <h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          更早
        </h3>
        <div class="space-y-2">
          <div
            v-for="item in groupedHistory.older"
            :key="item.id"
            class="group flex items-center gap-3 rounded-lg bg-white p-3 transition-all hover:shadow-md dark:bg-gray-800"
          >
            <div :class="['flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white', getToolColor(item.type)]">
              <span class="text-xl">{{ getToolIcon(item.type) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                {{ item.fileName }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatToolType(item.type) }} · {{ formatHistoryTime(item.timestamp) }}
              </p>
            </div>
            <button
              class="opacity-0 transition-opacity group-hover:opacity-100"
              @click="removeItem(item.id)"
            >
              <svg class="h-5 w-5 text-gray-400 hover:text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Clear All -->
      <div class="pt-4">
        <Button
          variant="ghost"
          size="sm"
          full-width
          @click="clearAll"
        >
          清除所有历史记录
        </Button>
      </div>
    </div>
  </div>
</template>
