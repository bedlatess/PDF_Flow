<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { validatePDF, validateImage } from '@/utils/file-validator'

interface DragDropZoneProps {
  accept?: 'pdf' | 'image' | 'all'
  multiple?: boolean
  maxSize?: number // MB
  maxFiles?: number
}

const props = withDefaults(defineProps<DragDropZoneProps>(), {
  accept: 'pdf',
  multiple: true,
  maxSize: 100, // 100MB
  maxFiles: 10,
})

const emit = defineEmits<{
  filesSelected: [files: File[]]
  error: [message: string]
}>()

const { t } = useI18n()
const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement>()

const acceptedTypes = computed(() => {
  switch (props.accept) {
    case 'pdf':
      return 'application/pdf'
    case 'image':
      return 'image/*'
    case 'all':
      return 'application/pdf,image/*'
    default:
      return 'application/pdf'
  }
})

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
}

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false

  const files = Array.from(e.dataTransfer?.files || [])
  await processFiles(files)
}

const handleFileSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  await processFiles(files)

  // 重置 input，允许选择同一文件
  input.value = ''
}

const processFiles = async (files: File[]) => {
  if (files.length === 0) {
    return
  }

  // 检查文件数量
  if (files.length > props.maxFiles) {
    emit('error', `最多只能上传 ${props.maxFiles} 个文件`)
    return
  }

  // 验证文件
  const validFiles: File[] = []

  for (const file of files) {
    // 检查文件大小
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > props.maxSize) {
      emit('error', `文件 "${file.name}" 超过最大限制 ${props.maxSize}MB`)
      continue
    }

    // 验证文件类型
    let isValid = false

    if (props.accept === 'pdf' || props.accept === 'all') {
      isValid = await validatePDF(file)
    }

    if (!isValid && (props.accept === 'image' || props.accept === 'all')) {
      isValid = await validateImage(file)
    }

    if (!isValid) {
      emit('error', `文件 "${file.name}" 格式无效`)
      continue
    }

    validFiles.push(file)
  }

  if (validFiles.length > 0) {
    emit('filesSelected', validFiles)
  }
}

const openFileDialog = () => {
  fileInputRef.value?.click()
}
</script>

<template>
  <div
    data-testid="drag-drop-zone"
    :class="[
      'drag-ripple relative flex min-h-[400px] flex-col items-center justify-center',
      'rounded-xl border-2 border-dashed transition-all duration-300',
      'cursor-pointer hover:border-primary hover:bg-primary/5',
      {
        'drag-active border-primary bg-primary/10': isDragging,
        'border-gray-300 dark:border-gray-600': !isDragging,
      },
    ]"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @click="openFileDialog"
  >
    <!-- Icon -->
    <div
      :class="[
        'mb-4 rounded-full p-4 transition-all duration-300',
        isDragging
          ? 'bg-primary/20 text-primary scale-110'
          : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
      ]"
    >
      <svg
        class="h-12 w-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
    </div>

    <!-- Text -->
    <div class="text-center">
      <p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
        {{ t('common.dragDrop') }}
      </p>
      <p class="mb-1 text-sm text-gray-500 dark:text-gray-400">
        或点击选择文件
      </p>
      <p class="text-xs text-gray-400 dark:text-gray-500">
        支持
        <template v-if="accept === 'pdf'">
          PDF
        </template>
        <template v-else-if="accept === 'image'">
          图片
        </template>
        <template v-else>
          PDF 和图片
        </template>
        文件，最大 {{ maxSize }}MB
      </p>
    </div>

    <!-- Privacy Badge -->
    <div class="mt-6">
      <span
        class="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
      >
        {{ t('common.privacyBadge') }}
      </span>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      :accept="acceptedTypes"
      :multiple="multiple"
      @change="handleFileSelect"
    >

    <!-- Slot for additional content -->
    <div
      v-if="$slots.default"
      class="mt-4"
    >
      <slot />
    </div>
  </div>
</template>
