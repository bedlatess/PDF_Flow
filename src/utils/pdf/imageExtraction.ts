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
    has?: (id: string) => boolean
  }
}

interface PDFImageData {
  width: number
  height: number
  data: ArrayBufferView
}

interface PDFBitmapImageData {
  width: number
  height: number
  bitmap: ImageBitmap
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
  const images: Omit<ExtractedPDFImage, 'pageNumber' | 'imageNumber'>[] = []

  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    const operation = operatorList.fnArray[index]
    if (!isImageOperation(operation)) {
      continue
    }

    const args = operatorList.argsArray[index]
    const sources = await resolveImageSources(page, operation, args)

    for (const source of sources) {
      const image = await imageSourceToPng(source)
      if (image) {
        images.push(image)
      }
    }
  }

  return images
}

function isImageOperation(operation: number): boolean {
  return [
    pdfjsLib.OPS.paintImageMaskXObject,
    pdfjsLib.OPS.paintImageMaskXObjectGroup,
    pdfjsLib.OPS.paintImageXObject,
    pdfjsLib.OPS.paintInlineImageXObject,
    pdfjsLib.OPS.paintImageXObjectRepeat,
    pdfjsLib.OPS.paintImageMaskXObjectRepeat,
  ].includes(operation)
}

async function resolveImageSources(
  page: PDFPageProxyLike,
  operation: number,
  args: unknown[]
): Promise<unknown[]> {
  if (
    operation === pdfjsLib.OPS.paintInlineImageXObject
    || operation === pdfjsLib.OPS.paintImageMaskXObject
  ) {
    return [args[0]]
  }

  if (operation === pdfjsLib.OPS.paintImageMaskXObjectGroup) {
    return Array.isArray(args[0]) ? args[0] : []
  }

  const objectId = args[0]
  if (typeof objectId !== 'string' || !page.objs) {
    return []
  }

  const source = await resolveXObjectImage(page, objectId)
  return source ? [source] : []
}

async function resolveXObjectImage(page: PDFPageProxyLike, objectId: string): Promise<unknown> {
  if (!page.objs) {
    return null
  }

  if (page.objs.has?.(objectId)) {
    try {
      return page.objs.get(objectId)
    } catch {
      return null
    }
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
    let settled = false
    let timeoutId = 0
    const finish = (value: unknown) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      resolve(value)
    }
    timeoutId = window.setTimeout(() => finish(null), 3000)

    try {
      page.objs?.get(objectId, finish)
    } catch {
      finish(null)
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

  if (isPDFBitmapImageData(source)) {
    return drawableImageToPng(source.bitmap, source.width, source.height)
  }

  if (source instanceof HTMLImageElement || isImageBitmap(source)) {
    return drawableImageToPng(
      source,
      isImageBitmap(source) ? source.width : source.naturalWidth,
      isImageBitmap(source) ? source.height : source.naturalHeight
    )
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

function isPDFBitmapImageData(source: unknown): source is PDFBitmapImageData {
  if (!source || typeof source !== 'object') {
    return false
  }

  const candidate = source as Partial<PDFBitmapImageData>
  return (
    typeof candidate.width === 'number'
    && typeof candidate.height === 'number'
    && isImageBitmap(candidate.bitmap)
  )
}

function isPDFImageData(source: unknown): source is PDFImageData {
  if (!source || typeof source !== 'object') {
    return false
  }

  const candidate = source as Partial<PDFImageData>
  return (
    typeof candidate.width === 'number'
    && typeof candidate.height === 'number'
    && ArrayBuffer.isView(candidate.data)
  )
}

function isImageBitmap(source: unknown): source is ImageBitmap {
  return typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap
}

async function drawableImageToPng(
  source: CanvasImageSource,
  width: number,
  height: number
): Promise<Omit<ExtractedPDFImage, 'pageNumber' | 'imageNumber'> | null> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(source, 0, 0)
  return canvasToResult(canvas)
}

function toImageData(source: PDFImageData): ImageData | null {
  const pixelCount = source.width * source.height
  const data = new Uint8Array(source.data.buffer, source.data.byteOffset, source.data.byteLength)

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
