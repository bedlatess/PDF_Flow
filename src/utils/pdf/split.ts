/**
 * PDF 拆分工具
 * 使用 pdf-lib 实现纯前端 PDF 拆分
 */

import { PDFDocument } from 'pdf-lib'
import type { PDFSplitOptions } from '@/types/pdf'

/**
 * 拆分 PDF 文件
 * @param file - PDF 文件
 * @param options - 拆分选项
 * @returns 拆分后的 PDF Blob 数组
 */
export async function splitPDF(
  file: File,
  options: PDFSplitOptions
): Promise<Blob[]> {
  if (!file) {
    throw new Error('No file provided for splitting')
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const sourcePdf = await PDFDocument.load(arrayBuffer)
    const totalPages = sourcePdf.getPageCount()

    // 解析页面范围
    const pageNumbers = options.pages || parsePageRanges(options.ranges || '', totalPages)

    if (pageNumbers.length === 0) {
      throw new Error('No valid pages specified for splitting')
    }

    // 验证页码
    const invalidPages = pageNumbers.filter((num) => num < 1 || num > totalPages)
    if (invalidPages.length > 0) {
      throw new Error(`Invalid page numbers: ${invalidPages.join(', ')}`)
    }

    const results: Blob[] = []

    // 为每个页面创建新的 PDF
    for (const pageNum of pageNumbers) {
      const newPdf = await PDFDocument.create()
      const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageNum - 1])
      newPdf.addPage(copiedPage)

      const pdfBytes = await newPdf.save()
      results.push(new Blob([pdfBytes as Uint8Array], { type: 'application/pdf' }))
    }

    return results
  } catch (error) {
    console.error('PDF split error:', error)
    throw new Error(`Failed to split PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 提取 PDF 页面范围到单个文件
 * @param file - PDF 文件
 * @param ranges - 页面范围字符串 (如 "1-3,5,7-9")
 * @returns 提取后的 PDF Blob
 */
export async function extractPDFPages(
  file: File,
  ranges: string
): Promise<Blob> {
  if (!file) {
    throw new Error('No file provided for extraction')
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const sourcePdf = await PDFDocument.load(arrayBuffer)
    const totalPages = sourcePdf.getPageCount()

    // 解析页面范围
    const pageNumbers = parsePageRanges(ranges, totalPages)

    if (pageNumbers.length === 0) {
      throw new Error('No valid pages specified for extraction')
    }

    // 验证页码
    const invalidPages = pageNumbers.filter((num) => num < 1 || num > totalPages)
    if (invalidPages.length > 0) {
      throw new Error(`Invalid page numbers: ${invalidPages.join(', ')}`)
    }

    // 创建新的 PDF 并复制指定页面
    const newPdf = await PDFDocument.create()
    const pageIndices = pageNumbers.map((num) => num - 1)
    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices)

    copiedPages.forEach((page) => {
      newPdf.addPage(page)
    })

    const pdfBytes = await newPdf.save()
    return new Blob([pdfBytes as Uint8Array], { type: 'application/pdf' })
  } catch (error) {
    console.error('PDF extract error:', error)
    throw new Error(`Failed to extract PDF pages: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 解析页面范围字符串
 * @param ranges - 范围字符串 (如 "1-3,5,7-9")
 * @param totalPages - 总页数
 * @returns 页码数组
 */
export function parsePageRanges(ranges: string, totalPages: number): number[] {
  if (!ranges || ranges.trim() === '') {
    return []
  }

  const pageSet = new Set<number>()

  // 分割逗号
  const parts = ranges.split(',').map((s) => s.trim())

  for (const part of parts) {
    if (part.includes('-')) {
      // 范围: "1-3"
      const [startStr, endStr] = part.split('-').map((s) => s.trim())
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)

      if (isNaN(start) || isNaN(end)) {
        console.warn(`Invalid range: ${part}`)
        continue
      }

      for (let i = start; i <= end && i <= totalPages; i++) {
        if (i >= 1) {
          pageSet.add(i)
        }
      }
    } else {
      // 单页: "5"
      const pageNum = parseInt(part, 10)
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        pageSet.add(pageNum)
      }
    }
  }

  // 排序并返回
  return Array.from(pageSet).sort((a, b) => a - b)
}

/**
 * 删除指定页面
 * @param file - PDF 文件
 * @param pagesToDelete - 要删除的页码数组
 * @returns 删除后的 PDF Blob
 */
export async function deletePDFPages(
  file: File,
  pagesToDelete: number[]
): Promise<Blob> {
  if (!file) {
    throw new Error('No file provided')
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    const totalPages = pdf.getPageCount()

    // 计算要保留的页面
    const pagesToKeep = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
      (num) => !pagesToDelete.includes(num)
    )

    if (pagesToKeep.length === 0) {
      throw new Error('Cannot delete all pages')
    }

    // 创建新 PDF 并复制保留的页面
    const newPdf = await PDFDocument.create()
    const pageIndices = pagesToKeep.map((num) => num - 1)
    const copiedPages = await newPdf.copyPages(pdf, pageIndices)

    copiedPages.forEach((page) => {
      newPdf.addPage(page)
    })

    const pdfBytes = await newPdf.save()
    return new Blob([pdfBytes as Uint8Array], { type: 'application/pdf' })
  } catch (error) {
    console.error('Delete pages error:', error)
    throw new Error(`Failed to delete pages: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
