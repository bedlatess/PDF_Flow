import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PageSelector from '@/components/pdf/PageSelector.vue'

const generateThumbnail = vi.fn()
const getThumbnail = vi.fn()

vi.mock('@/composables/usePDFThumbnail', () => ({
  usePDFThumbnail: () => ({
    generateThumbnail,
    getThumbnail,
  }),
}))

describe('PageSelector Component', () => {
  const mockFile = new File(['content'], 'test.pdf', {
    type: 'application/pdf',
  })

  beforeEach(() => {
    generateThumbnail.mockResolvedValue('data:image/png;base64,thumbnail')
    getThumbnail.mockReturnValue(undefined)
  })

  it('renders page selector controls and thumbnails', () => {
    const wrapper = mount(PageSelector, {
      props: {
        file: mockFile,
        totalPages: 5,
      },
    })

    expect(wrapper.text()).toContain('Selected 0 / 5 pages')
    expect(wrapper.text()).toContain('Select all')
    expect(wrapper.findAll('[data-testid="page-thumbnail"]')).toHaveLength(5)
  })

  it('selects and clears all pages', async () => {
    const wrapper = mount(PageSelector, {
      props: {
        file: mockFile,
        totalPages: 4,
      },
    })

    await wrapper.get('button:nth-of-type(1)').trigger('click')
    expect(wrapper.text()).toContain('Selected 4 / 4 pages')
    expect(wrapper.findAll('[aria-pressed="true"]')).toHaveLength(4)

    await wrapper.get('button:nth-of-type(2)').trigger('click')
    expect(wrapper.text()).toContain('Selected 0 / 4 pages')
    expect(wrapper.findAll('[aria-pressed="true"]')).toHaveLength(0)
  })

  it('selects odd and even page groups', async () => {
    const wrapper = mount(PageSelector, {
      props: {
        file: mockFile,
        totalPages: 6,
      },
    })

    await wrapper.findAll('button').find((button) => button.text() === 'Odd pages')?.trigger('click')
    expect(wrapper.text()).toContain('Selected 3 / 6 pages')
    expect(wrapper.get('[aria-label="Page 1"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[aria-label="Page 2"]').attributes('aria-pressed')).toBe('false')

    await wrapper.findAll('button').find((button) => button.text() === 'Even pages')?.trigger('click')
    expect(wrapper.text()).toContain('Selected 3 / 6 pages')
    expect(wrapper.get('[aria-label="Page 1"]').attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('[aria-label="Page 2"]').attributes('aria-pressed')).toBe('true')
  })

  it('supports individual and shift-range selection', async () => {
    const wrapper = mount(PageSelector, {
      props: {
        file: mockFile,
        totalPages: 5,
      },
    })

    await wrapper.get('[aria-label="Page 2"]').trigger('click')
    await wrapper.get('[aria-label="Page 5"]').trigger('click', { shiftKey: true })

    expect(wrapper.text()).toContain('Selected 4 / 5 pages')
    expect(wrapper.get('[aria-label="Page 1"]').attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('[aria-label="Page 2"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[aria-label="Page 5"]').attributes('aria-pressed')).toBe('true')
  })

  it('emits selected pages in ascending order on confirm', async () => {
    const wrapper = mount(PageSelector, {
      props: {
        file: mockFile,
        totalPages: 4,
      },
    })

    await wrapper.get('[aria-label="Page 4"]').trigger('click')
    await wrapper.get('[aria-label="Page 2"]').trigger('click')
    await wrapper.findAll('button').find((button) => button.text().startsWith('Confirm selection'))?.trigger('click')

    expect(wrapper.emitted('confirm')).toEqual([[[2, 4]]])
  })

  it('emits cancel event', async () => {
    const wrapper = mount(PageSelector, {
      props: {
        file: mockFile,
        totalPages: 5,
      },
    })

    await wrapper.findAll('button').find((button) => button.text() === 'Cancel')?.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})
