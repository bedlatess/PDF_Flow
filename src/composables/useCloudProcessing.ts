/**
 * useCloudProcessing — 云端处理通用流程封装
 *
 * 统一处理：上传文件 → 提交任务 → 轮询进度 → 下载结果。
 * 各工具页只需提供 `submit(fileId)` 回调（调用对应 fileAPI 方法），
 * 即可获得一致的进度状态与错误处理，避免在 6 个工具页重复样板代码。
 *
 * 仅 Pro/Enterprise 用户可用（由调用方结合 userStore.canUseCloudFeatures 控制 UI）。
 */
import { ref } from 'vue'
import { fileAPI, type ProcessingJobResponse, type JobStatusResponse } from '@/services/api'

export type CloudPhase = 'idle' | 'uploading' | 'queued' | 'processing' | 'downloading' | 'done' | 'error'

export function useCloudProcessing() {
  const isCloudProcessing = ref(false)
  const cloudProgress = ref(0)
  const cloudPhase = ref<CloudPhase>('idle')
  const cloudError = ref('')

  /**
   * 在云端处理一个文件并返回结果 Blob。
   *
   * @param file   要上传处理的文件
   * @param submit 收到 fileId 后提交具体任务的回调（如 fid => fileAPI.compressPDF(fid, 'medium')）
   * @returns 处理结果的 Blob（调用方负责触发下载）
   */
  async function processInCloud(
    file: File,
    submit: (fileId: string) => Promise<ProcessingJobResponse>
  ): Promise<Blob> {
    isCloudProcessing.value = true
    cloudProgress.value = 0
    cloudError.value = ''
    cloudPhase.value = 'uploading'

    try {
      // 1. 上传
      const uploaded = await fileAPI.uploadFile(file)
      cloudProgress.value = 25
      cloudPhase.value = 'queued'

      // 2. 提交任务
      const job = await submit(uploaded.file_id)
      cloudPhase.value = 'processing'

      // 3. 轮询直到完成/失败
      const finalStatus: JobStatusResponse = await fileAPI.pollJobUntilDone(
        job.job_id,
        (s) => {
          // 任务进度优先；否则在 25~90 间平滑推进
          if (typeof s.progress === 'number' && s.progress > 0) {
            cloudProgress.value = Math.max(25, Math.min(95, s.progress))
          } else if (cloudProgress.value < 90) {
            cloudProgress.value += 5
          }
        }
      )

      if (finalStatus.status === 'failed') {
        throw new Error(finalStatus.error || 'Cloud processing failed')
      }

      // 4. 下载结果
      cloudPhase.value = 'downloading'
      cloudProgress.value = 95
      const blob = await fileAPI.downloadResult(job.job_id)

      cloudProgress.value = 100
      cloudPhase.value = 'done'
      return blob
    } catch (e: any) {
      cloudPhase.value = 'error'
      cloudError.value =
        e?.response?.data?.detail || e?.message || 'Cloud processing failed'
      throw e
    } finally {
      isCloudProcessing.value = false
    }
  }

  function reset() {
    isCloudProcessing.value = false
    cloudProgress.value = 0
    cloudPhase.value = 'idle'
    cloudError.value = ''
  }

  return {
    isCloudProcessing,
    cloudProgress,
    cloudPhase,
    cloudError,
    processInCloud,
    reset,
  }
}
