import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProgressBar from '@/components/common/ProgressBar.vue'

describe('ProgressBar Component', () => {
  it('renders with progress value', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        progress: 50,
      },
    })

    expect(wrapper.find('.bg-primary').exists()).toBe(true)
  })

  it('displays correct progress percentage', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        progress: 75,
      },
    })

    // Check percentage text
    expect(wrapper.text()).toContain('75')
  })

  it('renders label when provided', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        progress: 50,
        label: 'Processing...',
      },
    })

    expect(wrapper.text()).toContain('Processing')
  })

  it('shows percentage text when showPercentage is true', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        progress: 65,
        showPercentage: true,
      },
    })

    expect(wrapper.text()).toContain('65')
  })

  it('applies correct width based on progress', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        progress: 80,
      },
    })

    const progressFill = wrapper.find('.bg-primary, .bg-blue-500, .bg-blue-600')
    const style = progressFill.attributes('style')
    expect(style).toContain('80')
  })

  it('renders different variants correctly', () => {
    const variants = [
      { name: 'primary', class: 'bg-primary' },
      { name: 'success', class: 'bg-success' },
      { name: 'warning', class: 'bg-warning' },
      { name: 'error', class: 'bg-error' },
    ]

    variants.forEach(({ name, class: className }) => {
      const wrapper = mount(ProgressBar, {
        props: {
          progress: 50,
          variant: name,
        },
      })

      expect(wrapper.find(`.${className}`).exists()).toBe(true)
    })
  })

  it('handles 0% progress', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        progress: 0,
      },
    })

    expect(wrapper.text()).toContain('0')
  })

  it('handles 100% progress', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        progress: 100,
      },
    })

    expect(wrapper.text()).toContain('100')
  })

  it('clamps progress value between 0 and 100', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        progress: 150, // Invalid value
      },
    })

    // Should display 100%
    expect(wrapper.text()).toContain('100')
  })

  it('renders with indeterminate state', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        progress: 0,
        indeterminate: true,
      },
    })

    // Check for indeterminate animation class
    const hasAnimation = wrapper.html().includes('animate-') || wrapper.classes().some(c => c.includes('animate'))
    expect(hasAnimation).toBe(true)
  })
})
