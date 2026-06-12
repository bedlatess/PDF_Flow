import { PDFDocument } from 'pdf-lib'
import type { PDFMergeOptions } from '@/types/pdf'
import { pdfBytesToBlob } from './blob'

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
    const mergedPdf = await PDFDocument.create()
    const sortedFiles = options?.order
      ? options.order.map((index) => files[index])
      : files

    for (const file of sortedFiles) {
      if (!file) {
        throw new Error('Merge order references a missing file')
      }

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await PDFDocument.load(arrayBuffer)
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      copiedPages.forEach((page) => mergedPdf.addPage(page))
    }

    const pdfBytes = await mergedPdf.save()
    return pdfBytesToBlob(pdfBytes)
  } catch (error) {
    throw new Error(`Failed to merge PDFs: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function getPDFPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    return pdf.getPageCount()
  } catch (error) {
    throw new Error('Failed to get PDF page count')
  }
}

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
    throw new Error('Failed to get PDF info')
  }
}
