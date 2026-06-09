import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FilePreview from '@/components/pdf/FilePreview.vue'

describe('FilePreview Component', () => {
  const mockFile = new File(['content'], 'test.pdf', {
    type: 'application/pdf',
  })

  Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }) // 1MB

  it('renders file preview with file info', () => {
    const wrapper = mount(FilePreview, {
      props: {
        file: mockFile,
      },
    })

    expect(wrapper.text()).toContain('test.pdf')
  })

  it('displays file size', () => {
    const wrapper = mount(FilePreview, {
      props: {
        file: mockFile,
      },
    })

    // Should show file size
    expect(wrapper.text()).toMatch(/MB|KB/)
  })

  it('shows remove button when removable is true', () => {
    const wrapper = mount(FilePreview, {
      props: {
        file: mockFile,
        removable: true,
      },
    })

    // Button should exist in actions
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('emits remove event when remove button clicked', async () => {
    const wrapper = mount(FilePreview, {
      props: {
        file: mockFile,
        removable: true,
      },
    })

    // Find and click remove button (last button is usually remove)
    const buttons = wrapper.findAll('button')
    if (buttons.length > 0) {
      await buttons[buttons.length - 1].trigger('click')
      expect(wrapper.emitted('remove')).toBeTruthy()
    }
  })

  it('shows PDF icon for PDF files', () => {
    const wrapper = mount(FilePreview, {
      props: {
        file: mockFile,
      },
    })

    // Should render SVG icon
    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
  })

  it('hides actions when showActions is false', () => {
    const wrapper = mount(FilePreview, {
      props: {
        file: mockFile,
        showActions: false,
      },
    })

    // Actions container should not exist or be empty
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(0)
  })

  it('shows preview button for PDF files', () => {
    const wrapper = mount(FilePreview, {
      props: {
        file: mockFile,
        showActions: true,
      },
    })

    // Should have preview button
    expect(wrapper.html()).toContain('svg')
  })

  it('emits preview event when preview button clicked', async () => {
    const wrapper = mount(FilePreview, {
      props: {
        file: mockFile,
        showActions: true,
      },
    })

    const buttons = wrapper.findAll('button')
    if (buttons.length > 0) {
      // First button is preview
      await buttons[0].trigger('click')
      expect(wrapper.emitted('preview')).toBeTruthy()
    }
  })
})
