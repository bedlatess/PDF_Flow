const MAGIC_NUMBERS = {
  PDF: [0x25, 0x50, 0x44, 0x46],
  PNG: [0x89, 0x50, 0x4e, 0x47],
  JPEG: [0xff, 0xd8, 0xff],
  GIF: [0x47, 0x49, 0x46],
} as const

export type FileType = keyof typeof MAGIC_NUMBERS

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
    return false
  }
}

export async function validatePDF(file: File): Promise<boolean> {
  if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
    return false
  }
  return validateFileType(file, 'PDF')
}

export async function validateImage(file: File): Promise<boolean> {
  const imageTypes: FileType[] = ['PNG', 'JPEG', 'GIF']

  for (const type of imageTypes) {
    if (await validateFileType(file, type)) {
      return true
    }
  }

  return false
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
