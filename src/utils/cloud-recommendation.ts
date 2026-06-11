const DEFAULT_LARGE_FILE_BYTES = 25 * 1024 * 1024
const DEFAULT_MANY_FILES_COUNT = 6

export interface CloudRecommendationOptions {
  largeFileBytes?: number
  manyFilesCount?: number
}

export const getTotalFileSize = (files: File[]) =>
  files.reduce((total, file) => total + file.size, 0)

export const shouldPreferCloudProcessing = (
  files: File[],
  canUseCloud: boolean,
  options: CloudRecommendationOptions = {},
) => {
  if (!canUseCloud || files.length === 0) {
    return false
  }

  const largeFileBytes = options.largeFileBytes ?? DEFAULT_LARGE_FILE_BYTES
  const manyFilesCount = options.manyFilesCount ?? DEFAULT_MANY_FILES_COUNT

  return getTotalFileSize(files) >= largeFileBytes || files.length >= manyFilesCount
}
