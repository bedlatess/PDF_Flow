/**
 * PDF compression helpers.
 *
 * pdf-lib can remove metadata and rewrite object streams, but it does not
 * recompress every embedded image. For already-optimized PDFs, rewriting can
 * produce a larger file, so we protect users by keeping the original blob.
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
  optimized: boolean
}

export async function compressPDF(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const { quality = 'medium', removeMetadata = true } = options

  try {
    const originalSize = file.size
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const optimizationLevel = getOptimizationLevel(quality)

    if (removeMetadata) {
      pdfDoc.setTitle('')
      pdfDoc.setAuthor('')
      pdfDoc.setSubject('')
      pdfDoc.setKeywords([])
      pdfDoc.setProducer('')
      pdfDoc.setCreator('PDF-Flow')
    }

    const pdfBytes = await pdfDoc.save({
      useObjectStreams: optimizationLevel >= 2,
      addDefaultPage: false,
      objectsPerTick: optimizationLevel >= 3 ? 50 : 100,
    })

    const optimizedSize = pdfBytes.length
    if (optimizedSize >= originalSize) {
      return {
        compressedBlob: file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        optimized: false,
      }
    }

    const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100
    return {
      compressedBlob: pdfBytesToBlob(pdfBytes),
      originalSize,
      compressedSize: optimizedSize,
      compressionRatio: Math.max(0, compressionRatio),
      optimized: true,
    }
  } catch (error) {
    throw new Error(`Failed to compress PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

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
      results.push({
        compressedBlob: file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 0,
        optimized: false,
      })
    }
  }

  return results
}

function getOptimizationLevel(quality: CompressionQuality): number {
  switch (quality) {
    case 'high':
      return 1
    case 'medium':
      return 2
    case 'low':
      return 3
    default:
      return 2
  }
}

export function estimateCompressionRatio(
  _fileSize: number,
  quality: CompressionQuality
): number {
  const ratios: Record<CompressionQuality, number> = {
    high: 10,
    medium: 20,
    low: 30,
  }

  return ratios[quality]
}

export function formatCompressionInfo(result: CompressionResult): {
  originalSizeText: string
  compressedSizeText: string
  savedSizeText: string
  ratioText: string
} {
  const formatSize = (bytes: number): string => {
    const safeBytes = Math.max(bytes, 0)
    const mb = safeBytes / (1024 * 1024)
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`
    }
    const kb = safeBytes / 1024
    return `${kb.toFixed(2)} KB`
  }

  const savedSize = Math.max(result.originalSize - result.compressedSize, 0)

  return {
    originalSizeText: formatSize(result.originalSize),
    compressedSizeText: formatSize(result.compressedSize),
    savedSizeText: formatSize(savedSize),
    ratioText: `${Math.max(result.compressionRatio, 0).toFixed(1)}%`,
  }
}
