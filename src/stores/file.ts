import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface FileItem {
  id: string
  file: File
  preview?: string
  status: 'pending' | 'processing' | 'completed' | 'error'
}

export const useFileStore = defineStore('file', () => {
  const files = ref<FileItem[]>([])
  const currentFile = ref<FileItem | null>(null)

  const addFile = (file: File) => {
    const fileItem: FileItem = {
      id: crypto.randomUUID(),
      file,
      status: 'pending',
    }
    files.value.push(fileItem)
    return fileItem
  }

  const removeFile = (id: string) => {
    files.value = files.value.filter((f) => f.id !== id)
  }

  const clearFiles = () => {
    files.value = []
    currentFile.value = null
  }

  const updateFileStatus = (id: string, status: FileItem['status']) => {
    const file = files.value.find((f) => f.id === id)
    if (file) {
      file.status = status
    }
  }

  return {
    files,
    currentFile,
    addFile,
    removeFile,
    clearFiles,
    updateFileStatus,
  }
})
