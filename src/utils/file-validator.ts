/**
 * 文件头魔术数字校验
 * 根据 STRIDE 威胁模型 - 防止文件类型欺骗
 */

const MAGIC_NUMBERS = {
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
  PNG: [0x89, 0x50, 0x4e, 0x47], // PNG
  JPEG: [0xff, 0xd8, 0xff], // JPEG
  GIF: [0x47, 0x49, 0x46], // GIF
} as const

export type FileType = keyof typeof MAGIC_NUMBERS

/**
 * 验证文件类型是否匹配魔术数字
 * @param file 文件对象
 * @param expectedType 期望的文件类型
 * @returns Promise<boolean>
 */
export async function validateFileType(
  file: File,
  expectedType: FileType
): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 8).arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const magicNumbers = MAGIC_NUMBERS[expectedType]

    return magicNumbers.every((byte, index) => bytes[index] === byte)
  } catch (error) {
    console.error('File validation error:', error)
    return false
  }
}

/**
 * 验证 PDF 文件
 */
export async function validatePDF(file: File): Promise<boolean> {
  if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
    return false
  }
  return validateFileType(file, 'PDF')
}

/**
 * 验证图片文件
 */
export async function validateImage(file: File): Promise<boolean> {
  const imageTypes: FileType[] = ['PNG', 'JPEG', 'GIF']

  for (const type of imageTypes) {
    if (await validateFileType(file, type)) {
      return true
    }
  }

  return false
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
