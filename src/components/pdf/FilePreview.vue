<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { formatFileSize } from '@/utils/file-validator'
import Button from '@/components/common/Button.vue'

interface FilePreviewProps {
  file: File
  showActions?: boolean
  removable?: boolean
}

const props = withDefaults(defineProps<FilePreviewProps>(), {
  showActions: true,
  removable: true,
})

const emit = defineEmits<{
  remove: []
  download: []
  preview: []
}>()

const thumbnailUrl = ref<string>('')

onMounted(async () => {
  // 生成缩略图
  if (props.file.type === 'application/pdf') {
    // PDF 缩略图生成（简化版，实际需要 pdf.js）
    thumbnailUrl.value = generatePDFThumbnail()
  } else if (props.file.type.startsWith('image/')) {
    thumbnailUrl.value = URL.createObjectURL(props.file)
  }
})

onUnmounted(() => {
  if (thumbnailUrl.value) {
    URL.revokeObjectURL(thumbnailUrl.value)
  }
})

const generatePDFThumbnail = () => {
  // 返回 PDF 占位图标
  return ''
}

const handleRemove = () => {
  emit('remove')
}

const handlePreview = () => {
  emit('preview')
}
</script>

<template>
  <div
    data-testid="file-preview"
    class="group relative flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
  >
    <!-- Thumbnail -->
    <div class="flex-shrink-0">
      <div
        class="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700"
      >
        <template v-if="thumbnailUrl">
          <img
            :src="thumbnailUrl"
            :alt="file.name"
            class="h-full w-full rounded-lg object-cover"
          >
        </template>
        <template v-else>
          <!-- PDF Icon -->
          <svg
            class="h-8 w-8 text-error"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
              clip-rule="evenodd"
            />
          </svg>
        </template>
      </div>
    </div>

    <!-- File Info -->
    <div class="flex-1 min-w-0">
      <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
        {{ file.name }}
      </p>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        {{ formatFileSize(file.size) }}
      </p>
    </div>

    <!-- Actions -->
    <div
      v-if="showActions"
      class="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100"
    >
      <Button
        v-if="file.type === 'application/pdf'"
        variant="ghost"
        size="sm"
        title="Preview PDF"
        @click="handlePreview"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      </Button>
      <Button
        v-if="removable"
        variant="ghost"
        size="sm"
        data-testid="delete-file"
        @click="handleRemove"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </Button>
    </div>
  </div>
</template>
