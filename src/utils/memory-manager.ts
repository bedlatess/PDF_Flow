/**
 * 内存管理工具
 * 处理 Blob URL 和 ArrayBuffer 的清理，防止内存泄漏
 */

class MemoryManager {
  private objectURLs: Set<string> = new Set()
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  /**
   * 创建 Blob URL 并追踪
   */
  createObjectURL(blob: Blob): string {
    const url = URL.createObjectURL(blob)
    this.objectURLs.add(url)
    return url
  }

  /**
   * 释放单个 Object URL
   */
  revokeObjectURL(url: string): void {
    if (this.objectURLs.has(url)) {
      URL.revokeObjectURL(url)
      this.objectURLs.delete(url)

      const timer = this.timers.get(url)
      if (timer) {
        clearTimeout(timer)
        this.timers.delete(url)
      }
    }
  }

  /**
   * 创建带自动清理的 Object URL
   * @param blob Blob 对象
   * @param ttl 生存时间（毫秒），默认 15 分钟
   */
  createTemporaryURL(blob: Blob, ttl: number = 15 * 60 * 1000): string {
    const url = this.createObjectURL(blob)

    const timer = setTimeout(() => {
      this.revokeObjectURL(url)
    }, ttl)

    this.timers.set(url, timer)

    return url
  }

  /**
   * 释放所有追踪的 Object URLs
   */
  revokeAll(): void {
    this.objectURLs.forEach((url) => {
      URL.revokeObjectURL(url)
    })
    this.objectURLs.clear()

    this.timers.forEach((timer) => {
      clearTimeout(timer)
    })
    this.timers.clear()
  }

  /**
   * 获取当前追踪的 URL 数量
   */
  getTrackedCount(): number {
    return this.objectURLs.size
  }
}

// 单例导出
export const memoryManager = new MemoryManager()

// 组件卸载时的清理 Hook
export function useMemoryCleanup() {
  return {
    cleanup: () => memoryManager.revokeAll(),
  }
}
