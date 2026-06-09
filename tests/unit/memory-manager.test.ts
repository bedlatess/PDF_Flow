import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { memoryManager } from '@/utils/memory-manager'

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-url-' + Math.random())
global.URL.revokeObjectURL = vi.fn()

describe('Memory Manager', () => {
  beforeEach(() => {
    // Clear any existing URLs
    memoryManager.revokeAll()
    vi.clearAllMocks()
  })

  afterEach(() => {
    memoryManager.revokeAll()
  })

  describe('createTemporaryURL', () => {
    it('should create object URL for blob', () => {
      const blob = new Blob(['test content'], { type: 'application/pdf' })
      const url = memoryManager.createTemporaryURL(blob)

      expect(url).toBeTruthy()
      expect(url).toMatch(/^blob:/)
    })

    it('should track created URLs', () => {
      const blob1 = new Blob(['content1'])
      const blob2 = new Blob(['content2'])

      const url1 = memoryManager.createTemporaryURL(blob1)
      const url2 = memoryManager.createTemporaryURL(blob2)

      expect(url1).not.toBe(url2)
      expect(memoryManager.getTrackedCount()).toBe(2)
    })
  })

  describe('revokeObjectURL', () => {
    it('should revoke object URL', () => {
      const blob = new Blob(['test'])
      const url = memoryManager.createTemporaryURL(blob)

      expect(memoryManager.getTrackedCount()).toBe(1)
      memoryManager.revokeObjectURL(url)
      expect(memoryManager.getTrackedCount()).toBe(0)
    })

    it('should handle revoking non-existent URL', () => {
      expect(() => {
        memoryManager.revokeObjectURL('blob:fake-url')
      }).not.toThrow()
    })
  })

  describe('revokeAll', () => {
    it('should clear all tracked URLs', () => {
      const blob1 = new Blob(['content1'])
      const blob2 = new Blob(['content2'])

      memoryManager.createTemporaryURL(blob1)
      memoryManager.createTemporaryURL(blob2)

      expect(memoryManager.getTrackedCount()).toBe(2)
      memoryManager.revokeAll()
      expect(memoryManager.getTrackedCount()).toBe(0)
    })
  })

  describe('getTrackedCount', () => {
    it('should return number of tracked URLs', () => {
      expect(memoryManager.getTrackedCount()).toBe(0)

      const blob = new Blob(['test'])
      memoryManager.createTemporaryURL(blob)

      expect(memoryManager.getTrackedCount()).toBe(1)
    })
  })
})
