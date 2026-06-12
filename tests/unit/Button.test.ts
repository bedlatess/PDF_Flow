import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '@/components/common/Button.vue'

describe('Button Component', () => {
  it('renders with default props', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me',
      },
    })

    expect(wrapper.text()).toBe('Click me')
    expect(wrapper.classes()).toContain('bg-primary')
    expect(wrapper.classes()).toContain('rounded-md')
  })

  it('renders different variants', () => {
    const variants = [
      { name: 'primary', class: 'bg-primary' },
      { name: 'secondary', class: 'bg-gray-200' },
      { name: 'outline', class: 'border-primary' },
      { name: 'ghost', class: 'text-gray-700' },
    ]

    variants.forEach(({ name, class: expectedClass }) => {
      const wrapper = mount(Button, {
        props: { variant: name },
        slots: { default: 'Button' },
      })

      expect(wrapper.classes()).toContain(expectedClass)
    })
  })

  it('renders different sizes', () => {
    const sizes = [
      { name: 'sm', class: 'px-3' },
      { name: 'md', class: 'px-4' },
      { name: 'lg', class: 'px-6' },
    ]

    sizes.forEach(({ name, class: expectedClass }) => {
      const wrapper = mount(Button, {
        props: { size: name },
        slots: { default: 'Button' },
      })

      expect(wrapper.classes()).toContain(expectedClass)
    })
  })

  it('emits click event', async () => {
    const wrapper = mount(Button, {
      slots: { default: 'Click' },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(Button, {
      props: { disabled: true },
      slots: { default: 'Disabled' },
    })

    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('shows loading state', () => {
    const wrapper = mount(Button, {
      props: { loading: true },
      slots: { default: 'Loading' },
    })

    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('renders full width when fullWidth is true', () => {
    const wrapper = mount(Button, {
      props: { fullWidth: true },
      slots: { default: 'Full' },
    })

    expect(wrapper.classes()).toContain('w-full')
  })
})
