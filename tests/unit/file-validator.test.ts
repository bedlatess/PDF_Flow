import { describe, it, expect } from 'vitest'
import { formatFileSize } from '@/utils/file-validator'

describe('File Validator Utils', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(500)).toBe('500 Bytes')
    })

    it('should format to KB', () => {
      const result = formatFileSize(1024)
      expect(result).toContain('KB')
    })

    it('should format to MB', () => {
      const result = formatFileSize(1048576)
      expect(result).toContain('MB')
    })

    it('should format to GB', () => {
      const result = formatFileSize(1073741824)
      expect(result).toContain('GB')
    })

    it('should handle large numbers', () => {
      const result = formatFileSize(5242880)
      expect(result).toBeTruthy()
      expect(result).toContain('MB')
    })
  })
})
