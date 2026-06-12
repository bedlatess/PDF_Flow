import { ref, computed } from 'vue'
import { generatePageThumbnail, thumbnailCache, type ThumbnailOptions } from '@/utils/pdf/thumbnail'

export interface UseThumbnailOptions extends ThumbnailOptions {
  useCache?: boolean
}

export function usePDFThumbnail() {
  const thumbnails = ref<Map<string, string>>(new Map())
  const loading = ref(false)
  const error = ref<string>('')

  const getFileId = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`
  }

  const generateThumbnail = async (
    file: File,
    pageNumber: number,
    options?: UseThumbnailOptions
  ): Promise<string | null> => {
    const { useCache = true, ...thumbnailOptions } = options || {}
    const fileId = getFileId(file)
    const cacheKey = `${fileId}-${pageNumber}`

    if (useCache) {
      const cached = thumbnailCache.get(fileId, pageNumber)
      if (cached) {
        thumbnails.value.set(cacheKey, cached)
        return cached
      }
    }

    loading.value = true
    error.value = ''

    try {
      const thumbnail = await generatePageThumbnail(file, pageNumber, thumbnailOptions)

      if (useCache) {
        thumbnailCache.set(fileId, pageNumber, thumbnail)
      }

      thumbnails.value.set(cacheKey, thumbnail)
      return thumbnail
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to generate thumbnail'
      return null
    } finally {
      loading.value = false
    }
  }

  const generateMultipleThumbnails = async (
    file: File,
    pageNumbers: number[],
    options?: UseThumbnailOptions
  ): Promise<void> => {
    loading.value = true
    error.value = ''

    try {
      const promises = pageNumbers.map((pageNum) => generateThumbnail(file, pageNum, options))
      await Promise.all(promises)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to generate thumbnails'
    } finally {
      loading.value = false
    }
  }

  const getThumbnail = (file: File, pageNumber: number): string | undefined => {
    const fileId = getFileId(file)
    const cacheKey = `${fileId}-${pageNumber}`
    return thumbnails.value.get(cacheKey)
  }

  const clearThumbnails = (file?: File): void => {
    if (file) {
      const fileId = getFileId(file)
      thumbnailCache.clear(fileId)

      const keysToDelete: string[] = []
      thumbnails.value.forEach((_, key) => {
        if (key.startsWith(`${fileId}-`)) {
          keysToDelete.push(key)
        }
      })
      keysToDelete.forEach((key) => thumbnails.value.delete(key))
    } else {
      thumbnailCache.clear()
      thumbnails.value.clear()
    }
  }

  const cacheStats = computed(() => ({
    size: thumbnails.value.size,
    globalCacheSize: thumbnailCache.size(),
  }))

  return {
    thumbnails,
    loading,
    error,
    generateThumbnail,
    generateMultipleThumbnails,
    getThumbnail,
    clearThumbnails,
    cacheStats,
  }
}
