/**
 * 历史记录管理
 * 保存最近处理的文件记录
 */

export interface HistoryItem {
  id: string
  type: 'merge' | 'split' | 'rotate' | 'compress' | 'imageToPdf' | 'pdfToImage' | 'watermark'
  fileName: string
  timestamp: number
  fileSize?: number
  resultSize?: number
}

const STORAGE_KEY = 'pdf-flow-history'
const MAX_HISTORY_ITEMS = 20

class HistoryManager {
  /**
   * 添加历史记录
   */
  addHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>): void {
    const history = this.getHistory()

    const newItem: HistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    }

    history.unshift(newItem)

    // 限制历史记录数量
    if (history.length > MAX_HISTORY_ITEMS) {
      history.splice(MAX_HISTORY_ITEMS)
    }

    this.saveHistory(history)
  }

  /**
   * 获取历史记录
   */
  getHistory(): HistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return []
      return JSON.parse(data) as HistoryItem[]
    } catch (error) {
      console.error('Failed to load history:', error)
      return []
    }
  }

  /**
   * 清除单条历史记录
   */
  removeHistory(id: string): void {
    const history = this.getHistory()
    const filtered = history.filter(item => item.id !== id)
    this.saveHistory(filtered)
  }

  /**
   * 清除所有历史记录
   */
  clearHistory(): void {
    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * 保存历史记录
   */
  private saveHistory(history: HistoryItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch (error) {
      console.error('Failed to save history:', error)
    }
  }

  /**
   * 获取按类型分组的历史记录
   */
  getHistoryByType(type: HistoryItem['type']): HistoryItem[] {
    return this.getHistory().filter(item => item.type === type)
  }

  /**
   * 获取今天的历史记录
   */
  getTodayHistory(): HistoryItem[] {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    return this.getHistory().filter(item => item.timestamp >= todayTimestamp)
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalFiles: number
    todayFiles: number
    mostUsedTool: string
    totalSaved?: number
  } {
    const history = this.getHistory()
    const todayHistory = this.getTodayHistory()

    // 统计最常用工具
    const toolCount: Record<string, number> = {}
    history.forEach(item => {
      toolCount[item.type] = (toolCount[item.type] || 0) + 1
    })

    const mostUsedTool = Object.entries(toolCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none'

    // 计算节省的总空间（仅压缩功能）
    const totalSaved = history
      .filter(item => item.type === 'compress' && item.fileSize && item.resultSize)
      .reduce((sum, item) => sum + (item.fileSize! - item.resultSize!), 0)

    return {
      totalFiles: history.length,
      todayFiles: todayHistory.length,
      mostUsedTool,
      totalSaved: totalSaved > 0 ? totalSaved : undefined,
    }
  }
}

export const historyManager = new HistoryManager()

/**
 * 格式化工具类型名称
 */
export function formatToolType(type: HistoryItem['type']): string {
  const typeNames: Record<HistoryItem['type'], string> = {
    merge: '合并 PDF',
    split: '拆分 PDF',
    rotate: '旋转 PDF',
    compress: '压缩 PDF',
    imageToPdf: '图片转 PDF',
    pdfToImage: 'PDF 转图片',
    watermark: '添加水印',
  }
  return typeNames[type]
}

/**
 * 格式化时间
 */
export function formatHistoryTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`

  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}
