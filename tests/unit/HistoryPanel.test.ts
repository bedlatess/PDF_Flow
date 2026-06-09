import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import HistoryPanel from '@/components/common/HistoryPanel.vue'
import { historyManager } from '@/utils/history-manager'

describe('HistoryPanel Component', () => {
  beforeEach(() => {
    // Clear history before each test
    historyManager.clearHistory()
  })

  it('renders history panel', () => {
    const wrapper = mount(HistoryPanel)
    expect(wrapper.find('.history-panel').exists()).toBe(true)
  })

  it('shows empty state when no history', async () => {
    const wrapper = mount(HistoryPanel)
    await flushPromises()

    expect(wrapper.text()).toContain('暂无历史记录')
  })

  it('displays history items when they exist', async () => {
    // Add history BEFORE mounting
    historyManager.addHistory({
      type: 'merge',
      fileName: 'test.pdf',
      fileSize: 1024,
    })

    const wrapper = mount(HistoryPanel)

    // Wait for onMounted to execute
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Should show file name
    expect(wrapper.text()).toContain('test.pdf')
  })

  it('displays statistics when history exists', async () => {
    historyManager.addHistory({
      type: 'merge',
      fileName: 'test.pdf',
      fileSize: 1024,
    })

    const wrapper = mount(HistoryPanel)
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Should show stats
    expect(wrapper.text()).toContain('总文件')
  })

  it('groups items by date', async () => {
    historyManager.addHistory({
      type: 'merge',
      fileName: 'today.pdf',
      fileSize: 1024,
    })

    const wrapper = mount(HistoryPanel)
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Should show "今天" group header
    expect(wrapper.text()).toContain('今天')
  })

  it('shows tool icons', async () => {
    historyManager.addHistory({
      type: 'merge',
      fileName: 'test.pdf',
      fileSize: 1024,
    })

    const wrapper = mount(HistoryPanel)
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Should show merge emoji
    expect(wrapper.html()).toContain('📄')
  })

  it('can clear all history', async () => {
    historyManager.addHistory({
      type: 'merge',
      fileName: 'test1.pdf',
      fileSize: 1024,
    })

    const wrapper = mount(HistoryPanel)
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Mock window.confirm
    window.confirm = () => true

    // Find clear all button
    const clearButton = wrapper.findAll('button').find(b =>
      b.text().includes('清除所有')
    )

    if (clearButton) {
      await clearButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Should show empty state
      expect(wrapper.text()).toContain('暂无历史记录')
    }
  })

  it('displays most used tool in stats', async () => {
    historyManager.addHistory({
      type: 'merge',
      fileName: 'test1.pdf',
      fileSize: 1024,
    })

    const wrapper = mount(HistoryPanel)
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Should show "最常用" stat
    expect(wrapper.text()).toContain('最常用')
  })
})
