import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { historyManager } from '@/utils/history-manager'

describe('History Manager', () => {
  beforeEach(() => {
    historyManager.clearHistory()
  })

  afterEach(() => {
    historyManager.clearHistory()
  })

  describe('addHistory', () => {
    it('adds history item', () => {
      historyManager.addHistory({
        type: 'merge',
        fileName: 'test.pdf',
      })

      const history = historyManager.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].type).toBe('merge')
      expect(history[0].fileName).toBe('test.pdf')
    })

    it('adds id and timestamp automatically', () => {
      historyManager.addHistory({
        type: 'split',
        fileName: 'doc.pdf',
      })

      const [item] = historyManager.getHistory()
      expect(item.id).toBeTruthy()
      expect(item.timestamp).toEqual(expect.any(Number))
    })

    it('limits history to max items', () => {
      for (let index = 0; index < 25; index += 1) {
        historyManager.addHistory({
          type: 'merge',
          fileName: `test${index}.pdf`,
        })
      }

      const history = historyManager.getHistory()
      expect(history).toHaveLength(20)
      expect(history[0].fileName).toBe('test24.pdf')
    })
  })

  describe('removeHistory', () => {
    it('removes a specific history item', () => {
      historyManager.addHistory({
        type: 'merge',
        fileName: 'test1.pdf',
      })
      historyManager.addHistory({
        type: 'split',
        fileName: 'test2.pdf',
      })

      const idToRemove = historyManager.getHistory()[0].id

      historyManager.removeHistory(idToRemove)

      const updatedHistory = historyManager.getHistory()
      expect(updatedHistory).toHaveLength(1)
      expect(updatedHistory.find((item) => item.id === idToRemove)).toBeUndefined()
    })
  })

  describe('clearHistory', () => {
    it('clears all history', () => {
      historyManager.addHistory({ type: 'merge', fileName: 'test1.pdf' })
      historyManager.addHistory({ type: 'split', fileName: 'test2.pdf' })

      historyManager.clearHistory()

      expect(historyManager.getHistory()).toHaveLength(0)
    })
  })

  describe('getHistoryByType', () => {
    it('filters history by type', () => {
      historyManager.addHistory({ type: 'merge', fileName: 'test1.pdf' })
      historyManager.addHistory({ type: 'split', fileName: 'test2.pdf' })
      historyManager.addHistory({ type: 'merge', fileName: 'test3.pdf' })

      const mergeHistory = historyManager.getHistoryByType('merge')
      expect(mergeHistory).toHaveLength(2)
      expect(mergeHistory.every((item) => item.type === 'merge')).toBe(true)
    })
  })

  describe('getTodayHistory', () => {
    it('returns only today history', () => {
      historyManager.addHistory({ type: 'merge', fileName: 'today.pdf' })

      expect(historyManager.getTodayHistory()).toHaveLength(1)
    })
  })

  describe('getStats', () => {
    it('calculates statistics', () => {
      historyManager.addHistory({ type: 'merge', fileName: 'test1.pdf' })
      historyManager.addHistory({ type: 'split', fileName: 'test2.pdf' })
      historyManager.addHistory({ type: 'merge', fileName: 'test3.pdf' })

      const stats = historyManager.getStats()
      expect(stats.totalFiles).toBe(3)
      expect(stats.todayFiles).toBe(3)
      expect(stats.mostUsedTool).toBe('merge')
    })

    it('calculates saved space for compressed files', () => {
      historyManager.addHistory({
        type: 'compress',
        fileName: 'large.pdf',
        fileSize: 5_000_000,
        resultSize: 4_000_000,
      })

      expect(historyManager.getStats().totalSaved).toBe(1_000_000)
    })
  })
})
