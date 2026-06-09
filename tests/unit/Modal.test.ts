import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Modal from '@/components/common/Modal.vue'

// Setup and cleanup DOM for Teleport
beforeEach(() => {
  // Clean up any leftover modals
  document.body.innerHTML = ''
})

afterEach(() => {
  // Clean up after each test
  document.body.innerHTML = ''
})

// Helper to find teleported content
const findInBody = (selector: string) => {
  const el = document.body.querySelector(selector)
  return el
}

describe('Modal Component', () => {
  it('renders when modelValue is true', async () => {
    const wrapper = mount(Modal, {
      props: {
        modelValue: true,
        title: 'Test Modal',
      },
      slots: {
        default: '<p>Modal content</p>',
      },
    })

    // Wait for transitions and teleport
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Check teleported content in document.body
    const backdrop = findInBody('.fixed.inset-0')
    expect(backdrop).toBeTruthy()
    expect(document.body.textContent).toContain('Test Modal')
    expect(document.body.textContent).toContain('Modal content')
  })

  it('does not render when modelValue is false', async () => {
    const wrapper = mount(Modal, {
      props: {
        modelValue: false,
      },
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    const backdrop = findInBody('.fixed.inset-0')
    expect(backdrop).toBeFalsy()
  })

  it('emits update:modelValue when close button is clicked', async () => {
    const wrapper = mount(Modal, {
      props: {
        modelValue: true,
        showCloseButton: true,
        title: 'Test',
      },
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Find button in teleported content
    const closeButton = document.body.querySelector('button')
    expect(closeButton).toBeTruthy()

    closeButton?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('renders different sizes', async () => {
    const sizes = [
      { name: 'sm', class: 'max-w-sm' },
      { name: 'md', class: 'max-w-md' },
      { name: 'lg', class: 'max-w-lg' },
      { name: 'xl', class: 'max-w-xl' },
      { name: 'full', class: 'max-w-full' },
    ]

    for (const { name, class: expectedClass } of sizes) {
      // Clean DOM before each size test
      document.body.innerHTML = ''

      const wrapper = mount(Modal, {
        props: {
          modelValue: true,
          size: name,
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Find the modal content div in body
      const content = document.body.querySelector('.bg-white, .dark\\:bg-gray-800')
      expect(content?.classList.contains(expectedClass)).toBe(true)

      wrapper.unmount()
    }
  })

  it('closes on backdrop click when closeOnClickOutside is true', async () => {
    const wrapper = mount(Modal, {
      props: {
        modelValue: true,
        closeOnClickOutside: true,
      },
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Click on the backdrop
    const backdrop = document.body.querySelector('.fixed.inset-0')
    expect(backdrop).toBeTruthy()

    backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('does not close on backdrop click when closeOnClickOutside is false', async () => {
    const wrapper = mount(Modal, {
      props: {
        modelValue: true,
        closeOnClickOutside: false,
      },
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    const backdrop = document.body.querySelector('.fixed.inset-0')
    backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })
})
