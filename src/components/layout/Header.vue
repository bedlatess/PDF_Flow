<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ChevronRight,
  Crown,
  LayoutPanelTop,
  Menu,
  Moon,
  Sparkles,
  SunMedium,
  X,
} from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import Button from '@/components/common/Button.vue'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()
const settingsStore = useSettingsStore()
const userStore = useUserStore()

const mobileMenuOpen = ref(false)
const userMenuOpen = ref(false)

const localeOptions = [
  { value: 'zh', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
] as const

const publicLinks = computed(() => [
  {
    key: 'features',
    label: t('nav.features'),
    route: '/features',
    icon: LayoutPanelTop,
    accent: 'from-sky-500/15 to-cyan-500/15 text-sky-700 ring-sky-200/80 dark:text-sky-200 dark:ring-sky-500/20',
    activeAccent: 'from-sky-500 to-cyan-500 text-white ring-sky-400/60 shadow-lg shadow-sky-500/20',
  },
  {
    key: 'pricing',
    label: t('nav.pricing'),
    route: '/pricing',
    icon: Crown,
    accent: 'from-emerald-500/15 to-teal-500/15 text-emerald-700 ring-emerald-200/80 dark:text-emerald-200 dark:ring-emerald-500/20',
    activeAccent: 'from-emerald-500 to-teal-500 text-white ring-emerald-400/60 shadow-lg shadow-emerald-500/20',
  },
])

const userInitial = computed(() => {
  const name = userStore.user?.full_name || userStore.user?.email || '?'
  return name.charAt(0).toUpperCase()
})

const isRouteActive = (target: string) => route.path === target

const navigateHome = () => {
  router.push('/')
  mobileMenuOpen.value = false
}

const navigateTo = (target: string) => {
  router.push(target)
  mobileMenuOpen.value = false
}

const goToLogin = () => {
  router.push('/auth/login')
  mobileMenuOpen.value = false
}

const goToProfile = () => {
  router.push('/auth/profile')
  userMenuOpen.value = false
  mobileMenuOpen.value = false
}

const handleLogout = async () => {
  await userStore.logout()
  userMenuOpen.value = false
  mobileMenuOpen.value = false
  router.push('/')
}

const toggleTheme = () => {
  const newTheme = settingsStore.theme === 'light' ? 'dark' : 'light'
  settingsStore.setTheme(newTheme)
}

const changeLocale = (newLocale: 'en' | 'zh' | 'es') => {
  settingsStore.setLocale(newLocale)
}

const closeMenus = () => {
  mobileMenuOpen.value = false
  userMenuOpen.value = false
}

onMounted(() => {
  userStore.checkAuth()
})
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-white/60 bg-white/78 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/72">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-20 items-center justify-between gap-4">
        <button
          class="group flex items-center gap-3 rounded-full border border-slate-200/70 bg-white/80 px-3 py-2 shadow-sm transition hover:border-sky-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/75 dark:hover:border-sky-500/30"
          @click="navigateHome"
        >
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#0ea5e9_55%,#22c55e_100%)] text-white shadow-lg shadow-sky-500/20">
            <svg
              class="h-6 w-6"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="hidden text-left sm:block">
            <p class="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">
              PDF Workspace
            </p>
            <p class="text-base font-semibold text-slate-950 dark:text-white">
              {{ t('app.title') }}
            </p>
          </div>
        </button>

        <div class="hidden items-center gap-3 md:flex">
          <button
            class="group inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900/75 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white"
            @click="navigateHome"
          >
            <Sparkles class="h-4 w-4 text-sky-500 transition group-hover:rotate-6" />
            {{ t('nav.home') }}
          </button>

          <button
            v-for="link in publicLinks"
            :key="link.key"
            :class="[
              'group inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ring-1 transition-all',
              isRouteActive(link.route)
                ? ['bg-gradient-to-r', link.activeAccent]
                : ['bg-gradient-to-r shadow-sm hover:-translate-y-0.5 hover:shadow-md', link.accent],
            ]"
            @click="navigateTo(link.route)"
          >
            <component :is="link.icon" class="h-4 w-4" />
            <span>{{ link.label }}</span>
            <ChevronRight class="h-4 w-4 opacity-70 transition group-hover:translate-x-0.5" />
          </button>
        </div>

        <div class="hidden items-center gap-3 md:flex">
          <select
            :value="locale"
            class="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-400 dark:border-slate-800 dark:bg-slate-900/75 dark:text-slate-100 dark:hover:border-slate-700"
            @change="changeLocale(($event.target as HTMLSelectElement).value as 'en' | 'zh' | 'es')"
          >
            <option
              v-for="option in localeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <button
            class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900/75 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
            @click="toggleTheme"
          >
            <Moon
              v-if="settingsStore.theme === 'light'"
              class="h-5 w-5"
            />
            <SunMedium
              v-else
              class="h-5 w-5"
            />
          </button>

          <div
            v-if="userStore.isAuthenticated"
            class="relative"
          >
            <button
              class="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#0ea5e9_70%,#14b8a6_100%)] text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5"
              @click="userMenuOpen = !userMenuOpen"
            >
              {{ userInitial }}
            </button>
            <div
              v-if="userMenuOpen"
              class="absolute right-0 mt-3 w-60 rounded-[24px] border border-slate-200/80 bg-white/92 p-2 shadow-2xl shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/92 dark:shadow-none"
            >
              <div class="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/60">
                <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {{ userStore.user?.full_name || userStore.user?.email }}
                </p>
              </div>
              <button
                class="mt-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80"
                @click="goToProfile"
              >
                <span>{{ t('account.myAccount') }}</span>
                <ChevronRight class="h-4 w-4" />
              </button>
              <button
                class="mt-1 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                @click="handleLogout"
              >
                <span>{{ t('auth.logout') }}</span>
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>
          </div>

          <Button
            v-else
            variant="primary"
            size="sm"
            class="rounded-full px-5 py-2.5"
            @click="goToLogin"
          >
            {{ t('auth.login') }}
          </Button>
        </div>

        <button
          class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900/75 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white md:hidden"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <Menu
            v-if="!mobileMenuOpen"
            class="h-5 w-5"
          />
          <X
            v-else
            class="h-5 w-5"
          />
        </button>
      </div>

      <div
        v-if="mobileMenuOpen"
        class="border-t border-slate-200/80 py-4 dark:border-slate-800 md:hidden"
      >
        <div class="space-y-3">
          <div class="grid gap-3">
            <button
              class="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white/85 px-4 py-3 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900/75"
              @click="navigateHome"
            >
              <span class="flex items-center gap-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <Sparkles class="h-4 w-4 text-sky-500" />
                {{ t('nav.home') }}
              </span>
              <ChevronRight class="h-4 w-4 text-slate-400" />
            </button>

            <button
              v-for="link in publicLinks"
              :key="`${link.key}-mobile`"
              :class="[
                'flex items-center justify-between rounded-[24px] px-4 py-3 text-left shadow-sm ring-1 transition',
                isRouteActive(link.route)
                  ? ['bg-gradient-to-r', link.activeAccent]
                  : ['bg-white/85 dark:bg-slate-900/75', link.accent],
              ]"
              @click="navigateTo(link.route)"
            >
              <span class="flex items-center gap-3 text-sm font-semibold">
                <component :is="link.icon" class="h-4 w-4" />
                {{ link.label }}
              </span>
              <ChevronRight class="h-4 w-4 opacity-70" />
            </button>
          </div>

          <div class="grid gap-3 rounded-[28px] border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/72">
            <select
              :value="locale"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
              @change="changeLocale(($event.target as HTMLSelectElement).value as 'en' | 'zh' | 'es')"
            >
              <option
                v-for="option in localeOptions"
                :key="`mobile-${option.value}`"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>

            <button
              class="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700"
              @click="toggleTheme"
            >
              <span>{{ settingsStore.theme === 'light' ? t('nav.themeToDark') : t('nav.themeToLight') }}</span>
              <Moon
                v-if="settingsStore.theme === 'light'"
                class="h-4 w-4"
              />
              <SunMedium
                v-else
                class="h-4 w-4"
              />
            </button>

            <template v-if="userStore.isAuthenticated">
              <button
                class="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700"
                @click="goToProfile"
              >
                <span>{{ t('account.myAccount') }}</span>
                <ChevronRight class="h-4 w-4" />
              </button>
              <button
                class="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm font-medium text-rose-600 transition hover:border-rose-300 dark:border-rose-500/20 dark:bg-rose-500/10"
                @click="handleLogout"
              >
                <span>{{ t('auth.logout') }}</span>
                <ChevronRight class="h-4 w-4" />
              </button>
            </template>
            <Button
              v-else
              variant="primary"
              size="sm"
              full-width
              class="rounded-2xl py-3"
              @click="goToLogin"
            >
              {{ t('auth.login') }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
