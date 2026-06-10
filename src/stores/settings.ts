import { defineStore } from 'pinia'
import { ref } from 'vue'

const localeStorageKey = 'pdf-flow-locale'
const themeStorageKey = 'pdf-flow-theme'

const getStoredLocale = () => {
  if (typeof window === 'undefined') {
    return 'zh'
  }

  const stored = window.localStorage.getItem(localeStorageKey)
  return stored === 'en' || stored === 'zh' || stored === 'es' ? stored : 'zh'
}

const getStoredTheme = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = window.localStorage.getItem(themeStorageKey)
  return stored === 'light' || stored === 'dark' ? stored : null
}

export const useSettingsStore = defineStore('settings', () => {
  const locale = ref<'en' | 'zh' | 'es'>(getStoredLocale())
  const theme = ref<'light' | 'dark'>('light')

  const setLocale = (newLocale: typeof locale.value) => {
    locale.value = newLocale
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
    const storedTheme = getStoredTheme()
    if (storedTheme) {
      setTheme(storedTheme)
      return
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(prefersDark ? 'dark' : 'light')
  }

  const initLocale = () => {
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
