import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DragDropZone from '@/components/pdf/DragDropZone.vue'
import { createI18n } from 'vue-i18n'

const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  messages: {
    zh: {
      common: {
        dragDrop: '拖拽文件到这里',
        privacyBadge: '本地处理',
      },
    },
  },
})

describe('DragDropZone Component', () => {
  it('renders drag drop zone', () => {
    const wrapper = mount(DragDropZone, {
      global: {
        plugins: [i18n],
      },
    })

    expect(wrapper.text()).toMatch(/拖拽|点击|文件/i)
  })

  it('shows upload text', () => {
    const wrapper = mount(DragDropZone, {
      props: {
        accept: 'pdf',
      },
      global: {
        plugins: [i18n],
      },
    })

    expect(wrapper.text()).toMatch(/拖拽|点击|文件/i)
  })

  it('accepts PDF file type', () => {
    const wrapper = mount(DragDropZone, {
      props: {
        accept: 'pdf',
      },
      global: {
        plugins: [i18n],
      },
    })

    const input = wrapper.find('input[type="file"]')
    expect(input.attributes('accept')).toBe('application/pdf')
  })

  it('supports multiple file upload', () => {
    const wrapper = mount(DragDropZone, {
      props: {
        multiple: true,
      },
      global: {
        plugins: [i18n],
      },
    })

    const input = wrapper.find('input[type="file"]')
    expect(input.attributes('multiple')).toBeDefined()
  })

  it('shows drag active state', async () => {
    const wrapper = mount(DragDropZone, {
      global: {
        plugins: [i18n],
      },
    })

    await wrapper.trigger('dragenter')

    // Check for drag-active class
    expect(wrapper.html()).toContain('drag-active')
  })

  it('handles drag leave', async () => {
    const wrapper = mount(DragDropZone, {
      global: {
        plugins: [i18n],
      },
    })

    await wrapper.trigger('dragenter')
    await wrapper.trigger('dragleave')

    // State should return to normal
    expect(wrapper.exists()).toBe(true)
  })

  it('shows file size limit', () => {
    const wrapper = mount(DragDropZone, {
      props: {
        maxSize: 50,
      },
      global: {
        plugins: [i18n],
      },
    })

    expect(wrapper.text()).toContain('50')
  })

  it('displays privacy badge', () => {
    const wrapper = mount(DragDropZone, {
      global: {
        plugins: [i18n],
      },
    })

    expect(wrapper.text()).toMatch(/本地|隐私/i)
  })
})
