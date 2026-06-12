import { PDFDocument, degrees } from 'pdf-lib'
import type { PDFRotateOptions } from '@/types/pdf'
import { pdfBytesToBlob } from './blob'

export async function rotatePDF(
  file: File,
  options: PDFRotateOptions
): Promise<Blob> {
  if (!file) {
    throw new Error('No file provided for rotation')
  }

  const { angle, pages } = options
  if (![90, 180, 270].includes(angle)) {
    throw new Error('Angle must be 90, 180, or 270 degrees')
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    const totalPages = pdf.getPageCount()
    const pageIndices = pages && pages.length > 0
      ? pages.map((page) => page - 1)
      : Array.from({ length: totalPages }, (_, index) => index)

    validatePageIndices(pageIndices, totalPages)

    const allPages = pdf.getPages()
    pageIndices.forEach((index) => {
      const page = allPages[index]
      const currentRotation = page.getRotation().angle
      page.setRotation(degrees((currentRotation + angle) % 360))
    })

    const pdfBytes = await pdf.save()
    return pdfBytesToBlob(pdfBytes)
  } catch (error) {
    throw new Error(`Failed to rotate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function rotateAllPages(file: File, angle: 90 | 180 | 270): Promise<Blob> {
  return rotatePDF(file, { angle })
}

export async function rotateSinglePage(
  file: File,
  pageNumber: number,
  angle: 90 | 180 | 270
): Promise<Blob> {
  return rotatePDF(file, { angle, pages: [pageNumber] })
}

export async function resetRotation(file: File, pages?: number[]): Promise<Blob> {
  if (!file) {
    throw new Error('No file provided')
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    const totalPages = pdf.getPageCount()
    const pageIndices = pages && pages.length > 0
      ? pages.map((page) => page - 1)
      : Array.from({ length: totalPages }, (_, index) => index)

    validatePageIndices(pageIndices, totalPages)

    const allPages = pdf.getPages()
    pageIndices.forEach((index) => {
      allPages[index].setRotation(degrees(0))
    })

    const pdfBytes = await pdf.save()
    return pdfBytesToBlob(pdfBytes)
  } catch (error) {
    throw new Error(`Failed to reset rotation: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function getPageRotation(file: File, pageNumber: number): Promise<number> {
  if (!file) {
    throw new Error('No file provided')
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    const totalPages = pdf.getPageCount()
    const index = pageNumber - 1

    validatePageIndices([index], totalPages)

    return pdf.getPage(index).getRotation().angle
  } catch (error) {
    throw new Error('Failed to get page rotation')
  }
}

function validatePageIndices(pageIndices: number[], totalPages: number): void {
  const invalidIndices = pageIndices.filter((index) => index < 0 || index >= totalPages)
  if (invalidIndices.length > 0) {
    throw new Error(`Invalid page numbers: ${invalidIndices.map((index) => index + 1).join(', ')}`)
  }
}
