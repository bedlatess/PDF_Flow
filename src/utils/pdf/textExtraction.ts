import * as pdfjsLib from 'pdfjs-dist'
import { configurePdfJsWorker } from './configurePdfJs'

configurePdfJsWorker()

export interface ExtractedTextPage {
  pageNumber: number
  text: string
  characterCount: number
}

export interface ExtractedTextResult {
  text: string
  pages: ExtractedTextPage[]
  pageCount: number
  characterCount: number
}

export interface ExtractTextOptions {
  pageLabel?: (pageNumber: number) => string
}

interface TextContentItem {
  str?: string
  hasEOL?: boolean
}

export async function extractTextFromPDF(
  file: File,
  options: ExtractTextOptions = {}
): Promise<ExtractedTextResult> {
  if (!file) {
    throw new Error('No PDF file provided')
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  try {
    const pages: ExtractedTextPage[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const items = content.items as TextContentItem[]
      const text = normalizePageText(items)

      pages.push({
        pageNumber,
        text,
        characterCount: text.length,
      })
    }

    const text = pages
      .map((page) => `--- ${options.pageLabel?.(page.pageNumber) || `Page ${page.pageNumber}`} ---\n${page.text}`)
      .join('\n\n')
      .trim()

    return {
      text,
      pages,
      pageCount: pdf.numPages,
      characterCount: text.length,
    }
  } finally {
    await pdf.destroy()
  }
}

function normalizePageText(items: TextContentItem[]): string {
  const chunks: string[] = []

  for (const item of items) {
    const text = item.str || ''
    if (!text) continue

    chunks.push(text)
    chunks.push(item.hasEOL ? '\n' : ' ')
  }

  return chunks
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}
