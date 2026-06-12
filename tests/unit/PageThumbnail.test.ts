import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PageThumbnail from '@/components/pdf/PageThumbnail.vue'

const generateThumbnail = vi.fn()
const getThumbnail = vi.fn()

vi.mock('@/composables/usePDFThumbnail', () => ({
  usePDFThumbnail: () => ({
    generateThumbnail,
    getThumbnail,
  }),
}))

describe('PageThumbnail Component', () => {
  const mockFile = new File(['content'], 'test.pdf', {
    type: 'application/pdf',
  })

  beforeEach(() => {
    generateThumbnail.mockResolvedValue('data:image/png;base64,thumbnail')
    getThumbnail.mockReturnValue(undefined)
  })

  it('renders accessible page and action labels', async () => {
    const wrapper = mount(PageThumbnail, {
      props: {
        file: mockFile,
        pageNumber: 3,
        selected: true,
      },
    })

    await flushPromises()

    expect(wrapper.attributes('role')).toBe('button')
    expect(wrapper.attributes('aria-label')).toBe('Page 3')
    expect(wrapper.attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('button[aria-label="Rotate page 3"]').exists()).toBe(true)
    expect(wrapper.get('button[aria-label="Remove page 3"]').exists()).toBe(true)
  })

  it('emits click, rotate, and remove events', async () => {
    const wrapper = mount(PageThumbnail, {
      props: {
        file: mockFile,
        pageNumber: 2,
      },
    })

    await wrapper.trigger('click')
    await wrapper.get('button[aria-label="Rotate page 2"]').trigger('click')
    await wrapper.get('button[aria-label="Remove page 2"]').trigger('click')

    expect(wrapper.emitted('click')?.[0]?.[0]).toBe(2)
    expect(wrapper.emitted('rotate')).toEqual([[2]])
    expect(wrapper.emitted('remove')).toEqual([[2]])
  })

  it('shows a clean error message when preview generation fails', async () => {
    generateThumbnail.mockResolvedValue(null)

    const wrapper = mount(PageThumbnail, {
      props: {
        file: mockFile,
        pageNumber: 1,
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Preview unavailable')
  })
})
