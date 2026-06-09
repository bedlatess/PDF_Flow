import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const locale = ref<'en' | 'zh' | 'es'>('en')
  const theme = ref<'light' | 'dark'>('light')

  const setLocale = (newLocale: typeof locale.value) => {
    locale.value = newLocale
  }

  const setTheme = (newTheme: typeof theme.value) => {
    theme.value = newTheme
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // 初始化主题
  const initTheme = () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(prefersDark ? 'dark' : 'light')
  }

  return {
    locale,
    theme,
    setLocale,
    setTheme,
    initTheme,
  }
})
