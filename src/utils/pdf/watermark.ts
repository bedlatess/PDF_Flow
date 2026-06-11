/**
 * PDF 水印工具
 * 使用 pdf-lib 实现纯前端 PDF 文本水印添加
 * 100% 本地处理，文件不上传服务器
 */

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import { pdfBytesToBlob } from './blob'

export type WatermarkPosition = 'center' | 'tile' | 'top' | 'bottom'

export interface WatermarkOptions {
  /** 水印文字 */
  text: string
  /** 不透明度 (0.0 - 1.0) */
  opacity?: number
  /** 旋转角度（度） */
  rotation?: number
  /** 字号 */
  fontSize?: number
  /** 颜色 RGB（0-255 每个分量） */
  color?: { r: number; g: number; b: number }
  /** 位置 */
  position?: WatermarkPosition
  /** 要添加水印的页码（从 1 开始）；为空则所有页面 */
  pages?: number[]
}

/**
 * 给 PDF 添加文本水印
 * @param file - PDF 文件
 * @param options - 水印选项
 * @returns 添加水印后的 PDF Blob
 */
export async function addWatermark(
  file: File,
  options: WatermarkOptions
): Promise<Blob> {
  if (!file) {
    throw new Error('No file provided for watermark')
  }

  const {
    text,
    opacity = 0.3,
    rotation = 45,
    fontSize = 40,
    color = { r: 128, g: 128, b: 128 },
    position = 'center',
    pages,
  } = options

  if (!text || !text.trim()) {
    throw new Error('Watermark text is required')
  }

  if (opacity < 0 || opacity > 1) {
    throw new Error('Opacity must be between 0 and 1')
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    const font = await pdf.embedFont(StandardFonts.HelveticaBold)
    const totalPages = pdf.getPageCount()

    // 归一化颜色到 0-1
    const fillColor = rgb(color.r / 255, color.g / 255, color.b / 255)

    // 确定要处理的页面索引
    const pageIndices =
      pages && pages.length > 0
        ? pages.map((num) => num - 1).filter((i) => i >= 0 && i < totalPages)
        : Array.from({ length: totalPages }, (_, i) => i)

    const allPages = pdf.getPages()
    const textWidth = font.widthOfTextAtSize(text, fontSize)
    const textHeight = font.heightAtSize(fontSize)

    for (const index of pageIndices) {
      const page = allPages[index]
      const { width, height } = page.getSize()

      if (position === 'tile') {
        // 平铺水印：在页面上重复绘制
        drawTiledWatermark(page, {
          text,
          font,
          fontSize,
          color: fillColor,
          opacity,
          rotation,
          width,
          height,
          textWidth,
        })
      } else {
        const { x, y, rot } = computePosition(
          position,
          rotation,
          width,
          height,
          textWidth,
          textHeight
        )
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: fillColor,
          opacity,
          rotate: degrees(rot),
        })
      }
    }

    const pdfBytes = await pdf.save()
    return pdfBytesToBlob(pdfBytes)
  } catch (error) {
    console.error('PDF watermark error:', error)
    throw new Error(
      `Failed to add watermark: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * 计算单个水印的位置与旋转
 */
function computePosition(
  position: WatermarkPosition,
  rotation: number,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  textHeight: number
): { x: number; y: number; rot: number } {
  switch (position) {
    case 'top':
      return {
        x: (pageWidth - textWidth) / 2,
        y: pageHeight - textHeight - 30,
        rot: 0,
      }
    case 'bottom':
      return {
        x: (pageWidth - textWidth) / 2,
        y: 30,
        rot: 0,
      }
    case 'center':
    default: {
      // 居中（考虑旋转时文本以 (x,y) 为基线起点，做近似居中）
      const rad = (rotation * Math.PI) / 180
      const offsetX = (textWidth / 2) * Math.cos(rad)
      const offsetY = (textWidth / 2) * Math.sin(rad)
      return {
        x: pageWidth / 2 - offsetX,
        y: pageHeight / 2 - offsetY,
        rot: rotation,
      }
    }
  }
}

/**
 * 平铺绘制水印
 */
function drawTiledWatermark(
  page: ReturnType<PDFDocument['getPages']>[number],
  params: {
    text: string
    font: Awaited<ReturnType<PDFDocument['embedFont']>>
    fontSize: number
    color: ReturnType<typeof rgb>
    opacity: number
    rotation: number
    width: number
    height: number
    textWidth: number
  }
): void {
  const { text, font, fontSize, color, opacity, rotation, width, height, textWidth } =
    params

  // 水平/垂直间距
  const stepX = Math.max(textWidth + 80, 200)
  const stepY = 150

  for (let y = 0; y < height + stepY; y += stepY) {
    for (let x = -textWidth; x < width + stepX; x += stepX) {
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color,
        opacity,
        rotate: degrees(rotation),
      })
    }
  }
}

/**
 * 给所有页面添加居中对角线水印（便捷方法）
 * @param file - PDF 文件
 * @param text - 水印文字
 * @returns 添加水印后的 PDF Blob
 */
export async function addDiagonalWatermark(
  file: File,
  text: string
): Promise<Blob> {
  return addWatermark(file, { text, position: 'center', rotation: 45 })
}
