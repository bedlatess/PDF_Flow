import { ref } from 'vue'
import type { WorkerMessage, WorkerResponse } from '@/workers/pdf.worker'

export interface PDFWorkerTask {
  id: string
  type: WorkerMessage['type']
  progress: number
  status: 'pending' | 'processing' | 'success' | 'error'
  result?: Blob | Blob[]
  error?: string
}

export function usePDFWorker() {
  const tasks = ref<Map<string, PDFWorkerTask>>(new Map())
  const worker = ref<Worker | null>(null)

  const handleWorkerMessage = (event: MessageEvent<WorkerResponse>) => {
    const { id, type, payload } = event.data
    const task = tasks.value.get(id)

    if (!task) return

    switch (type) {
      case 'progress':
        task.progress = payload.progress || 0
        task.status = 'processing'
        break

      case 'success':
        task.progress = 100
        task.status = 'success'
        task.result = payload.result
        break

      case 'error':
        task.status = 'error'
        task.error = payload.error
        break
    }

    tasks.value.set(id, { ...task })
  }

  const markOpenTasksFailed = (message: string) => {
    tasks.value.forEach((task, id) => {
      if (task.status === 'pending' || task.status === 'processing') {
        tasks.value.set(id, {
          ...task,
          status: 'error',
          error: message,
        })
      }
    })
  }

  const initWorker = (): Worker | null => {
    if (worker.value) return worker.value

    try {
      const nextWorker = new Worker(new URL('../workers/pdf.worker.ts', import.meta.url), {
        type: 'module',
      })

      nextWorker.onmessage = handleWorkerMessage
      nextWorker.onerror = (event) => {
        markOpenTasksFailed(event.message || 'PDF worker failed')
      }

      worker.value = nextWorker
      return nextWorker
    } catch (error) {
      worker.value = null
      return null
    }
  }

  const generateTaskId = (): string => {
    return `task-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  }

  const submitTask = async (
    type: WorkerMessage['type'],
    payload: WorkerMessage['payload'],
  ): Promise<string> => {
    const taskId = generateTaskId()

    const task: PDFWorkerTask = {
      id: taskId,
      type,
      progress: 0,
      status: 'pending',
    }

    tasks.value.set(taskId, task)

    const activeWorker = initWorker()
    const message: WorkerMessage = {
      id: taskId,
      type,
      payload,
    }

    if (activeWorker) {
      activeWorker.postMessage(message)
    } else {
      processInMainThread(taskId, type, payload)
    }

    return taskId
  }

  const processInMainThread = async (
    taskId: string,
    type: WorkerMessage['type'],
    payload: WorkerMessage['payload'],
  ) => {
    const task = tasks.value.get(taskId)
    if (!task) return

    try {
      task.status = 'processing'
      task.progress = 10

      let result: Blob | Blob[]

      switch (type) {
        case 'merge': {
          const { mergePDFs } = await import('@/utils/pdf/merge')
          if (!payload.files) throw new Error('No files provided')
          task.progress = 30
          result = await mergePDFs(payload.files)
          break
        }

        case 'split': {
          const { splitPDF } = await import('@/utils/pdf/split')
          if (!payload.file) throw new Error('No file provided')
          task.progress = 30
          result = await splitPDF(payload.file, payload.options as any)
          break
        }

        case 'rotate': {
          const { rotatePDF } = await import('@/utils/pdf/rotate')
          if (!payload.file) throw new Error('No file provided')
          task.progress = 30
          result = await rotatePDF(payload.file, payload.options as any)
          break
        }

        case 'imageToPdf': {
          const { imagesToPDF } = await import('@/utils/pdf/convert')
          if (!payload.files) throw new Error('No files provided')
          task.progress = 30
          result = await imagesToPDF(payload.files, payload.options as any)
          break
        }

        case 'pdfToImage': {
          const { pdfToImages } = await import('@/utils/pdf/convert')
          if (!payload.file) throw new Error('No file provided')
          task.progress = 30
          result = await pdfToImages(payload.file, payload.options as any)
          break
        }

        default:
          throw new Error(`Unknown operation type: ${type}`)
      }

      task.progress = 100
      task.status = 'success'
      task.result = result
      tasks.value.set(taskId, { ...task })
    } catch (error) {
      task.status = 'error'
      task.error = error instanceof Error ? error.message : 'Processing failed'
      tasks.value.set(taskId, { ...task })
    }
  }

  const getTask = (taskId: string): PDFWorkerTask | undefined => {
    return tasks.value.get(taskId)
  }

  const waitForTask = (taskId: string): Promise<Blob | Blob[]> => {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const task = tasks.value.get(taskId)

        if (!task) {
          clearInterval(checkInterval)
          reject(new Error('Task not found'))
          return
        }

        if (task.status === 'success') {
          clearInterval(checkInterval)
          resolve(task.result!)
        } else if (task.status === 'error') {
          clearInterval(checkInterval)
          reject(new Error(task.error || 'Processing failed'))
        }
      }, 100)
    })
  }

  const clearTask = (taskId: string) => {
    tasks.value.delete(taskId)
  }

  const clearAllTasks = () => {
    tasks.value.clear()
  }

  const destroyWorker = () => {
    if (worker.value) {
      worker.value.terminate()
      worker.value = null
    }
    clearAllTasks()
  }

  return {
    tasks,
    submitTask,
    getTask,
    waitForTask,
    clearTask,
    clearAllTasks,
    destroyWorker,
  }
}
