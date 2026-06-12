import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PDFViewer from '@/components/pdf/PDFViewer.vue'

const pdfMocks = vi.hoisted(() => {
  const renderMock = vi.fn(() => ({ promise: Promise.resolve() }))
  const getPageMock = vi.fn(() => Promise.resolve({
    getViewport: () => ({ height: 800, width: 600 }),
    render: renderMock,
  }))
  const getDocumentMock = vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 3,
      getPage: getPageMock,
    }),
  }))

  return {
    getDocumentMock,
    getPageMock,
    renderMock,
  }
})

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {
    workerSrc: '',
  },
  getDocument: pdfMocks.getDocumentMock,
}))

vi.mock('@/utils/pdf/configurePdfJs', () => ({
  configurePdfJsWorker: vi.fn(),
}))

describe('PDFViewer Component', () => {
  const createMockFile = () => ({
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    name: 'test.pdf',
    type: 'application/pdf',
  }) as unknown as File

  beforeEach(() => {
    pdfMocks.getDocumentMock.mockClear()
    pdfMocks.getPageMock.mockClear()
    pdfMocks.renderMock.mockClear()
  })

  it('renders the PDF viewer shell and loads the provided file', async () => {
    const wrapper = mount(PDFViewer, {
      props: {
        file: createMockFile(),
      },
    })

    await flushPromises()

    expect(wrapper.find('.pdf-viewer').exists()).toBe(true)
    expect(pdfMocks.getDocumentMock).toHaveBeenCalled()
  })

  it('displays navigation controls and page count', async () => {
    const wrapper = mount(PDFViewer, {
      props: {
        file: createMockFile(),
      },
    })

    await flushPromises()

    expect(wrapper.get('input[type="number"]').attributes('value')).toBe('1')
    expect(wrapper.text()).toContain('/ 3')
    expect(wrapper.findAll('button').length).toBeGreaterThan(0)
  })

  it('renders zoom controls', async () => {
    const wrapper = mount(PDFViewer, {
      props: {
        file: createMockFile(),
      },
    })

    await flushPromises()

    expect(wrapper.get('select').text()).toContain('100%')
    expect(wrapper.text()).toContain('+/- to zoom')
  })

  it('emits close from the close button', async () => {
    const wrapper = mount(PDFViewer, {
      props: {
        file: createMockFile(),
      },
    })

    await flushPromises()
    await wrapper.get('button[aria-label="Close PDF viewer"]').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('supports Escape keyboard close', async () => {
    const wrapper = mount(PDFViewer, {
      props: {
        file: createMockFile(),
      },
    })

    await flushPromises()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
