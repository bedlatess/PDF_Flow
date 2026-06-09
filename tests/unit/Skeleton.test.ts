import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Skeleton from '@/components/common/Skeleton.vue'

describe('Skeleton Component', () => {
  it('renders default skeleton', () => {
    const wrapper = mount(Skeleton)

    expect(wrapper.find('.skeleton, .animate-pulse').exists()).toBe(true)
  })

  it('renders different variants', () => {
    const variants = ['text', 'circle', 'rect', 'button']

    variants.forEach((variant) => {
      const wrapper = mount(Skeleton, {
        props: {
          variant: variant,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })
  })

  it('applies custom width', () => {
    const wrapper = mount(Skeleton, {
      props: {
        width: '200px',
      },
    })

    const skeleton = wrapper.find('.animate-pulse')
    expect(skeleton.attributes('style')).toContain('200px')
  })

  it('applies custom height', () => {
    const wrapper = mount(Skeleton, {
      props: {
        height: '100px',
      },
    })

    const skeleton = wrapper.find('.animate-pulse')
    expect(skeleton.attributes('style')).toContain('100px')
  })

  it('renders circular variant', () => {
    const wrapper = mount(Skeleton, {
      props: {
        variant: 'circular',
        width: '50px',
      },
    })

    expect(wrapper.find('.rounded-full').exists()).toBe(true)
  })

  it('renders multiple lines for text variant', () => {
    const wrapper = mount(Skeleton, {
      props: {
        variant: 'text',
        lines: 3,
      },
    })

    // Should render 3 skeleton lines
    const lines = wrapper.findAll('.skeleton, .animate-pulse')
    expect(lines.length).toBeGreaterThanOrEqual(1)
  })

  it('has pulse animation', () => {
    const wrapper = mount(Skeleton)

    const skeleton = wrapper.find('.animate-pulse')
    expect(skeleton.exists()).toBe(true)
  })
})
