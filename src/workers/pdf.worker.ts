/**
 * PDF 处理 Web Worker
 * 在后台线程处理 PDF 操作，避免阻塞主线程
 */

import { mergePDFs, getPDFPageCount } from '../utils/pdf/merge'
import { splitPDF, extractPDFPages } from '../utils/pdf/split'
import { rotatePDF } from '../utils/pdf/rotate'
import { imagesToPDF, pdfToImages } from '../utils/pdf/convert'

export interface WorkerMessage {
  id: string
  type: 'merge' | 'split' | 'rotate' | 'imageToPdf' | 'pdfToImage'
  payload: {
    files?: File[]
    file?: File
    options?: Record<string, unknown>
  }
}

export interface WorkerResponse {
  id: string
  type: 'progress' | 'success' | 'error'
  payload: {
    progress?: number
    result?: Blob | Blob[]
    error?: string
  }
}

// Worker 消息处理
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data

  try {
    // 发送开始处理消息
    postProgress(id, 0)

    let result: Blob | Blob[]

    switch (type) {
      case 'merge':
        if (!payload.files) throw new Error('No files provided')
        result = await mergePDFs(payload.files)
        break

      case 'split':
        if (!payload.file) throw new Error('No file provided')
        result = await splitPDF(payload.file, payload.options as any)
        break

      case 'rotate':
        if (!payload.file) throw new Error('No file provided')
        result = await rotatePDF(payload.file, payload.options as any)
        break

      case 'imageToPdf':
        if (!payload.files) throw new Error('No files provided')
        result = await imagesToPDF(payload.files, payload.options as any)
        break

      case 'pdfToImage':
        if (!payload.file) throw new Error('No file provided')
        result = await pdfToImages(payload.file, payload.options as any)
        break

      default:
        throw new Error(`Unknown operation type: ${type}`)
    }

    // 发送完成消息
    postSuccess(id, result)
  } catch (error) {
    // 发送错误消息
    postError(id, error instanceof Error ? error.message : 'Processing failed')
  }
}

function postProgress(id: string, progress: number) {
  const response: WorkerResponse = {
    id,
    type: 'progress',
    payload: { progress },
  }
  self.postMessage(response)
}

function postSuccess(id: string, result: Blob | Blob[]) {
  const response: WorkerResponse = {
    id,
    type: 'success',
    payload: { result },
  }
  self.postMessage(response)
}

function postError(id: string, error: string) {
  const response: WorkerResponse = {
    id,
    type: 'error',
    payload: { error },
  }
  self.postMessage(response)
}
