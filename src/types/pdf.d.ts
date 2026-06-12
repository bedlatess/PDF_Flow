/**
 * Shared PDF-related types.
 */

export interface PDFDocument {
  id: string
  name: string
  size: number
  pageCount: number
  blob: Blob
  url: string
}

export interface PDFPage {
  pageNumber: number
  width: number
  height: number
  rotation: number
  thumbnail?: string
}

export interface PDFProcessingOptions {
  quality?: number
  compression?: boolean
  format?: 'pdf' | 'jpg' | 'png'
}

export interface PDFMergeOptions extends PDFProcessingOptions {
  order?: number[]
}

export interface PDFSplitOptions {
  ranges?: string
  pages?: number[]
}

export interface PDFRotateOptions {
  angle: 90 | 180 | 270
  pages?: number[]
}
