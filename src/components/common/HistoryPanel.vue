<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { historyManager, type HistoryItem } from '@/utils/history-manager'
import { formatFileSize } from '@/utils/file-validator'
import Button from '@/components/common/Button.vue'

const { locale, t } = useI18n()
const history = ref<HistoryItem[]>([])
const confirmingClear = ref(false)
const stats = computed(() => historyManager.getStats(history.value))

const loadHistory = () => {
  history.value = historyManager.getHistory()
}

const removeItem = (id: string) => {
  historyManager.removeHistory(id)
  loadHistory()
  if (history.value.length === 0) {
    confirmingClear.value = false
  }
}

const requestClearAll = () => {
  confirmingClear.value = true
}

const cancelClearAll = () => {
  confirmingClear.value = false
}

const confirmClearAll = () => {
  historyManager.clearHistory()
  loadHistory()
  confirmingClear.value = false
}

onMounted(loadHistory)

const groupedHistory = computed(() => {
  const today: HistoryItem[] = []
  const yesterday: HistoryItem[] = []
  const older: HistoryItem[] = []

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  history.value.forEach((item) => {
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
    merge: 'M',
    split: 'S',
    rotate: 'R',
    compress: 'C',
    imageToPdf: 'I',
    pdfToImage: 'P',
    deletePages: 'D',
    organize: 'O',
    pageNumbers: '#',
    crop: 'C',
    protect: 'L',
    unlock: 'U',
    sign: 'S',
    extractText: 'T',
    extractImages: 'I',
    watermark: 'W',
    flatten: 'F',
    repair: 'R',
  }
  return icons[type]
}

const getToolColor = (type: HistoryItem['type']) => {
  const colors: Record<HistoryItem['type'], string> = {
    merge: 'bg-blue-500',
    split: 'bg-emerald-500',
    rotate: 'bg-sky-500',
    compress: 'bg-indigo-500',
    imageToPdf: 'bg-orange-500',
    pdfToImage: 'bg-rose-500',
    deletePages: 'bg-red-500',
    organize: 'bg-emerald-500',
    pageNumbers: 'bg-blue-500',
    crop: 'bg-lime-500',
    protect: 'bg-slate-700',
    unlock: 'bg-emerald-600',
    sign: 'bg-amber-500',
    extractText: 'bg-cyan-500',
    extractImages: 'bg-rose-500',
    watermark: 'bg-cyan-500',
    flatten: 'bg-slate-600',
    repair: 'bg-cyan-600',
  }
  return colors[type]
}

const historyGroups = computed(() => [
  { key: 'today', label: t('history.panel.groups.today'), items: groupedHistory.value.today },
  { key: 'yesterday', label: t('history.panel.groups.yesterday'), items: groupedHistory.value.yesterday },
  { key: 'older', label: t('history.panel.groups.older'), items: groupedHistory.value.older },
])

const getToolLabel = (type: HistoryItem['type']) => t(`history.tools.${type}`)

const getHistoryTimeLabel = (timestamp: number) => {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return t('history.panel.time.justNow')
  if (minutes < 60) return t('history.panel.time.minutesAgo', { count: minutes })
  if (hours < 24) return t('history.panel.time.hoursAgo', { count: hours })
  if (days < 7) return t('history.panel.time.daysAgo', { count: days })

  const dateLocale = locale.value === 'zh' ? 'zh-CN' : locale.value === 'es' ? 'es-ES' : 'en-US'
  return new Date(timestamp).toLocaleDateString(dateLocale, {
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="history-panel">
    <div
      v-if="history.length > 0"
      class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4"
    >
      <div class="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ t('history.panel.stats.totalFiles') }}</p>
        <p class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          {{ stats.totalFiles }}
        </p>
      </div>

      <div class="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ t('history.panel.stats.todayFiles') }}</p>
        <p class="mt-1 text-2xl font-bold text-sky-600 dark:text-sky-300">
          {{ stats.todayFiles }}
        </p>
      </div>

      <div class="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ t('history.panel.stats.mostUsed') }}</p>
        <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
          {{ stats.mostUsedTool ? getToolLabel(stats.mostUsedTool) : t('history.panel.none') }}
        </p>
      </div>

      <div class="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ t('history.panel.stats.spaceSaved') }}</p>
        <p class="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-300">
          {{ stats.totalSaved ? formatFileSize(stats.totalSaved) : t('history.panel.none') }}
        </p>
      </div>
    </div>

    <div
      v-if="history.length === 0"
      class="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950/55"
    >
      <svg
        class="mx-auto h-12 w-12 text-sky-400"
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
      <p class="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
        {{ t('history.panel.emptyTitle') }}
      </p>
      <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
        {{ t('history.panel.emptyDescription') }}
      </p>
    </div>

    <div
      v-else
      class="space-y-6"
    >
      <div
        v-for="group in historyGroups"
        v-show="group.items.length > 0"
        :key="group.key"
      >
        <h3 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          {{ group.label }}
        </h3>

        <div class="space-y-2">
          <div
            v-for="item in group.items"
            :key="item.id"
            class="group flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3 transition hover:border-sky-200 dark:border-slate-800 dark:bg-slate-950/55 dark:hover:border-sky-500/40"
          >
            <div :class="['flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white', getToolColor(item.type)]">
              <span class="text-xl font-bold">{{ getToolIcon(item.type) }}</span>
            </div>

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-slate-900 dark:text-white">
                {{ item.fileName }}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ t('history.panel.itemMeta', { tool: getToolLabel(item.type), time: getHistoryTimeLabel(item.timestamp) }) }}
              </p>
            </div>

            <button
              class="rounded-md p-2 opacity-70 transition hover:bg-rose-50 hover:opacity-100 group-hover:opacity-100 dark:hover:bg-rose-500/10"
              :aria-label="t('history.panel.deleteItem')"
              @click="removeItem(item.id)"
            >
              <svg
                class="h-5 w-5 text-slate-400 hover:text-rose-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="confirmingClear"
        class="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/25"
      >
        <p class="text-sm font-semibold text-amber-900 dark:text-amber-100">
          {{ t('history.panel.confirmTitle') }}
        </p>
        <p class="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-100/80">
          {{ t('history.panel.confirmMessage') }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="primary"
            class="rounded-md"
            @click="confirmClearAll"
          >
            {{ t('history.panel.confirmAction') }}
          </Button>
          <Button
            size="sm"
            variant="outline"
            class="rounded-md"
            @click="cancelClearAll"
          >
            {{ t('history.panel.cancelClear') }}
          </Button>
        </div>
      </div>

      <div class="pt-4">
        <Button
          variant="ghost"
          size="sm"
          full-width
          class="rounded-md"
          @click="requestClearAll"
        >
          {{ t('history.panel.clearAll') }}
        </Button>
      </div>
    </div>
  </div>
</template>
