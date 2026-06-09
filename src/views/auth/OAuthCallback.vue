<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
    <div class="text-center">
      <Loader2 class="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" />
      <h2 class="text-xl font-semibold text-gray-900">{{ $t('auth.processingLogin') }}</h2>
      <p class="mt-2 text-sm text-gray-600">{{ $t('auth.pleaseWait') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { t } = useI18n()

onMounted(async () => {
  try {
    // Extract tokens from URL query params
    const accessToken = route.query.access_token as string
    const refreshToken = route.query.refresh_token as string
    const tokenType = route.query.token_type as string

    if (!accessToken || !refreshToken) {
      throw new Error('Missing tokens in callback')
    }

    // Store tokens
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)

    // Fetch user info
    await userStore.checkAuth()

    // Redirect to home or saved redirect URL
    const redirect = sessionStorage.getItem('oauth_redirect') || '/'
    sessionStorage.removeItem('oauth_redirect')

    router.push(redirect)
  } catch (error) {
    console.error('OAuth callback error:', error)
    // Redirect to login with error
    router.push('/auth/login?error=oauth_callback_failed')
  }
})
</script>
