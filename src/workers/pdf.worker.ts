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

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data

  try {
    postProgress(id, 5)
    const result = await runTask(type, payload, id)
    postSuccess(id, result)
  } catch (error) {
    postError(id, error instanceof Error ? error.message : 'Processing failed')
  }
}

async function runTask(
  type: WorkerMessage['type'],
  payload: WorkerMessage['payload'],
  id: string,
): Promise<Blob | Blob[]> {
  switch (type) {
    case 'merge': {
      if (!payload.files) throw new Error('No files provided')
      postProgress(id, 20)
      const { mergePDFs } = await import('../utils/pdf/merge')
      postProgress(id, 35)
      return mergePDFs(payload.files)
    }

    case 'split': {
      if (!payload.file) throw new Error('No file provided')
      postProgress(id, 20)
      const { splitPDF } = await import('../utils/pdf/split')
      postProgress(id, 35)
      return splitPDF(payload.file, payload.options as any)
    }

    case 'rotate': {
      if (!payload.file) throw new Error('No file provided')
      postProgress(id, 20)
      const { rotatePDF } = await import('../utils/pdf/rotate')
      postProgress(id, 35)
      return rotatePDF(payload.file, payload.options as any)
    }

    case 'imageToPdf': {
      if (!payload.files) throw new Error('No files provided')
      postProgress(id, 20)
      const { imagesToPDF } = await import('../utils/pdf/convert')
      postProgress(id, 35)
      return imagesToPDF(payload.files, payload.options as any)
    }

    case 'pdfToImage': {
      if (!payload.file) throw new Error('No file provided')
      postProgress(id, 20)
      const { pdfToImages } = await import('../utils/pdf/convert')
      postProgress(id, 35)
      return pdfToImages(payload.file, payload.options as any)
    }

    default:
      throw new Error(`Unknown operation type: ${type}`)
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
