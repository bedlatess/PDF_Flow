import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { cropPDF } from '@/utils/pdf/crop'
import { addPageNumbers } from '@/utils/pdf/pageNumbers'
import { addVisualSignature } from '@/utils/pdf/signature'
import { addWatermark } from '@/utils/pdf/watermark'

const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='

function pngBytes(): Uint8Array {
  const binary = atob(PNG_1X1_BASE64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function makePdf(name: string, pageCount: number): Promise<File> {
  const pdf = await PDFDocument.create()

  for (let index = 0; index < pageCount; index += 1) {
    const page = pdf.addPage([300, 420])
    page.drawText(`${name} page ${index + 1}`, { x: 24, y: 380 })
  }

  const bytes = await pdf.save()
  return makeFile(`${name}.pdf`, 'application/pdf', bytes)
}

function makeFile(name: string, type: string, bytes: Uint8Array | ArrayBuffer): File {
  const arrayBuffer = bytes instanceof Uint8Array
    ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    : bytes
  const file = new File([arrayBuffer], name, { type })
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => arrayBuffer.slice(0),
  })
  return file
}

function makeBlob(type: string, bytes: Uint8Array): Blob {
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const blob = new Blob([arrayBuffer], { type })
  Object.defineProperty(blob, 'arrayBuffer', {
    configurable: true,
    value: async () => arrayBuffer.slice(0),
  })
  return blob
}

async function loadPdf(blob: Blob): Promise<PDFDocument> {
  return PDFDocument.load(await blob.arrayBuffer())
}

function mockCanvas() {
  const originalCreateElement = document.createElement.bind(document)
  const imageBytes = pngBytes()

  vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
    if (tagName.toLowerCase() !== 'canvas') {
      return originalCreateElement(tagName, options)
    }

    const canvas = originalCreateElement('canvas') as HTMLCanvasElement
    const context = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
      putImageData: vi.fn(),
      textAlign: 'center',
      textBaseline: 'middle',
      fillStyle: '',
      font: '',
    }

    Object.defineProperty(canvas, 'getContext', {
      configurable: true,
      value: vi.fn(() => context),
    })
    Object.defineProperty(canvas, 'toBlob', {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => {
        callback(makeBlob('image/png', imageBytes))
      }),
    })

    return canvas
  })
}

describe('Advanced PDF utilities', () => {
  beforeEach(() => {
    mockCanvas()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('cropPDF', () => {
    it('applies crop margins while keeping the PDF readable', async () => {
      const file = await makePdf('crop', 2)

      const cropped = await cropPDF(file, {
        topPercent: 10,
        rightPercent: 5,
        bottomPercent: 10,
        leftPercent: 5,
      })
      const pdf = await loadPdf(cropped)

      expect(pdf.getPageCount()).toBe(2)
      expect(pdf.getPage(0).getCropBox().width).toBeLessThan(300)
    })

    it('clamps extreme crop margins to the minimum usable area', async () => {
      const file = await makePdf('crop clamp', 1)

      const cropped = await cropPDF(file, {
        topPercent: 99,
        rightPercent: 99,
        bottomPercent: 99,
        leftPercent: 99,
      })
      const pdf = await loadPdf(cropped)

      expect(pdf.getPage(0).getCropBox().width).toBe(30)
    })
  })

  describe('addPageNumbers', () => {
    it('adds page-number images and preserves page count', async () => {
      const file = await makePdf('numbers', 3)

      const numbered = await addPageNumbers(file, {
        startNumber: 5,
        startOnPage: 2,
        prefix: '第 ',
        suffix: ' 页',
        includeTotal: true,
      })

      expect((await loadPdf(numbered)).getPageCount()).toBe(3)
    })

    it('rejects invalid numbering options', async () => {
      const file = await makePdf('numbers invalid', 1)

      await expect(addPageNumbers(file, { startNumber: -1 })).rejects.toThrow('Start number')
      await expect(addPageNumbers(file, { opacity: 2 })).rejects.toThrow('Opacity')
      await expect(addPageNumbers(file, { startOnPage: 2 })).rejects.toThrow('Start page exceeds')
    })
  })

  describe('addWatermark', () => {
    it('adds a centered watermark and preserves page count', async () => {
      const file = await makePdf('watermark', 2)

      const watermarked = await addWatermark(file, {
        text: 'CONFIDENTIAL',
        position: 'center',
        pages: [1],
      })

      expect((await loadPdf(watermarked)).getPageCount()).toBe(2)
    })

    it('adds tiled watermarks and rejects invalid pages', async () => {
      const file = await makePdf('watermark tile', 1)

      await expect(addWatermark(file, { text: 'COPY', position: 'tile' })).resolves.toBeInstanceOf(Blob)
      await expect(addWatermark(file, { text: 'COPY', pages: [2] })).rejects.toThrow('Invalid page numbers')
      await expect(addWatermark(file, { text: '   ' })).rejects.toThrow('Watermark text is required')
    })
  })

  describe('addVisualSignature', () => {
    it('embeds a PNG visual signature on the requested page', async () => {
      const pdfFile = await makePdf('signature', 2)
      const signatureFile = makeFile('signature.png', 'image/png', pngBytes())

      const signed = await addVisualSignature(pdfFile, signatureFile, {
        pageNumber: 2,
        xPercent: 50,
        yPercent: 50,
        widthPercent: 25,
      })

      expect((await loadPdf(signed)).getPageCount()).toBe(2)
    })

    it('rejects unsupported signature images and invalid pages', async () => {
      const pdfFile = await makePdf('signature invalid', 1)
      const signatureFile = makeFile('signature.txt', 'text/plain', new Uint8Array([1, 2, 3]))

      await expect(addVisualSignature(pdfFile, signatureFile, {
        pageNumber: 1,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 25,
      })).rejects.toThrow('Signature image must be PNG, JPG, or WEBP')

      await expect(addVisualSignature(pdfFile, makeFile('signature.png', 'image/png', pngBytes()), {
        pageNumber: 2,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 25,
      })).rejects.toThrow('Invalid page number')
    })
  })
})
