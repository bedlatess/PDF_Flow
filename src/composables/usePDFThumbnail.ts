/**
 * PDF 缩略图组合式函数
 * 封装缩略图生成逻辑，提供响应式状态
 */

import { ref, computed } from 'vue'
import { generatePageThumbnail, thumbnailCache, type ThumbnailOptions } from '@/utils/pdf/thumbnail'

export interface UseThumbnailOptions extends ThumbnailOptions {
  useCache?: boolean // 是否使用缓存，默认 true
}

export function usePDFThumbnail() {
  const thumbnails = ref<Map<string, string>>(new Map())
  const loading = ref(false)
  const error = ref<string>('')

  /**
   * 生成文件 ID（用于缓存）
   */
  const getFileId = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`
  }

  /**
   * 生成单个页面缩略图
   */
  const generateThumbnail = async (
    file: File,
    pageNumber: number,
    options?: UseThumbnailOptions
  ): Promise<string | null> => {
    const { useCache = true, ...thumbnailOptions } = options || {}
    const fileId = getFileId(file)
    const cacheKey = `${fileId}-${pageNumber}`

    // 检查缓存
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

      // 保存到缓存
      if (useCache) {
        thumbnailCache.set(fileId, pageNumber, thumbnail)
      }

      thumbnails.value.set(cacheKey, thumbnail)
      return thumbnail
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to generate thumbnail'
      console.error('Thumbnail generation error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 批量生成缩略图
   */
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
      console.error('Multiple thumbnails generation error:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取缩略图
   */
  const getThumbnail = (file: File, pageNumber: number): string | undefined => {
    const fileId = getFileId(file)
    const cacheKey = `${fileId}-${pageNumber}`
    return thumbnails.value.get(cacheKey)
  }

  /**
   * 清除缩略图
   */
  const clearThumbnails = (file?: File): void => {
    if (file) {
      const fileId = getFileId(file)
      thumbnailCache.clear(fileId)

      // 清除本地状态
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

  /**
   * 缓存统计
   */
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
