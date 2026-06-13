<template>
  <AuthWorkspaceShell :copy="marketingCopy" accent="teal">
    <div>
      <h2 class="text-3xl font-semibold text-slate-950 dark:text-white">
        {{ $t('auth.passwordRecoveryTitle') }}
      </h2>
      <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {{ $t('auth.passwordRecoverySubtitle') }}
      </p>
    </div>

    <DiagnosticAlert
      v-if="notice"
      class="mt-6"
      :title="notice.title"
      :message="notice.message"
      :diagnostic-code="notice.diagnosticCode"
      :support-hint="notice.supportHint"
      :tone="notice.tone"
    />

    <form class="mt-6 space-y-5" @submit.prevent="submit">
      <div>
        <label for="email" class="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
          {{ $t('auth.email') }}
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          :disabled="loading || sent"
          class="w-full rounded-md border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white dark:focus:border-teal-400 dark:focus:ring-teal-500/20"
        >
        <p v-if="emailError" class="mt-2 text-sm text-rose-600 dark:text-rose-300">
          {{ emailError }}
        </p>
      </div>

      <button
        type="submit"
        :disabled="loading || sent"
        class="inline-flex w-full items-center justify-center rounded-md bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-400"
      >
        <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
        {{ loading ? $t('auth.passwordRecoverySending') : $t('auth.passwordRecoverySubmit') }}
      </button>
    </form>

    <div class="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
      <router-link to="/auth/login" class="font-semibold text-teal-600 transition hover:text-teal-500 dark:text-teal-300">
        {{ $t('auth.backToLogin') }}
      </router-link>
      <router-link to="/auth/register" class="text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
        {{ $t('auth.signUp') }}
      </router-link>
    </div>
  </AuthWorkspaceShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2 } from 'lucide-vue-next'
import AuthWorkspaceShell from '@/components/auth/AuthWorkspaceShell.vue'
import DiagnosticAlert from '@/components/common/DiagnosticAlert.vue'
import { authAPI } from '@/services/api'
import { formatUserFacingError, type FormattedUserError } from '@/utils/error-messages'

type RecoveryNotice = FormattedUserError & { tone?: 'danger' | 'warning' | 'info' }

interface AuthMarketingHighlight {
  title: string
  description: string
}

interface AuthMarketingCopy {
  heroTitle: string
  heroDescription: string
  panelTitle: string
  panelDescription: string
  highlights: AuthMarketingHighlight[]
}

const { t, tm } = useI18n()

const email = ref('')
const emailError = ref('')
const loading = ref(false)
const sent = ref(false)
const notice = ref<RecoveryNotice | null>(null)

const marketingCopy = computed(() => tm('auth.recoveryMarketing') as AuthMarketingCopy)

const validate = () => {
  emailError.value = ''
  if (!email.value) {
    emailError.value = t('auth.emailRequired')
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailError.value = t('auth.emailInvalid')
    return false
  }
  return true
}

const submit = async () => {
  if (!validate()) {
    return
  }

  loading.value = true
  notice.value = null

  try {
    await authAPI.forgotPassword({ email: email.value })
    sent.value = true
    notice.value = {
      title: t('auth.passwordRecoverySentTitle'),
      message: t('auth.passwordRecoverySentMessage'),
      diagnosticCode: '',
      supportHint: t('auth.passwordRecoverySentHint'),
      tone: 'info',
    }
  } catch (error) {
    notice.value = formatUserFacingError(error, {
      area: 'AUTH',
      fallbackTitle: t('auth.passwordRecoveryFailedTitle'),
      fallbackMessage: t('auth.passwordRecoveryFailedMessage'),
    })
  } finally {
    loading.value = false
  }
}
</script>
