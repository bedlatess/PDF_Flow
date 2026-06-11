/**
 * Local PDF page-numbering utilities.
 *
 * Page labels are rendered to canvas images before being embedded. This keeps
 * Chinese labels such as "第 1 页" safe from pdf-lib StandardFont encoding limits.
 */

import { PDFDocument } from 'pdf-lib'
import { pdfBytesToBlob } from './blob'

export type PageNumberPosition =
  | 'bottom-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'top-left'
  | 'top-right'

export interface PageNumberOptions {
  startNumber?: number
  startOnPage?: number
  prefix?: string
  suffix?: string
  includeTotal?: boolean
  fontSize?: number
  color?: { r: number; g: number; b: number }
  opacity?: number
  position?: PageNumberPosition
  margin?: number
}

interface PageNumberImage {
  bytes: Uint8Array
  width: number
  height: number
}

export async function addPageNumbers(
  file: File,
  options: PageNumberOptions
): Promise<Blob> {
  if (!file) {
    throw new Error('No file provided')
  }

  const {
    startNumber = 1,
    startOnPage = 1,
    prefix = '',
    suffix = '',
    includeTotal = false,
    fontSize = 12,
    color = { r: 60, g: 60, b: 60 },
    opacity = 0.9,
    position = 'bottom-center',
    margin = 36,
  } = options

  if (startNumber < 0) {
    throw new Error('Start number must be zero or greater')
  }

  if (startOnPage < 1) {
    throw new Error('Start page must be one or greater')
  }

  if (opacity < 0 || opacity > 1) {
    throw new Error('Opacity must be between 0 and 1')
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    const pages = pdf.getPages()
    const totalPages = pages.length

    if (startOnPage > totalPages) {
      throw new Error('Start page exceeds total page count')
    }

    const stampedTotal = totalPages - startOnPage + 1

    for (let index = startOnPage - 1; index < totalPages; index += 1) {
      const page = pages[index]
      const pageNumber = startNumber + index - (startOnPage - 1)
      const text = includeTotal
        ? `${prefix}${pageNumber} / ${stampedTotal}${suffix}`
        : `${prefix}${pageNumber}${suffix}`
      const label = await renderPageNumberImage(text, fontSize, color)
      const embeddedLabel = await pdf.embedPng(label.bytes)
      const { width, height } = page.getSize()
      const { x, y } = computePosition(position, width, height, label.width, label.height, margin)

      page.drawImage(embeddedLabel, {
        x,
        y,
        width: label.width,
        height: label.height,
        opacity,
      })
    }

    const pdfBytes = await pdf.save()
    return pdfBytesToBlob(pdfBytes)
  } catch (error) {
    console.error('Page numbering error:', error)
    throw new Error(`Failed to add page numbers: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function renderPageNumberImage(
  text: string,
  fontSize: number,
  color: { r: number; g: number; b: number }
): Promise<PageNumberImage> {
  const scale = Math.max(window.devicePixelRatio || 1, 2)
  const fontFamily = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Source Han Sans SC", sans-serif'
  const measureCanvas = document.createElement('canvas')
  const measureContext = measureCanvas.getContext('2d')
  if (!measureContext) {
    throw new Error('Canvas is unavailable in this browser')
  }

  measureContext.font = `600 ${fontSize * scale}px ${fontFamily}`
  const metrics = measureContext.measureText(text)
  const paddingX = Math.ceil(fontSize * scale * 0.7)
  const paddingY = Math.ceil(fontSize * scale * 0.35)
  const width = Math.ceil(metrics.width + paddingX * 2)
  const height = Math.ceil(fontSize * scale * 1.35 + paddingY * 2)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is unavailable in this browser')
  }

  context.clearRect(0, 0, width, height)
  context.font = `600 ${fontSize * scale}px ${fontFamily}`
  context.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, width / 2, height / 2)

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Failed to render page number'))
        return
      }

      resolve({
        bytes: new Uint8Array(await blob.arrayBuffer()),
        width: width / scale,
        height: height / scale,
      })
    }, 'image/png')
  })
}

function computePosition(
  position: PageNumberPosition,
  pageWidth: number,
  pageHeight: number,
  labelWidth: number,
  labelHeight: number,
  margin: number
): { x: number; y: number } {
  const horizontal = position.endsWith('left')
    ? 'left'
    : position.endsWith('right')
      ? 'right'
      : 'center'
  const vertical = position.startsWith('top') ? 'top' : 'bottom'

  const x = horizontal === 'left'
    ? margin
    : horizontal === 'right'
      ? pageWidth - labelWidth - margin
      : (pageWidth - labelWidth) / 2
  const y = vertical === 'top'
    ? pageHeight - labelHeight - margin
    : margin

  return { x, y }
}
