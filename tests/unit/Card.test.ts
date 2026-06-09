import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Card from '@/components/common/Card.vue'

describe('Card Component', () => {
  it('renders with default props', () => {
    const wrapper = mount(Card, {
      slots: {
        default: '<p>Card content</p>',
      },
    })

    expect(wrapper.text()).toContain('Card content')
    expect(wrapper.classes()).toContain('bg-white')
  })

  it('renders with different variants', () => {
    const variants = ['default', 'glass', 'outlined']

    variants.forEach((variant) => {
      const wrapper = mount(Card, {
        props: {
          variant: variant,
        },
        slots: {
          default: 'Content',
        },
      })

      expect(wrapper.exists()).toBe(true)
    })
  })

  it('renders with hover effect when hoverable is true', () => {
    const wrapper = mount(Card, {
      props: {
        hoverable: true,
      },
      slots: {
        default: 'Content',
      },
    })

    expect(wrapper.classes()).toContain('hover:shadow-lg')
  })

  it('applies padding classes correctly', () => {
    const paddings = [
      { name: 'none', class: 'p-0' },
      { name: 'sm', class: 'p-4' },
      { name: 'md', class: 'p-6' },
      { name: 'lg', class: 'p-8' },
    ]

    paddings.forEach(({ name, class: className }) => {
      const wrapper = mount(Card, {
        props: {
          padding: name,
        },
        slots: {
          default: 'Content',
        },
      })

      expect(wrapper.classes()).toContain(className)
    })
  })

  it('shows cursor pointer when clickable', () => {
    const wrapper = mount(Card, {
      props: {
        clickable: true,
      },
      slots: {
        default: 'Clickable',
      },
    })

    expect(wrapper.classes()).toContain('cursor-pointer')
  })

  it('emits click event when clicked and clickable is true', async () => {
    const wrapper = mount(Card, {
      props: {
        clickable: true,
      },
      slots: {
        default: 'Clickable',
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('does not emit click when clickable is false', async () => {
    const wrapper = mount(Card, {
      props: {
        clickable: false,
      },
      slots: {
        default: 'Not clickable',
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('renders glass variant', () => {
    const wrapper = mount(Card, {
      props: {
        variant: 'glass',
      },
      slots: {
        default: 'Glass card',
      },
    })

    expect(wrapper.classes()).toContain('glass')
  })

  it('renders outlined variant', () => {
    const wrapper = mount(Card, {
      props: {
        variant: 'outlined',
      },
      slots: {
        default: 'Outlined card',
      },
    })

    expect(wrapper.classes()).toContain('border-2')
  })
})
