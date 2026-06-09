import { describe, it, expect } from 'vitest'
import { formatDate, formatTime } from '@/utils/format'

describe('Format Utils', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00')
      const formatted = formatDate(date)
      expect(formatted).toContain('Jan')
      expect(formatted).toContain('15')
      expect(formatted).toContain('2024')
    })

    it('should handle Date object', () => {
      const date = new Date(2024, 0, 15)
      const formatted = formatDate(date)
      expect(formatted).toContain('2024')
    })

    it('should handle string input', () => {
      const formatted = formatDate('2024-01-15')
      expect(formatted).toBeTruthy()
    })
  })

  describe('formatTime', () => {
    it('should format time correctly', () => {
      const date = new Date('2024-01-15T14:30:45')
      const formatted = formatTime(date)
      expect(formatted).toMatch(/\d{1,2}:\d{2}/)
    })

    it('should include AM/PM', () => {
      const date = new Date('2024-01-15T14:30:00')
      const formatted = formatTime(date)
      expect(formatted).toMatch(/AM|PM/)
    })
  })
})
