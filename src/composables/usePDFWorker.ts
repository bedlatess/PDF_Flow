/**
 * PDF Worker 组合式函数
 * 封装 Web Worker 逻辑，提供进度追踪
 */

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

  /**
   * 初始化 Worker
   */
  const initWorker = () => {
    if (worker.value) return

    try {
      // Vite 支持 Worker 导入
      worker.value = new Worker(new URL('../workers/pdf.worker.ts', import.meta.url), {
        type: 'module',
      })

      worker.value.onmessage = handleWorkerMessage
      worker.value.onerror = handleWorkerError

      console.log('PDF Worker initialized successfully')
    } catch (error) {
      console.warn('Worker not available, will process in main thread:', error)
      worker.value = null
    }
  }

  /**
   * 处理 Worker 消息
   */
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

  /**
   * 处理 Worker 错误
   */
  const handleWorkerError = (error: ErrorEvent) => {
    console.error('Worker error:', error)
  }

  /**
   * 生成任务 ID
   */
  const generateTaskId = (): string => {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 提交任务到 Worker
   */
  const submitTask = async (
    type: WorkerMessage['type'],
    payload: WorkerMessage['payload']
  ): Promise<string> => {
    const taskId = generateTaskId()

    const task: PDFWorkerTask = {
      id: taskId,
      type,
      progress: 0,
      status: 'pending',
    }

    tasks.value.set(taskId, task)

    // 如果 Worker 可用，发送到 Worker
    if (worker.value) {
      const message: WorkerMessage = {
        id: taskId,
        type,
        payload,
      }
      worker.value.postMessage(message)
    } else {
      // 否则在主线程处理（带进度模拟）
      processInMainThread(taskId, type, payload)
    }

    return taskId
  }

  /**
   * 在主线程处理（回退方案）
   */
  const processInMainThread = async (
    taskId: string,
    type: WorkerMessage['type'],
    payload: WorkerMessage['payload']
  ) => {
    const task = tasks.value.get(taskId)
    if (!task) return

    try {
      task.status = 'processing'
      task.progress = 10

      // 动态导入处理函数
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

  /**
   * 获取任务状态
   */
  const getTask = (taskId: string): PDFWorkerTask | undefined => {
    return tasks.value.get(taskId)
  }

  /**
   * 等待任务完成
   */
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

  /**
   * 清除任务
   */
  const clearTask = (taskId: string) => {
    tasks.value.delete(taskId)
  }

  /**
   * 清除所有任务
   */
  const clearAllTasks = () => {
    tasks.value.clear()
  }

  /**
   * 销毁 Worker
   */
  const destroyWorker = () => {
    if (worker.value) {
      worker.value.terminate()
      worker.value = null
    }
    clearAllTasks()
  }

  // 初始化
  initWorker()

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
