import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type TextItem = {
  str?: string
  hasEOL?: boolean
}

type MockPage = {
  getTextContent?: ReturnType<typeof vi.fn>
  getOperatorList?: ReturnType<typeof vi.fn>
  cleanup?: ReturnType<typeof vi.fn>
  objs?: {
    get: ReturnType<typeof vi.fn>
  }
}

type MockPdfDocument = {
  numPages: number
  getPage: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

const mockGetDocument = vi.fn()

vi.mock('pdfjs-dist', () => ({
  default: {},
  GlobalWorkerOptions: {},
  OPS: {
    paintImageXObject: 1,
    paintInlineImageXObject: 2,
  },
  getDocument: mockGetDocument,
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: '/mock-pdf.worker.min.mjs',
}))

async function importTextExtraction() {
  return import('@/utils/pdf/textExtraction')
}

async function importImageExtraction() {
  return import('@/utils/pdf/imageExtraction')
}

function makeFile(name = 'sample.pdf'): File {
  const bytes = new Uint8Array([37, 80, 68, 70])
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const file = new File([arrayBuffer], name, { type: 'application/pdf' })
  Object.defineProperty(file, 'arrayBuffer', {
    configurable: true,
    value: vi.fn(async () => arrayBuffer.slice(0)),
  })
  return file
}

function makeTextPage(items: TextItem[]): MockPage {
  return {
    getTextContent: vi.fn(async () => ({ items })),
  }
}

function makePdf(pages: MockPage[]): MockPdfDocument {
  return {
    numPages: pages.length,
    getPage: vi.fn(async (pageNumber: number) => pages[pageNumber - 1]),
    destroy: vi.fn(async () => undefined),
  }
}

function usePdfDocument(pdf: MockPdfDocument) {
  mockGetDocument.mockReturnValue({ promise: Promise.resolve(pdf) })
}

function makeBlob(type: string, bytes = new Uint8Array([1, 2, 3, 4])): Blob {
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const blob = new Blob([arrayBuffer], { type })
  Object.defineProperty(blob, 'arrayBuffer', {
    configurable: true,
    value: async () => arrayBuffer.slice(0),
  })
  return blob
}

function mockCanvas() {
  const originalCreateElement = document.createElement.bind(document)
  const contexts: Array<{ putImageData: ReturnType<typeof vi.fn>; drawImage: ReturnType<typeof vi.fn> }> = []

  vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
    if (tagName.toLowerCase() !== 'canvas') {
      return originalCreateElement(tagName, options)
    }

    const canvas = originalCreateElement('canvas') as HTMLCanvasElement
    const context = {
      putImageData: vi.fn(),
      drawImage: vi.fn(),
    }
    contexts.push(context)

    Object.defineProperty(canvas, 'getContext', {
      configurable: true,
      value: vi.fn(() => context),
    })
    Object.defineProperty(canvas, 'toBlob', {
      configurable: true,
      value: vi.fn((callback: BlobCallback, type?: string) => {
        callback(makeBlob(type || 'image/png'))
      }),
    })

    return canvas
  })

  return contexts
}

function mockImageData() {
  class TestImageData {
    data: Uint8ClampedArray
    width: number
    height: number

    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data
      this.width = width
      this.height = height
    }
  }

  vi.stubGlobal('ImageData', TestImageData)
}

function mockImageBitmap() {
  class TestImageBitmap {
    width: number
    height: number

    constructor(width: number, height: number) {
      this.width = width
      this.height = height
    }
  }

  vi.stubGlobal('ImageBitmap', TestImageBitmap)
  return TestImageBitmap
}

