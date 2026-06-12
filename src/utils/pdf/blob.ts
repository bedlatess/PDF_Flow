export function pdfBytesToBlob(bytes: Uint8Array): Blob {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(arrayBuffer).set(bytes)
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' })

  Object.defineProperty(blob, 'arrayBuffer', {
    configurable: true,
    value: async () => arrayBuffer.slice(0),
  })

  return blob
}
