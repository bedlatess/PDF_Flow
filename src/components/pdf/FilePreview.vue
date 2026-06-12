<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Eye, FileText, Trash2 } from 'lucide-vue-next'
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

const hasImageExtension = (name: string) => /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)

const isPdf = computed(() => props.file.type === 'application/pdf')
const isImage = computed(() => {
  if (props.file.type.startsWith('image/')) {
    return true
  }

  return hasImageExtension(props.file.name)
})
const fileSize = computed(() => formatFileSize(props.file.size))

onMounted(() => {
  if (isImage.value) {
    thumbnailUrl.value = URL.createObjectURL(props.file)
  }
})

onUnmounted(() => {
  if (thumbnailUrl.value) {
    URL.revokeObjectURL(thumbnailUrl.value)
  }
})

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
    class="group relative flex items-center gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
  >
    <div class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="file.name"
        class="h-full w-full rounded-md object-cover"
      >
      <FileText
        v-else
        class="h-8 w-8 text-error"
        aria-hidden="true"
      />
    </div>

    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">
        {{ file.name }}
      </p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {{ fileSize }}
      </p>
    </div>

    <div
      v-if="showActions"
      class="flex items-center gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
    >
      <Button
        v-if="isPdf"
        variant="ghost"
        size="sm"
        :aria-label="`Preview ${file.name}`"
        title="Preview PDF"
        @click="handlePreview"
      >
        <Eye
          class="h-4 w-4"
          aria-hidden="true"
        />
      </Button>
      <Button
        v-if="removable"
        variant="ghost"
        size="sm"
        data-testid="delete-file"
        :aria-label="`Remove ${file.name}`"
        title="Remove file"
        @click="handleRemove"
      >
        <Trash2
          class="h-4 w-4"
          aria-hidden="true"
        />
      </Button>
    </div>
  </div>
</template>
