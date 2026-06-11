/**
 * PDF 旋转工具
 * 使用 pdf-lib 实现纯前端 PDF 页面旋转
 */

import { PDFDocument, degrees } from 'pdf-lib'
import type { PDFRotateOptions } from '@/types/pdf'
import { pdfBytesToBlob } from './blob'

/**
 * 旋转 PDF 页面
 * @param file - PDF 文件
 * @param options - 旋转选项
 * @returns 旋转后的 PDF Blob
 */
export async function rotatePDF(
  file: File,
  options: PDFRotateOptions
): Promise<Blob> {
  if (!file) {
    throw new Error('No file provided for rotation')
  }

  const { angle, pages } = options

  // 验证角度
  if (![90, 180, 270].includes(angle)) {
    throw new Error('Angle must be 90, 180, or 270 degrees')
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    const totalPages = pdf.getPageCount()

    // 如果没有指定页面，则旋转所有页面
    const pageIndices = pages && pages.length > 0
      ? pages.map((num) => num - 1)
      : Array.from({ length: totalPages }, (_, i) => i)

    // 验证页码
    const invalidIndices = pageIndices.filter((index) => index < 0 || index >= totalPages)
    if (invalidIndices.length > 0) {
      throw new Error(`Invalid page numbers: ${invalidIndices.map(i => i + 1).join(', ')}`)
    }

    // 旋转指定页面
    const allPages = pdf.getPages()
    pageIndices.forEach((index) => {
      const page = allPages[index]
      const currentRotation = page.getRotation().angle
      const newRotation = (currentRotation + angle) % 360
      page.setRotation(degrees(newRotation))
    })

    // 保存 PDF
    const pdfBytes = await pdf.save()
    return pdfBytesToBlob(pdfBytes)
  } catch (error) {
    console.error('PDF rotate error:', error)
    throw new Error(`Failed to rotate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 旋转所有页面
 * @param file - PDF 文件
 * @param angle - 旋转角度 (90, 180, 270)
 * @returns 旋转后的 PDF Blob
 */
export async function rotateAllPages(file: File, angle: 90 | 180 | 270): Promise<Blob> {
  return rotatePDF(file, { angle })
}

/**
 * 旋转单个页面
 * @param file - PDF 文件
 * @param pageNumber - 页码（从 1 开始）
 * @param angle - 旋转角度 (90, 180, 270)
 * @returns 旋转后的 PDF Blob
 */
export async function rotateSinglePage(
  file: File,
  pageNumber: number,
  angle: 90 | 180 | 270
): Promise<Blob> {
  return rotatePDF(file, { angle, pages: [pageNumber] })
}

/**
 * 重置页面旋转为 0 度
 * @param file - PDF 文件
 * @param pages - 要重置的页码数组（可选，默认所有页面）
 * @returns 重置后的 PDF Blob
 */
export async function resetRotation(file: File, pages?: number[]): Promise<Blob> {
  if (!file) {
    throw new Error('No file provided')
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    const totalPages = pdf.getPageCount()

    const pageIndices = pages && pages.length > 0
      ? pages.map((num) => num - 1)
      : Array.from({ length: totalPages }, (_, i) => i)

    // 重置旋转
    const allPages = pdf.getPages()
    pageIndices.forEach((index) => {
      if (index >= 0 && index < totalPages) {
        allPages[index].setRotation(degrees(0))
      }
    })

    const pdfBytes = await pdf.save()
    return pdfBytesToBlob(pdfBytes)
  } catch (error) {
    console.error('Reset rotation error:', error)
    throw new Error(`Failed to reset rotation: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 获取页面当前旋转角度
 * @param file - PDF 文件
 * @param pageNumber - 页码（从 1 开始）
 * @returns 旋转角度
 */
export async function getPageRotation(file: File, pageNumber: number): Promise<number> {
  if (!file) {
    throw new Error('No file provided')
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    const page = pdf.getPage(pageNumber - 1)
    return page.getRotation().angle
  } catch (error) {
    console.error('Get rotation error:', error)
    throw new Error('Failed to get page rotation')
  }
}
