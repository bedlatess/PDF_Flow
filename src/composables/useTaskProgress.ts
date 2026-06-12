/**
 * useTaskProgress - 统一任务进度处理（WebSocket优先，轮询兜底）
 *
 * 自动尝试 WebSocket 连接，如果失败则回退到轮询
 *
 * 使用示例：
 * const { startTracking, progress, status, error } = useTaskProgress()
 * await startTracking(jobId, onComplete)
 */
import { ref, computed } from 'vue'
import { useWebSocket } from './useWebSocket'
import { fileAPI } from '@/services/api'

export function useTaskProgress() {
  const isUsingWebSocket = ref(false)
  const progress = ref(0)
  const status = ref<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle')
  const message = ref('')
  const error = ref('')

  // WebSocket实例
  const {
    connect: wsConnect,
    disconnect: wsDisconnect,
    isConnected,
    progress: wsProgress,
    status: wsStatus,
    message: wsMessage,
    error: wsError,
    isCompleted: wsCompleted,
    isFailed: wsFailed
  } = useWebSocket()

  /**
   * 使用WebSocket追踪任务进度
   */
  const trackWithWebSocket = (jobId: string, onComplete?: (status: any) => void) => {
    isUsingWebSocket.value = true
    wsConnect(jobId)

    // 监听WebSocket状态变化
    const checkInterval = setInterval(() => {
      progress.value = wsProgress.value
      status.value = wsStatus.value
      message.value = wsMessage.value
      error.value = wsError.value

      // 任务完成或失败
      if (wsCompleted.value || wsFailed.value) {
        clearInterval(checkInterval)
        wsDisconnect()

        if (onComplete) {
          onComplete({
            status: wsStatus.value,
            progress: wsProgress.value,
            error: wsError.value
          })
        }
      }
    }, 100)

    return () => {
      clearInterval(checkInterval)
      wsDisconnect()
    }
  }

  /**
   * 使用轮询追踪任务进度
   */
  const trackWithPolling = async (jobId: string, onProgress?: (progress: number) => void) => {
    isUsingWebSocket.value = false

    const finalStatus = await fileAPI.pollJobUntilDone(
      jobId,
      (statusData) => {
        progress.value = statusData.progress || 0
        status.value = statusData.status
        message.value = `轮询中... ${progress.value}%`

        if (onProgress) {
          onProgress(progress.value)
        }
      },
      1500,
      80
    )

    return finalStatus
  }

  /**
   * 开始追踪任务进度（自动选择WebSocket或轮询）
   *
   * @param jobId 任务ID
   * @param onComplete 完成回调
   * @param forcePolling 强制使用轮询（可选）
   */
  const startTracking = async (
    jobId: string,
    onComplete?: (status: any) => void,
    forcePolling = false
  ) => {
    progress.value = 0
    status.value = 'pending'
    message.value = ''
    error.value = ''

    // 检查是否支持WebSocket且未强制轮询
    const supportsWebSocket = typeof WebSocket !== 'undefined' && !forcePolling

    if (supportsWebSocket) {
      try {
        // 尝试使用WebSocket
        const cleanup = trackWithWebSocket(jobId, onComplete)

        // 等待连接或超时（3秒）
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (!isConnected.value) {
              cleanup()
              reject(new Error('WebSocket timeout'))
            }
          }, 3000)

          // 如果连接成功，清除超时
          const checkConnected = setInterval(() => {
            if (isConnected.value) {
              clearTimeout(timeout)
              clearInterval(checkConnected)
              resolve(true)
            }
          }, 100)
        })

      } catch (e) {
        // WebSocket失败，回退到轮询
        return await trackWithPolling(jobId, (prog) => {
          if (onComplete && prog === 100) {
            onComplete({ status: 'completed', progress: 100 })
          }
        })
      }
    } else {
      // 不支持WebSocket或强制轮询，直接使用轮询
      return await trackWithPolling(jobId, (prog) => {
        if (onComplete && prog === 100) {
          onComplete({ status: 'completed', progress: 100 })
        }
      })
    }
  }

  /**
   * 停止追踪
   */
  const stopTracking = () => {
    if (isUsingWebSocket.value) {
      wsDisconnect()
    }
    progress.value = 0
    status.value = 'idle'
    message.value = ''
    error.value = ''
  }

  const isProcessing = computed(() => {
    return status.value === 'pending' || status.value === 'processing'
  })

  const isCompleted = computed(() => {
    return status.value === 'completed'
  })

  const isFailed = computed(() => {
    return status.value === 'failed'
  })

  return {
    // State
    progress,
    status,
    message,
    error,
    isUsingWebSocket,

    // Computed
    isProcessing,
    isCompleted,
    isFailed,

    // Methods
    startTracking,
    stopTracking,
  }
}
