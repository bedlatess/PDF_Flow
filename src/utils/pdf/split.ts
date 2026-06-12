import { PDFDocument } from 'pdf-lib'
import type { PDFSplitOptions } from '@/types/pdf'
import { pdfBytesToBlob } from './blob'

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
    const pageNumbers = options.pages || parsePageRanges(options.ranges || '', totalPages)

    validatePageList(pageNumbers, totalPages, 'splitting')

    const results: Blob[] = []
    for (const pageNum of pageNumbers) {
      const newPdf = await PDFDocument.create()
      const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageNum - 1])
      newPdf.addPage(copiedPage)

      const pdfBytes = await newPdf.save()
      results.push(pdfBytesToBlob(pdfBytes))
    }

    return results
  } catch (error) {
    throw new Error(`Failed to split PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

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
    const pageNumbers = parsePageRanges(ranges, totalPages)

    validatePageList(pageNumbers, totalPages, 'extraction')

    const newPdf = await PDFDocument.create()
    const pageIndices = pageNumbers.map((num) => num - 1)
    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices)
    copiedPages.forEach((page) => newPdf.addPage(page))

    const pdfBytes = await newPdf.save()
    return pdfBytesToBlob(pdfBytes)
  } catch (error) {
    throw new Error(`Failed to extract PDF pages: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function parsePageRanges(ranges: string, totalPages: number): number[] {
  if (!ranges || ranges.trim() === '') {
    return []
  }

  const pageSet = new Set<number>()
  const parts = ranges.split(',').map((part) => part.trim())

  for (const part of parts) {
    if (!part) {
      continue
    }

    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((value) => value.trim())
      const start = Number.parseInt(startStr, 10)
      const end = Number.parseInt(endStr, 10)

      if (Number.isNaN(start) || Number.isNaN(end)) {
        continue
      }

      for (let page = start; page <= end && page <= totalPages; page += 1) {
        if (page >= 1) {
          pageSet.add(page)
        }
      }
    } else {
      const page = Number.parseInt(part, 10)
      if (!Number.isNaN(page) && page >= 1 && page <= totalPages) {
        pageSet.add(page)
      }
    }
  }

  return Array.from(pageSet).sort((a, b) => a - b)
}

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
    const pagesToKeep = Array.from({ length: totalPages }, (_, index) => index + 1)
      .filter((page) => !pagesToDelete.includes(page))

    if (pagesToKeep.length === 0) {
      throw new Error('Cannot delete all pages')
    }

    const newPdf = await PDFDocument.create()
    const pageIndices = pagesToKeep.map((page) => page - 1)
    const copiedPages = await newPdf.copyPages(pdf, pageIndices)
    copiedPages.forEach((page) => newPdf.addPage(page))

    const pdfBytes = await newPdf.save()
    return pdfBytesToBlob(pdfBytes)
  } catch (error) {
    throw new Error(`Failed to delete pages: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function reorderPDFPages(
  file: File,
  orderedPages: number[]
): Promise<Blob> {
  if (!file) {
    throw new Error('No file provided')
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const sourcePdf = await PDFDocument.load(arrayBuffer)
    const totalPages = sourcePdf.getPageCount()

    if (orderedPages.length !== totalPages) {
      throw new Error('Page order must include every page exactly once')
    }

    const uniquePages = new Set(orderedPages)
    if (uniquePages.size !== totalPages) {
      throw new Error('Page order contains duplicate pages')
    }

    const invalidPages = orderedPages.filter((page) => page < 1 || page > totalPages)
    if (invalidPages.length > 0) {
      throw new Error(`Invalid page numbers: ${invalidPages.join(', ')}`)
    }

    const newPdf = await PDFDocument.create()
    const pageIndices = orderedPages.map((page) => page - 1)
    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices)
    copiedPages.forEach((page) => newPdf.addPage(page))

    const pdfBytes = await newPdf.save()
    return pdfBytesToBlob(pdfBytes)
  } catch (error) {
    throw new Error(`Failed to reorder pages: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function validatePageList(pageNumbers: number[], totalPages: number, action: string): void {
  if (pageNumbers.length === 0) {
    throw new Error(`No valid pages specified for ${action}`)
  }

  const invalidPages = pageNumbers.filter((page) => page < 1 || page > totalPages)
  if (invalidPages.length > 0) {
    throw new Error(`Invalid page numbers: ${invalidPages.join(', ')}`)
  }
}
