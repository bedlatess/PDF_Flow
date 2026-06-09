import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { historyManager, formatToolType, formatHistoryTime } from '@/utils/history-manager'

describe('History Manager', () => {
  beforeEach(() => {
    historyManager.clearHistory()
  })

  afterEach(() => {
    historyManager.clearHistory()
  })

  describe('addHistory', () => {
    it('should add history item', () => {
      historyManager.addHistory({
        type: 'merge',
        fileName: 'test.pdf',
      })

      const history = historyManager.getHistory()
      expect(history.length).toBe(1)
      expect(history[0].type).toBe('merge')
      expect(history[0].fileName).toBe('test.pdf')
    })

    it('should add id and timestamp automatically', () => {
      historyManager.addHistory({
        type: 'split',
        fileName: 'doc.pdf',
      })

      const history = historyManager.getHistory()
      expect(history[0].id).toBeDefined()
      expect(history[0].timestamp).toBeDefined()
    })

    it('should limit history to max items', () => {
      // Add 25 items (max is 20)
      for (let i = 0; i < 25; i++) {
        historyManager.addHistory({
          type: 'merge',
          fileName: `test${i}.pdf`,
        })
      }

      const history = historyManager.getHistory()
      expect(history.length).toBe(20)
    })
  })

  describe('removeHistory', () => {
    it('should remove specific history item', () => {
      historyManager.addHistory({
        type: 'merge',
        fileName: 'test1.pdf',
      })
      historyManager.addHistory({
        type: 'split',
        fileName: 'test2.pdf',
      })

      const history = historyManager.getHistory()
      const idToRemove = history[0].id

      historyManager.removeHistory(idToRemove)

      const updatedHistory = historyManager.getHistory()
      expect(updatedHistory.length).toBe(1)
      expect(updatedHistory.find(item => item.id === idToRemove)).toBeUndefined()
    })
  })

  describe('clearHistory', () => {
    it('should clear all history', () => {
      historyManager.addHistory({ type: 'merge', fileName: 'test1.pdf' })
      historyManager.addHistory({ type: 'split', fileName: 'test2.pdf' })

      historyManager.clearHistory()

      const history = historyManager.getHistory()
      expect(history.length).toBe(0)
    })
  })

  describe('getHistoryByType', () => {
    it('should filter history by type', () => {
      historyManager.addHistory({ type: 'merge', fileName: 'test1.pdf' })
      historyManager.addHistory({ type: 'split', fileName: 'test2.pdf' })
      historyManager.addHistory({ type: 'merge', fileName: 'test3.pdf' })

      const mergeHistory = historyManager.getHistoryByType('merge')
      expect(mergeHistory.length).toBe(2)
      expect(mergeHistory.every(item => item.type === 'merge')).toBe(true)
    })
  })

  describe('getTodayHistory', () => {
    it('should get only today history', () => {
      historyManager.addHistory({ type: 'merge', fileName: 'today.pdf' })

      const todayHistory = historyManager.getTodayHistory()
      expect(todayHistory.length).toBe(1)
    })
  })

  describe('getStats', () => {
    it('should calculate statistics', () => {
      historyManager.addHistory({ type: 'merge', fileName: 'test1.pdf' })
      historyManager.addHistory({ type: 'split', fileName: 'test2.pdf' })
      historyManager.addHistory({ type: 'merge', fileName: 'test3.pdf' })

      const stats = historyManager.getStats()
      expect(stats.totalFiles).toBe(3)
      expect(stats.mostUsedTool).toBe('merge')
    })

    it('should calculate saved space for compress', () => {
      historyManager.addHistory({
        type: 'compress',
        fileName: 'large.pdf',
        fileSize: 5000000,
        resultSize: 4000000,
      })

      const stats = historyManager.getStats()
      expect(stats.totalSaved).toBe(1000000)
    })
  })
})

describe('History Utils', () => {
  describe('formatToolType', () => {
    it('should format tool types correctly', () => {
      expect(formatToolType('merge')).toBe('合并 PDF')
      expect(formatToolType('split')).toBe('拆分 PDF')
      expect(formatToolType('compress')).toBe('压缩 PDF')
    })
  })

  describe('formatHistoryTime', () => {
    it('should format recent time', () => {
      const now = Date.now()
      expect(formatHistoryTime(now - 30000)).toContain('刚刚')
    })

    it('should format minutes ago', () => {
      const now = Date.now()
      const result = formatHistoryTime(now - 5 * 60000)
      expect(result).toContain('分钟前')
    })

    it('should format hours ago', () => {
      const now = Date.now()
      const result = formatHistoryTime(now - 2 * 3600000)
      expect(result).toContain('小时前')
    })
  })
})
