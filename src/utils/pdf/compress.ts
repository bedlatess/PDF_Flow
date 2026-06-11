/**
 * PDF 压缩工具
 * 使用 pdf-lib 优化和压缩 PDF 文件
 */

import { PDFDocument } from 'pdf-lib'
import { pdfBytesToBlob } from './blob'

export type CompressionQuality = 'high' | 'medium' | 'low'

export interface CompressionOptions {
  quality?: CompressionQuality
  removeMetadata?: boolean
  optimizeImages?: boolean
}

export interface CompressionResult {
  compressedBlob: Blob
  originalSize: number
  compressedSize: number
  compressionRatio: number
}

/**
 * 压缩 PDF 文件
 * @param file - 原始 PDF 文件
 * @param options - 压缩选项
 * @returns 压缩结果
 */
export async function compressPDF(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const { quality = 'medium', removeMetadata = true } = options

  try {
    const originalSize = file.size

    // 读取 PDF
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)

    // 根据质量设置进行优化
    const optimizationLevel = getOptimizationLevel(quality)

    // 移除元数据（可选）
    if (removeMetadata) {
      pdfDoc.setTitle('')
      pdfDoc.setAuthor('')
      pdfDoc.setSubject('')
      pdfDoc.setKeywords([])
      pdfDoc.setProducer('')
      pdfDoc.setCreator('PDF-Flow')
    }

    // 保存优化后的 PDF
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: optimizationLevel >= 2,
      addDefaultPage: false,
      objectsPerTick: optimizationLevel >= 3 ? 50 : 100,
    })

    const compressedSize = pdfBytes.length
    const compressedBlob = pdfBytesToBlob(pdfBytes)
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100

    return {
      compressedBlob,
      originalSize,
      compressedSize,
      compressionRatio: Math.max(0, compressionRatio),
    }
  } catch (error) {
    console.error('PDF compression error:', error)
    throw new Error(`Failed to compress PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 批量压缩 PDF 文件
 * @param files - PDF 文件数组
 * @param options - 压缩选项
 * @returns 压缩结果数组
 */
export async function compressPDFBatch(
  files: File[],
  options: CompressionOptions = {}
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = []

  for (const file of files) {
    try {
      const result = await compressPDF(file, options)
      results.push(result)
    } catch (error) {
      console.error(`Failed to compress ${file.name}:`, error)
      // 如果单个文件失败，继续处理其他文件
      results.push({
        compressedBlob: file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 0,
      })
    }
  }

  return results
}

/**
 * 获取优化级别
 */
function getOptimizationLevel(quality: CompressionQuality): number {
  switch (quality) {
    case 'high':
      return 1 // 轻度压缩，保持高质量
    case 'medium':
      return 2 // 中度压缩，平衡质量和大小
    case 'low':
      return 3 // 强度压缩，最小文件大小
    default:
      return 2
  }
}

/**
 * 估算压缩效果
 * @param fileSize - 文件大小（字节）
 * @param quality - 压缩质量
 * @returns 估算的压缩比例（百分比）
 */
export function estimateCompressionRatio(
  _fileSize: number,
  quality: CompressionQuality
): number {
  // 基于经验的估算值
  const ratios: Record<CompressionQuality, number> = {
    high: 10, // 约 10% 压缩
    medium: 20, // 约 20% 压缩
    low: 30, // 约 30% 压缩
  }

  return ratios[quality]
}

/**
 * 格式化压缩信息
 */
export function formatCompressionInfo(result: CompressionResult): {
  originalSizeText: string
  compressedSizeText: string
  savedSizeText: string
  ratioText: string
} {
  const formatSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024)
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`
    }
    const kb = bytes / 1024
    return `${kb.toFixed(2)} KB`
  }

  const savedSize = result.originalSize - result.compressedSize

  return {
    originalSizeText: formatSize(result.originalSize),
    compressedSizeText: formatSize(result.compressedSize),
    savedSizeText: formatSize(savedSize),
    ratioText: `${result.compressionRatio.toFixed(1)}%`,
  }
}
