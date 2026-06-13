import { defineStore } from 'pinia'
import { ref } from 'vue'
import i18n from '@/i18n'

const localeStorageKey = 'pdf-flow-locale'
const themeStorageKey = 'pdf-flow-theme'

const getStoredLocale = () => {
  if (typeof window === 'undefined') {
    return 'zh'
  }

  const stored = window.localStorage.getItem(localeStorageKey)
  return stored === 'en' || stored === 'zh' || stored === 'es' ? stored : 'zh'
}

export const useSettingsStore = defineStore('settings', () => {
  const locale = ref<'en' | 'zh' | 'es'>(getStoredLocale())
  const theme = ref<'light' | 'dark'>('light')

  const setLocale = (newLocale: typeof locale.value) => {
    locale.value = newLocale
    if (i18n.global.locale.value !== newLocale) {
      i18n.global.locale.value = newLocale
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(localeStorageKey, newLocale)
    }
    document.documentElement.lang = newLocale
  }

  const setTheme = (newTheme: typeof theme.value) => {
    theme.value = newTheme
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(themeStorageKey, newTheme)
    }
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const initTheme = () => {
    setTheme('light')
  }

  const initLocale = () => {
    if (i18n.global.locale.value !== locale.value) {
      i18n.global.locale.value = locale.value
    }
    document.documentElement.lang = locale.value
  }

  return {
    locale,
    theme,
    setLocale,
    setTheme,
    initTheme,
    initLocale,
  }
})
