import * as pdfjsLib from 'pdfjs-dist'
import { configurePdfJsWorker } from './configurePdfJs'

configurePdfJsWorker()

export interface ExtractedPDFImage {
  pageNumber: number
  imageNumber: number
  width: number
  height: number
  blob: Blob
}

type PDFPageProxyLike = {
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>
  cleanup?: () => void
  objs?: {
    get: (id: string, callback?: (data: unknown) => void) => unknown
  }
}

interface PDFImageData {
  width: number
  height: number
  data: Uint8Array | Uint8ClampedArray
}

export async function extractImagesFromPDF(file: File): Promise<ExtractedPDFImage[]> {
  if (!file) {
    throw new Error('No PDF file provided')
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  try {
    const images: ExtractedPDFImage[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber) as unknown as PDFPageProxyLike
      const pageImages = await extractImagesFromPage(page)

      pageImages.forEach((image) => {
        images.push({
          ...image,
          pageNumber,
          imageNumber: images.length + 1,
        })
      })

      page.cleanup?.()
    }

    return images
  } finally {
    await pdf.destroy()
  }
}

async function extractImagesFromPage(
  page: PDFPageProxyLike
): Promise<Omit<ExtractedPDFImage, 'pageNumber' | 'imageNumber'>[]> {
  const operatorList = await page.getOperatorList()
  const imageOps = new Set([
    pdfjsLib.OPS.paintImageXObject,
    pdfjsLib.OPS.paintInlineImageXObject,
  ])
  const images: Omit<ExtractedPDFImage, 'pageNumber' | 'imageNumber'>[] = []

  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    if (!imageOps.has(operatorList.fnArray[index])) {
      continue
    }

    const args = operatorList.argsArray[index]
    const source = await resolveImageSource(page, operatorList.fnArray[index], args)
    const image = await imageSourceToPng(source)
    if (image) {
      images.push(image)
    }
  }

  return images
}

async function resolveImageSource(
  page: PDFPageProxyLike,
  operation: number,
  args: unknown[]
): Promise<unknown> {
  if (operation === pdfjsLib.OPS.paintInlineImageXObject) {
    return args[0]
  }

  const objectId = args[0]
  if (typeof objectId !== 'string' || !page.objs) {
    return null
  }

  try {
    const existing = page.objs.get(objectId)
    if (existing) {
      return existing
    }
  } catch {
    // pdf.js throws until the object is resolved; the callback path waits for it.
  }

  return new Promise((resolve) => {
    try {
      page.objs?.get(objectId, resolve)
    } catch {
      resolve(null)
    }
  })
}

async function imageSourceToPng(
  source: unknown
): Promise<Omit<ExtractedPDFImage, 'pageNumber' | 'imageNumber'> | null> {
  if (!source) {
    return null
  }

  if (source instanceof HTMLCanvasElement) {
    return canvasToResult(source)
  }

  if (source instanceof HTMLImageElement || source instanceof ImageBitmap) {
    const canvas = document.createElement('canvas')
    canvas.width = source instanceof ImageBitmap ? source.width : source.naturalWidth
    canvas.height = source instanceof ImageBitmap ? source.height : source.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(source, 0, 0)
    return canvasToResult(canvas)
  }

  if (isPDFImageData(source)) {
    const imageData = toImageData(source)
    if (!imageData) {
      return null
    }

    const canvas = document.createElement('canvas')
    canvas.width = source.width
    canvas.height = source.height
    const context = canvas.getContext('2d')
    if (!context) return null
    context.putImageData(imageData, 0, 0)
    return canvasToResult(canvas)
  }

  return null
}

function isPDFImageData(source: unknown): source is PDFImageData {
  if (!source || typeof source !== 'object') {
    return false
  }

  const candidate = source as Partial<PDFImageData>
  return (
    typeof candidate.width === 'number'
    && typeof candidate.height === 'number'
    && candidate.data instanceof Uint8Array
  )
}

function toImageData(source: PDFImageData): ImageData | null {
  const pixelCount = source.width * source.height
  const data = source.data

  if (data.length === pixelCount * 4) {
    return new ImageData(new Uint8ClampedArray(data), source.width, source.height)
  }

  if (data.length === pixelCount * 3) {
    const rgba = new Uint8ClampedArray(pixelCount * 4)
    for (let index = 0; index < pixelCount; index += 1) {
      rgba[index * 4] = data[index * 3]
      rgba[index * 4 + 1] = data[index * 3 + 1]
      rgba[index * 4 + 2] = data[index * 3 + 2]
      rgba[index * 4 + 3] = 255
    }
    return new ImageData(rgba, source.width, source.height)
  }

  if (data.length === pixelCount) {
    const rgba = new Uint8ClampedArray(pixelCount * 4)
    for (let index = 0; index < pixelCount; index += 1) {
      const value = data[index]
      rgba[index * 4] = value
      rgba[index * 4 + 1] = value
      rgba[index * 4 + 2] = value
      rgba[index * 4 + 3] = 255
    }
    return new ImageData(rgba, source.width, source.height)
  }

  return null
}

async function canvasToResult(
  canvas: HTMLCanvasElement
): Promise<Omit<ExtractedPDFImage, 'pageNumber' | 'imageNumber'> | null> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })

  if (!blob) {
    return null
  }

  return {
    width: canvas.width,
    height: canvas.height,
    blob,
  }
}
