import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import HistoryPanel from '@/components/common/HistoryPanel.vue'
import { historyManager } from '@/utils/history-manager'

const createTestI18n = () => createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      history: {
        panel: {
          stats: {
            totalFiles: 'Total files',
            todayFiles: 'Today',
            mostUsed: 'Most used',
            spaceSaved: 'Space saved',
          },
          none: 'None',
          emptyTitle: 'No history yet',
          emptyDescription: 'Processed files will appear here.',
          groups: {
            today: 'Today',
            yesterday: 'Yesterday',
            older: 'Older',
          },
          time: {
            justNow: 'Just now',
            minutesAgo: '{count} minutes ago',
            hoursAgo: '{count} hours ago',
            daysAgo: '{count} days ago',
          },
          itemMeta: '{tool} - {time}',
          deleteItem: 'Remove history item',
          confirmTitle: 'Clear all history?',
          confirmMessage: 'This removes local history entries from this browser.',
          confirmAction: 'Clear history',
          cancelClear: 'Cancel',
          clearAll: 'Clear all history',
        },
        tools: {
          merge: 'Merge PDF',
          split: 'Split PDF',
          rotate: 'Rotate PDF',
          compress: 'Compress PDF',
          imageToPdf: 'Image to PDF',
          pdfToImage: 'PDF to Image',
          deletePages: 'Delete pages',
          organize: 'Organize PDF',
          pageNumbers: 'Page numbers',
          crop: 'Crop PDF',
          protect: 'Protect PDF',
          unlock: 'Unlock PDF',
          sign: 'Sign PDF',
          extractText: 'Extract text',
          extractImages: 'Extract images',
          watermark: 'Watermark',
          flatten: 'Flatten PDF',
          repair: 'Repair PDF',
        },
      },
    },
  },
})

const mountPanel = () => mount(HistoryPanel, {
  global: {
    plugins: [createTestI18n()],
  },
})

describe('HistoryPanel Component', () => {
  beforeEach(() => {
    historyManager.clearHistory()
  })

  it('renders history panel', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('.history-panel').exists()).toBe(true)
  })

  it('shows empty state when no history', async () => {
    const wrapper = mountPanel()
    await flushPromises()

    expect(wrapper.text()).toContain('No history yet')
    expect(wrapper.text()).toContain('Processed files will appear here.')
  })

  it('displays history items, stats, and group labels', async () => {
    historyManager.addHistory({
      type: 'merge',
      fileName: 'test.pdf',
      fileSize: 1024,
    })

    const wrapper = mountPanel()
    await flushPromises()

    expect(wrapper.text()).toContain('test.pdf')
    expect(wrapper.text()).toContain('Total files')
    expect(wrapper.text()).toContain('Most used')
    expect(wrapper.text()).toContain('Merge PDF')
    expect(wrapper.text()).toContain('Today')
  })

  it('shows tool initials instead of legacy emoji icons', async () => {
    historyManager.addHistory({
      type: 'merge',
      fileName: 'test.pdf',
      fileSize: 1024,
    })

    const wrapper = mountPanel()
    await flushPromises()

    expect(wrapper.text()).toContain('M')
  })

  it('clears all history through the in-page confirmation flow', async () => {
    historyManager.addHistory({
      type: 'merge',
      fileName: 'test1.pdf',
      fileSize: 1024,
    })

    const wrapper = mountPanel()
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text() === 'Clear all history')?.trigger('click')
    expect(wrapper.text()).toContain('Clear all history?')

    await wrapper.findAll('button').find((button) => button.text() === 'Clear history')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('No history yet')
  })

  it('removes a single history item', async () => {
    historyManager.addHistory({
      type: 'split',
      fileName: 'remove-me.pdf',
      fileSize: 1024,
    })

    const wrapper = mountPanel()
    await flushPromises()

    await wrapper.get('button[aria-label="Remove history item"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('No history yet')
  })
})
