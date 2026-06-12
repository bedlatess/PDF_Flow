import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { mergePDFs, getPDFPageCount, getPDFInfo } from '@/utils/pdf/merge'
import { deletePDFPages, extractPDFPages, parsePageRanges, reorderPDFPages, splitPDF } from '@/utils/pdf/split'
import { getPageRotation, resetRotation, rotateAllPages, rotateSinglePage } from '@/utils/pdf/rotate'

async function makePdf(name: string, pageCount: number): Promise<File> {
  const pdf = await PDFDocument.create()

  for (let index = 0; index < pageCount; index += 1) {
    const page = pdf.addPage([200 + index, 300 + index])
    page.drawText(`${name} page ${index + 1}`, { x: 24, y: 260 })
  }

  pdf.setTitle(name)
  const bytes = await pdf.save()
  const file = new File([bytes], `${name}.pdf`, { type: 'application/pdf' })
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  })
  return file
}

async function readPageCount(blob: Blob): Promise<number> {
  const pdf = await PDFDocument.load(await readBlob(blob))
  return pdf.getPageCount()
}

async function readRotation(blob: Blob, pageNumber: number): Promise<number> {
  const pdf = await PDFDocument.load(await readBlob(blob))
  return pdf.getPage(pageNumber - 1).getRotation().angle
}

async function readBlob(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer()
  }

  return new Response(blob).arrayBuffer()
}

describe('PDF core utilities', () => {
  describe('mergePDFs', () => {
    it('merges multiple PDF files in their provided order', async () => {
      const first = await makePdf('first', 1)
      const second = await makePdf('second', 2)

      const merged = await mergePDFs([first, second])

      expect(merged.type).toBe('application/pdf')
      expect(await readPageCount(merged)).toBe(3)
    })

    it('supports explicit merge order', async () => {
      const first = await makePdf('first', 1)
      const second = await makePdf('second', 2)

      const merged = await mergePDFs([first, second], { order: [1, 0] })

      expect(await readPageCount(merged)).toBe(3)
    })

    it('returns the original file when only one file is provided', async () => {
      const file = await makePdf('single', 1)

      await expect(mergePDFs([file])).resolves.toBe(file)
    })
  })

  describe('PDF info helpers', () => {
    it('reads page count and metadata', async () => {
      const file = await makePdf('metadata sample', 2)

      await expect(getPDFPageCount(file)).resolves.toBe(2)
      await expect(getPDFInfo(file)).resolves.toMatchObject({
        pageCount: 2,
        title: 'metadata sample',
      })
    })
  })

  describe('parsePageRanges', () => {
    it('parses ranges, removes duplicates, clamps to total pages, and sorts', () => {
      expect(parsePageRanges('3, 1-2, 2, 9-12, bad, 0', 10)).toEqual([1, 2, 3, 9, 10])
    })

    it('returns an empty list for blank input', () => {
      expect(parsePageRanges('   ', 5)).toEqual([])
    })
  })

  describe('split and extraction utilities', () => {
    it('splits selected pages into one-page PDF blobs', async () => {
      const file = await makePdf('split', 3)

      const parts = await splitPDF(file, { ranges: '1,3' })

      expect(parts).toHaveLength(2)
      await expect(readPageCount(parts[0])).resolves.toBe(1)
      await expect(readPageCount(parts[1])).resolves.toBe(1)
    })

    it('extracts a page range into one PDF', async () => {
      const file = await makePdf('extract', 4)

      const extracted = await extractPDFPages(file, '2-4')

      expect(await readPageCount(extracted)).toBe(3)
    })

    it('deletes selected pages and rejects deleting every page', async () => {
      const file = await makePdf('delete', 3)

      const kept = await deletePDFPages(file, [2])

      expect(await readPageCount(kept)).toBe(2)
      await expect(deletePDFPages(file, [1, 2, 3])).rejects.toThrow('Cannot delete all pages')
    })

    it('reorders pages and validates complete page orders', async () => {
      const file = await makePdf('reorder', 3)

      const reordered = await reorderPDFPages(file, [3, 1, 2])

      expect(await readPageCount(reordered)).toBe(3)
      await expect(reorderPDFPages(file, [1, 1, 3])).rejects.toThrow('duplicate')
      await expect(reorderPDFPages(file, [1, 2])).rejects.toThrow('every page')
    })
  })

  describe('rotation utilities', () => {
    it('rotates all pages and reads the resulting rotation', async () => {
      const file = await makePdf('rotate all', 2)

      const rotated = await rotateAllPages(file, 90)

      expect(await readRotation(rotated, 1)).toBe(90)
      expect(await readRotation(rotated, 2)).toBe(90)
    })

    it('rotates and resets a single page', async () => {
      const file = await makePdf('rotate one', 2)

      const rotated = await rotateSinglePage(file, 2, 180)
      const rotatedBytes = await readBlob(rotated)
      const rotatedFile = new File([rotatedBytes], 'rotated.pdf', { type: 'application/pdf' })
      Object.defineProperty(rotatedFile, 'arrayBuffer', {
        value: async () => rotatedBytes,
      })

      expect(await getPageRotation(rotatedFile, 1)).toBe(0)
      expect(await getPageRotation(rotatedFile, 2)).toBe(180)

      const reset = await resetRotation(rotatedFile, [2])
      expect(await readRotation(reset, 2)).toBe(0)
    })

    it('rejects invalid page numbers', async () => {
      const file = await makePdf('invalid rotation', 1)

      await expect(rotateSinglePage(file, 2, 90)).rejects.toThrow('Invalid page numbers')
      await expect(getPageRotation(file, 0)).rejects.toThrow('Failed to get page rotation')
    })
  })
})