describe('PDF extraction utilities', () => {
  beforeEach(() => {
    mockGetDocument.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('extractTextFromPDF', () => {
    it('extracts normalized text with page labels and totals', async () => {
      const firstPage = makeTextPage([
        { str: 'First' },
        { str: 'line', hasEOL: true },
        { str: 'Second' },
        { str: 'line' },
      ])
      const secondPage = makeTextPage([
        { str: 'Final', hasEOL: true },
        { str: 'page' },
      ])
      const pdf = makePdf([firstPage, secondPage])
      usePdfDocument(pdf)

      const { extractTextFromPDF } = await importTextExtraction()
      const result = await extractTextFromPDF(makeFile(), {
        pageLabel: (pageNumber) => `Sheet ${pageNumber}`,
      })

      expect(result.pageCount).toBe(2)
      expect(result.pages).toEqual([
        { pageNumber: 1, text: 'First line\nSecond line', characterCount: 22 },
        { pageNumber: 2, text: 'Final\npage', characterCount: 10 },
      ])
      expect(result.text).toContain('--- Sheet 1 ---')
      expect(result.text).toContain('--- Sheet 2 ---')
      expect(result.characterCount).toBe(result.text.length)
      expect(pdf.destroy).toHaveBeenCalledOnce()
    })

    it('rejects missing files before calling pdf.js', async () => {
      const { extractTextFromPDF } = await importTextExtraction()

      await expect(extractTextFromPDF(undefined as unknown as File)).rejects.toThrow('No PDF file provided')
      expect(mockGetDocument).not.toHaveBeenCalled()
    })

    it('destroys the pdf document when page extraction fails', async () => {
      const pdf = makePdf([{
        getTextContent: vi.fn(async () => {
          throw new Error('text layer failed')
        }),
      }])
      usePdfDocument(pdf)

      const { extractTextFromPDF } = await importTextExtraction()

      await expect(extractTextFromPDF(makeFile())).rejects.toThrow('text layer failed')
      expect(pdf.destroy).toHaveBeenCalledOnce()
    })
  })

  describe('extractImagesFromPDF', () => {
    it('extracts inline RGB and grayscale image data as PNG blobs', async () => {
      const contexts = mockCanvas()
      mockImageData()
      const page = {
        cleanup: vi.fn(),
        getOperatorList: vi.fn(async () => ({
          fnArray: [2, 2],
          argsArray: [
            [{ width: 1, height: 1, data: new Uint8Array([255, 0, 0]) }],
            [{ width: 1, height: 1, data: new Uint8Array([127]) }],
          ],
        })),
      }
      const pdf = makePdf([page])
      usePdfDocument(pdf)

      const { extractImagesFromPDF } = await importImageExtraction()
      const images = await extractImagesFromPDF(makeFile())

      expect(images).toHaveLength(2)
      expect(images.map((image) => ({
        pageNumber: image.pageNumber,
        imageNumber: image.imageNumber,
        width: image.width,
        height: image.height,
        type: image.blob.type,
      }))).toEqual([
        { pageNumber: 1, imageNumber: 1, width: 1, height: 1, type: 'image/png' },
        { pageNumber: 1, imageNumber: 2, width: 1, height: 1, type: 'image/png' },
      ])
      expect(contexts).toHaveLength(2)
      expect(contexts[0].putImageData.mock.calls[0][0].data).toEqual(new Uint8ClampedArray([255, 0, 0, 255]))
      expect(contexts[1].putImageData.mock.calls[0][0].data).toEqual(new Uint8ClampedArray([127, 127, 127, 255]))
      expect(page.cleanup).toHaveBeenCalledOnce()
      expect(pdf.destroy).toHaveBeenCalledOnce()
    })

    it('resolves XObject images from cached objects and async object callbacks', async () => {
      mockCanvas()
      mockImageData()
      const cached = { width: 1, height: 1, data: new Uint8ClampedArray([1, 2, 3, 4]) }
      const asyncImage = { width: 1, height: 1, data: new Uint8Array([5, 6, 7, 8]) }
      const getObject = vi.fn((objectId: string, callback?: (data: unknown) => void) => {
        if (objectId === 'cached') {
          return cached
        }

        if (callback) {
          callback(asyncImage)
        }

        return null
      })
      const page = {
        cleanup: vi.fn(),
        objs: { get: getObject },
        getOperatorList: vi.fn(async () => ({
          fnArray: [1, 1],
          argsArray: [['cached'], ['async']],
        })),
      }
      const pdf = makePdf([page])
      usePdfDocument(pdf)

      const { extractImagesFromPDF } = await importImageExtraction()
      const images = await extractImagesFromPDF(makeFile())

      expect(images).toHaveLength(2)
      expect(images.map((image) => image.imageNumber)).toEqual([1, 2])
      expect(getObject).toHaveBeenCalledWith('cached')
      expect(getObject).toHaveBeenCalledWith('async')
      expect(getObject).toHaveBeenCalledWith('async', expect.any(Function))
      expect(page.cleanup).toHaveBeenCalledOnce()
      expect(pdf.destroy).toHaveBeenCalledOnce()
    })

    it('extracts pdf.js bitmap image wrappers as PNG blobs', async () => {
      const contexts = mockCanvas()
      const TestImageBitmap = mockImageBitmap()
      const bitmap = new TestImageBitmap(2, 3)
      const page = {
        cleanup: vi.fn(),
        getOperatorList: vi.fn(async () => ({
          fnArray: [2],
          argsArray: [[{ width: 2, height: 3, bitmap }]],
        })),
      }
      const pdf = makePdf([page])
      usePdfDocument(pdf)

      const { extractImagesFromPDF } = await importImageExtraction()
      const images = await extractImagesFromPDF(makeFile())

      expect(images).toHaveLength(1)
      expect(images[0]).toMatchObject({
        pageNumber: 1,
        imageNumber: 1,
        width: 2,
        height: 3,
      })
      expect(images[0].blob.type).toBe('image/png')
      expect(contexts[0].drawImage).toHaveBeenCalledWith(bitmap, 0, 0)
      expect(page.cleanup).toHaveBeenCalledOnce()
      expect(pdf.destroy).toHaveBeenCalledOnce()
    })

    it('skips invalid image sources and cleans up pages', async () => {
      mockCanvas()
      mockImageData()
      const page = {
        cleanup: vi.fn(),
        getOperatorList: vi.fn(async () => ({
          fnArray: [999, 2, 2],
          argsArray: [
            ['not-image-op'],
            [{ width: 2, height: 2, data: new Uint8Array([1, 2]) }],
            [null],
          ],
        })),
      }
      const pdf = makePdf([page])
      usePdfDocument(pdf)

      const { extractImagesFromPDF } = await importImageExtraction()
      const images = await extractImagesFromPDF(makeFile())

      expect(images).toEqual([])
      expect(page.cleanup).toHaveBeenCalledOnce()
      expect(pdf.destroy).toHaveBeenCalledOnce()
    })

    it('rejects missing files before calling pdf.js', async () => {
      const { extractImagesFromPDF } = await importImageExtraction()

      await expect(extractImagesFromPDF(undefined as unknown as File)).rejects.toThrow('No PDF file provided')
      expect(mockGetDocument).not.toHaveBeenCalled()
    })
  })
})
