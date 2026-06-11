import { PDFDocument } from 'pdf-lib'
import { pdfBytesToBlob } from './blob'

export interface FlattenPDFResult {
  blob: Blob
  fieldCount: number
}

export async function flattenPDF(file: File): Promise<FlattenPDFResult> {
  if (!file) {
    throw new Error('No PDF file provided')
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await PDFDocument.load(arrayBuffer)
  const form = pdf.getForm()
  const fieldCount = form.getFields().length

  if (fieldCount > 0) {
    // Preserve existing appearances instead of regenerating them with a limited font.
    form.flatten({ updateFieldAppearances: false })
  }

  const pdfBytes = await pdf.save()
  return {
    blob: pdfBytesToBlob(pdfBytes),
    fieldCount,
  }
}
