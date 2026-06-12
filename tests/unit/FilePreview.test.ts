import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import FilePreview from '@/components/pdf/FilePreview.vue'

describe('FilePreview Component', () => {
  const objectUrl = 'blob:preview-url'

  beforeEach(() => {
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: () => objectUrl,
      })
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: () => {},
      })
    }

    vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const makeFile = (name = 'sample.pdf', type = 'application/pdf', size = 1024 * 1024) => {
    const file = new File(['content'], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  it('renders file name and formatted file size', () => {
    const wrapper = mount(FilePreview, {
      props: {
        file: makeFile(),
      },
    })

    expect(wrapper.text()).toContain('sample.pdf')
    expect(wrapper.text()).toContain('1 MB')
  })

  it('shows accessible preview and remove actions for PDF files', () => {
    const wrapper = mount(FilePreview, {
      props: {
        file: makeFile('contract.pdf'),
      },
    })

    expect(wrapper.get('button[aria-label="Preview contract.pdf"]').exists()).toBe(true)
    expect(wrapper.get('button[aria-label="Remove contract.pdf"]').exists()).toBe(true)
  })

  it('emits preview and remove events', async () => {
    const wrapper = mount(FilePreview, {
      props: {
        file: makeFile('report.pdf'),
      },
    })

    await wrapper.get('button[aria-label="Preview report.pdf"]').trigger('click')
    await wrapper.get('button[aria-label="Remove report.pdf"]').trigger('click')

    expect(wrapper.emitted('preview')).toHaveLength(1)
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('hides actions when showActions is false', () => {
    const wrapper = mount(FilePreview, {
      props: {
        file: makeFile(),
        showActions: false,
      },
    })

    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('hides remove action when removable is false', () => {
    const wrapper = mount(FilePreview, {
      props: {
        file: makeFile('locked.pdf'),
        removable: false,
      },
    })

    expect(wrapper.find('button[aria-label="Preview locked.pdf"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Remove locked.pdf"]').exists()).toBe(false)
  })

  it('uses an object URL for image thumbnails and revokes it on unmount', async () => {
    const wrapper = mount(FilePreview, {
      props: {
        file: makeFile('photo.png', 'image/png'),
      },
    })

    await nextTick()

    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(wrapper.get('img').attributes('src')).toBe(objectUrl)

    wrapper.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(objectUrl)
  })
})
