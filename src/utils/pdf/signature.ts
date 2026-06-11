import { PDFDocument } from 'pdf-lib'
import { pdfBytesToBlob } from './blob'

export interface SignaturePlacement {
  pageNumber: number
  xPercent: number
  yPercent: number
  widthPercent: number
  opacity?: number
}

export async function addVisualSignature(
  pdfFile: File,
  signatureFile: File,
  placement: SignaturePlacement
): Promise<Blob> {
  if (!pdfFile) {
    throw new Error('No PDF file provided')
  }

  if (!signatureFile) {
    throw new Error('No signature image provided')
  }

  const pdfBytes = await pdfFile.arrayBuffer()
  const signatureBytes = await signatureFile.arrayBuffer()
  const pdf = await PDFDocument.load(pdfBytes)
  const pageCount = pdf.getPageCount()
  const pageIndex = Math.min(Math.max(placement.pageNumber - 1, 0), pageCount - 1)
  const page = pdf.getPages()[pageIndex]
  const { width: pageWidth, height: pageHeight } = page.getSize()
  const image = await embedSignatureImage(pdf, signatureFile, signatureBytes)

  const imageAspectRatio = image.width / image.height
  const signatureWidth = pageWidth * clamp(placement.widthPercent, 8, 80) / 100
  const signatureHeight = signatureWidth / imageAspectRatio
  const x = pageWidth * clamp(placement.xPercent, 0, 100) / 100
  const yFromTop = pageHeight * clamp(placement.yPercent, 0, 100) / 100
  const y = pageHeight - yFromTop - signatureHeight

  page.drawImage(image, {
    x: clamp(x, 0, Math.max(pageWidth - signatureWidth, 0)),
    y: clamp(y, 0, Math.max(pageHeight - signatureHeight, 0)),
    width: signatureWidth,
    height: signatureHeight,
    opacity: clamp(placement.opacity ?? 1, 0.1, 1),
  })

  const outputBytes = await pdf.save()
  return pdfBytesToBlob(outputBytes)
}

async function embedSignatureImage(
  pdf: PDFDocument,
  file: File,
  bytes: ArrayBuffer
) {
  const lowerName = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  if (type.includes('png') || lowerName.endsWith('.png')) {
    return pdf.embedPng(bytes)
  }

  if (
    type.includes('jpeg')
    || type.includes('jpg')
    || lowerName.endsWith('.jpg')
    || lowerName.endsWith('.jpeg')
  ) {
    return pdf.embedJpg(bytes)
  }

  if (type.includes('webp') || lowerName.endsWith('.webp')) {
    const pngBytes = await convertImageToPng(bytes)
    return pdf.embedPng(pngBytes)
  }

  throw new Error('Signature image must be PNG, JPG, or WEBP')
}

async function convertImageToPng(bytes: ArrayBuffer): Promise<Uint8Array> {
  const blob = new Blob([bytes])
  const url = URL.createObjectURL(blob)

  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas is unavailable in this browser')
    }

    context.drawImage(image, 0, 0)

    return new Promise((resolve, reject) => {
      canvas.toBlob(async (pngBlob) => {
        if (!pngBlob) {
          reject(new Error('Failed to convert signature image'))
          return
        }

        resolve(new Uint8Array(await pngBlob.arrayBuffer()))
      }, 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to read signature image'))
    image.src = url
  })
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
