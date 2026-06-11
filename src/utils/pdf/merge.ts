/**
 * PDF 合并工具
 * 使用 pdf-lib 实现纯前端 PDF 合并
 */

import { PDFDocument } from 'pdf-lib'
import type { PDFMergeOptions } from '@/types/pdf'
import { pdfBytesToBlob } from './blob'

/**
 * 合并多个 PDF 文件
 * @param files - PDF 文件数组
 * @param options - 合并选项
 * @returns 合并后的 PDF Blob
 */
export async function mergePDFs(
  files: File[],
  options?: PDFMergeOptions
): Promise<Blob> {
  if (!files || files.length === 0) {
    throw new Error('No files provided for merging')
  }

  if (files.length === 1) {
    return files[0]
  }

  try {
    // 创建新的 PDF 文档
    const mergedPdf = await PDFDocument.create()

    // 按照 order 排序（如果提供）
    const sortedFiles = options?.order
      ? options.order.map((index) => files[index])
      : files

    // 遍历每个文件
    for (const file of sortedFiles) {
      // 读取 PDF 文件
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await PDFDocument.load(arrayBuffer)

      // 复制所有页面
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())

      // 添加到合并的文档
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page)
      })
    }

    // 保存合并后的 PDF
    const pdfBytes = await mergedPdf.save()

    // 返回 Blob
    return pdfBytesToBlob(pdfBytes)
  } catch (error) {
    console.error('PDF merge error:', error)
    throw new Error(`Failed to merge PDFs: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 获取 PDF 页面数量
 * @param file - PDF 文件
 * @returns 页面数量
 */
export async function getPDFPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    return pdf.getPageCount()
  } catch (error) {
    console.error('Get page count error:', error)
    throw new Error('Failed to get PDF page count')
  }
}

/**
 * 获取 PDF 文档信息
 * @param file - PDF 文件
 * @returns PDF 文档信息
 */
export async function getPDFInfo(file: File): Promise<{
  pageCount: number
  title?: string
  author?: string
  subject?: string
  creator?: string
  producer?: string
  creationDate?: Date
  modificationDate?: Date
}> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)

    return {
      pageCount: pdf.getPageCount(),
      title: pdf.getTitle(),
      author: pdf.getAuthor(),
      subject: pdf.getSubject(),
      creator: pdf.getCreator(),
      producer: pdf.getProducer(),
      creationDate: pdf.getCreationDate(),
      modificationDate: pdf.getModificationDate(),
    }
  } catch (error) {
    console.error('Get PDF info error:', error)
    throw new Error('Failed to get PDF info')
  }
}
