import * as pdfjsLib from 'pdfjs-dist'
import { configurePdfJsWorker } from './configurePdfJs'

configurePdfJsWorker()

export interface ThumbnailOptions {
  scale?: number
  width?: number
  height?: number
  quality?: number
}

export async function generatePageThumbnail(
  file: File,
  pageNumber: number,
  options?: ThumbnailOptions
): Promise<string> {
  const { scale = 0.5, width, height, quality = 0.8 } = options || {}

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(pageNumber)
    let viewport = page.getViewport({ scale })

    if (width || height) {
      const targetWidth = width || (height! * viewport.width) / viewport.height
      const targetHeight = height || (width! * viewport.height) / viewport.width
      const scaleX = targetWidth / viewport.width
      const scaleY = targetHeight / viewport.height
      viewport = page.getViewport({ scale: Math.min(scaleX, scaleY) })
    }

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Failed to get canvas context')
    }

    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: context,
      viewport,
    }).promise

    return canvas.toDataURL('image/jpeg', quality)
  } catch (error) {
    throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function generateAllThumbnails(
  file: File,
  options?: ThumbnailOptions
): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const thumbnails: string[] = []

    for (let page = 1; page <= pdf.numPages; page += 1) {
      thumbnails.push(await generatePageThumbnail(file, page, options))
    }

    return thumbnails
  } catch (error) {
    throw new Error('Failed to generate thumbnails')
  }
}

export async function generateThumbnailsByPages(
  file: File,
  pages: number[],
  options?: ThumbnailOptions
): Promise<Map<number, string>> {
  const thumbnailMap = new Map<number, string>()

  try {
    for (const page of pages) {
      thumbnailMap.set(page, await generatePageThumbnail(file, page, options))
    }

    return thumbnailMap
  } catch (error) {
    throw new Error('Failed to generate thumbnails')
  }
}

class ThumbnailCache {
  private cache: Map<string, string> = new Map()
  private maxSize = 50

  private getCacheKey(fileId: string, pageNumber: number): string {
    return `${fileId}-${pageNumber}`
  }

  get(fileId: string, pageNumber: number): string | undefined {
    return this.cache.get(this.getCacheKey(fileId, pageNumber))
  }

  set(fileId: string, pageNumber: number, thumbnail: string): void {
    const key = this.getCacheKey(fileId, pageNumber)

    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, thumbnail)
  }

  clear(fileId?: string): void {
    if (fileId) {
      const keysToDelete: string[] = []
      this.cache.forEach((_, key) => {
        if (key.startsWith(`${fileId}-`)) {
          keysToDelete.push(key)
        }
      })
      keysToDelete.forEach((key) => this.cache.delete(key))
    } else {
      this.cache.clear()
    }
  }

  size(): number {
    return this.cache.size
  }
}

export const thumbnailCache = new ThumbnailCache()
