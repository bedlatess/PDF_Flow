export type HistoryToolType =
  | 'merge'
  | 'split'
  | 'rotate'
  | 'compress'
  | 'imageToPdf'
  | 'pdfToImage'
  | 'deletePages'
  | 'organize'
  | 'pageNumbers'
  | 'crop'
  | 'protect'
  | 'unlock'
  | 'sign'
  | 'extractText'
  | 'extractImages'
  | 'watermark'
  | 'flatten'
  | 'repair'

export interface HistoryItem {
  id: string
  type: HistoryToolType
  fileName: string
  timestamp: number
  fileSize?: number
  resultSize?: number
}

export interface HistoryStats {
  totalFiles: number
  todayFiles: number
  mostUsedTool: HistoryToolType | null
  totalSaved?: number
}

const STORAGE_KEY = 'pdf-flow-history'
const MAX_HISTORY_ITEMS = 20

class HistoryManager {
  addHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>): void {
    const history = this.getHistory()

    const newItem: HistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      timestamp: Date.now(),
    }

    history.unshift(newItem)

    if (history.length > MAX_HISTORY_ITEMS) {
      history.splice(MAX_HISTORY_ITEMS)
    }

    this.saveHistory(history)
  }

  getHistory(): HistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return []
      return JSON.parse(data) as HistoryItem[]
    } catch (error) {
      return []
    }
  }

  removeHistory(id: string): void {
    const history = this.getHistory()
    this.saveHistory(history.filter((item) => item.id !== id))
  }

  clearHistory(): void {
    localStorage.removeItem(STORAGE_KEY)
  }

  getHistoryByType(type: HistoryToolType): HistoryItem[] {
    return this.getHistory().filter((item) => item.type === type)
  }

  getTodayHistory(history = this.getHistory()): HistoryItem[] {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return history.filter((item) => item.timestamp >= today.getTime())
  }

  getStats(history = this.getHistory()): HistoryStats {
    const todayHistory = this.getTodayHistory(history)

    const toolCount: Partial<Record<HistoryToolType, number>> = {}
    history.forEach((item) => {
      toolCount[item.type] = (toolCount[item.type] || 0) + 1
    })

    const mostUsedTool = Object.entries(toolCount).sort((a, b) => b[1] - a[1])[0]?.[0] as
      | HistoryToolType
      | undefined

    const totalSaved = history
      .filter((item) => item.type === 'compress' && item.fileSize && item.resultSize)
      .reduce((sum, item) => sum + Math.max(item.fileSize! - item.resultSize!, 0), 0)

    return {
      totalFiles: history.length,
      todayFiles: todayHistory.length,
      mostUsedTool: mostUsedTool || null,
      totalSaved: totalSaved > 0 ? totalSaved : undefined,
    }
  }

  private saveHistory(history: HistoryItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch (error) {
    }
  }
}

export const historyManager = new HistoryManager()
