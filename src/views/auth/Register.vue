<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50 px-4 py-12">
    <div class="max-w-md w-full space-y-8">
      <!-- Logo and Header -->
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">{{ $t('auth.createAccount') }}</h2>
        <p class="mt-2 text-sm text-gray-600">
          {{ $t('auth.registerSubtitle') }}
        </p>
      </div>

      <!-- Register Form Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <form @submit.prevent="handleRegister" class="space-y-6">
          <!-- Full Name Input -->
          <div>
            <label for="fullName" class="block text-sm font-medium text-gray-700 mb-2">
              {{ $t('auth.fullName') }}
            </label>
            <input
              id="fullName"
              v-model="form.fullName"
              type="text"
              required
              autocomplete="name"
              class="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              :placeholder="$t('auth.fullNamePlaceholder')"
              :disabled="loading"
            />
            <p v-if="errors.fullName" class="mt-1 text-sm text-red-600">{{ errors.fullName }}</p>
          </div>

          <!-- Email Input -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              {{ $t('auth.email') }}
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              autocomplete="email"
              class="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              :placeholder="$t('auth.emailPlaceholder')"
              :disabled="loading"
            />
            <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
          </div>

          <!-- Password Input -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              {{ $t('auth.password') }}
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                class="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-10"
                :placeholder="$t('auth.passwordPlaceholder')"
                :disabled="loading"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                :disabled="loading"
              >
                <component :is="showPassword ? EyeOff : Eye" class="h-5 w-5" />
              </button>
            </div>
            <!-- Password Strength Indicator -->
            <div class="mt-2">
              <div class="flex gap-1">
                <div
                  v-for="i in 4"
                  :key="i"
                  class="h-1 flex-1 rounded-full transition-all"
                  :class="i <= passwordStrength ? strengthColors[passwordStrength] : 'bg-gray-200'"
                ></div>
              </div>
              <p class="mt-1 text-xs" :class="strengthTextColors[passwordStrength]">
                {{ strengthLabels[passwordStrength] }}
              </p>
            </div>
            <p v-if="errors.password" class="mt-1 text-sm text-red-600">{{ errors.password }}</p>
          </div>

          <!-- Confirm Password Input -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
              {{ $t('auth.confirmPassword') }}
            </label>
            <div class="relative">
              <input
                id="confirmPassword"
                v-model="form.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                class="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-10"
                :placeholder="$t('auth.confirmPasswordPlaceholder')"
                :disabled="loading"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                :disabled="loading"
              >
                <component :is="showConfirmPassword ? EyeOff : Eye" class="h-5 w-5" />
              </button>
            </div>
            <p v-if="errors.confirmPassword" class="mt-1 text-sm text-red-600">{{ errors.confirmPassword }}</p>
          </div>

          <!-- Terms and Conditions -->
          <div class="flex items-start">
            <div class="flex items-center h-5">
              <input
                id="terms"
                v-model="form.acceptTerms"
                type="checkbox"
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                :disabled="loading"
              />
            </div>
            <div class="ml-3 text-sm">
              <label for="terms" class="text-gray-700">
                {{ $t('auth.iAgree') }}
                <a href="/terms" target="_blank" class="font-medium text-indigo-600 hover:text-indigo-500">
                  {{ $t('auth.terms') }}
                </a>
                {{ $t('auth.and') }}
                <a href="/privacy" target="_blank" class="font-medium text-indigo-600 hover:text-indigo-500">
                  {{ $t('auth.privacy') }}
                </a>
              </label>
            </div>
          </div>
          <p v-if="errors.acceptTerms" class="text-sm text-red-600">{{ errors.acceptTerms }}</p>

          <!-- Error Message -->
          <div v-if="errorMessage" class="rounded-lg bg-red-50 p-4">
            <div class="flex">
              <AlertCircle class="h-5 w-5 text-red-400" />
              <div class="ml-3">
                <p class="text-sm text-red-800">{{ errorMessage }}</p>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading || !form.acceptTerms"
            class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="loading" class="animate-spin -ml-1 mr-2 h-5 w-5" />
            {{ loading ? $t('auth.creatingAccount') : $t('auth.signUp') }}
          </button>
        </form>

        <!-- Sign In Link -->
        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            {{ $t('auth.alreadyHaveAccount') }}
            <router-link
              to="/auth/login"
              class="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {{ $t('auth.login') }}
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const form = reactive({
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
})

const errors = reactive({
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: ''
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const passwordStrength = computed(() => {
  const password = form.password
  if (!password) return 0

  let strength = 0
  if (password.length >= 8) strength++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
  if (/\d/.test(password)) strength++
  if (/[^a-zA-Z\d]/.test(password)) strength++

  return strength
})

const strengthColors = ['bg-gray-200', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']
const strengthTextColors = ['text-gray-500', 'text-red-600', 'text-yellow-600', 'text-blue-600', 'text-green-600']
const strengthLabels = computed(() => [
  '',
  t('auth.passwordWeak'),
  t('auth.passwordFair'),
  t('auth.passwordGood'),
  t('auth.passwordStrong')
])

const validateForm = (): boolean => {
  errors.fullName = ''
  errors.email = ''
  errors.password = ''
  errors.confirmPassword = ''
  errors.acceptTerms = ''
  errorMessage.value = ''

  if (!form.fullName.trim()) {
    errors.fullName = t('auth.fullNameRequired')
    return false
  }

  if (!form.email) {
    errors.email = t('auth.emailRequired')
    return false
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = t('auth.emailInvalid')
    return false
  }

  if (!form.password) {
    errors.password = t('auth.passwordRequired')
    return false
  }

  if (form.password.length < 8) {
    errors.password = t('auth.passwordTooShort8')
    return false
  }

  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = t('auth.passwordsNotMatch')
    return false
  }

  if (!form.acceptTerms) {
    errors.acceptTerms = t('auth.mustAcceptTerms')
    return false
  }

  return true
}

const handleRegister = async () => {
  if (!validateForm()) return

  loading.value = true
  errorMessage.value = ''

  try {
    await userStore.register({
      email: form.email,
      password: form.password,
      full_name: form.fullName
    })

    // 注册成功，跳转到登录或首页
    router.push('/auth/login?registered=true')
  } catch (error: any) {
    console.error('Register error:', error)
    errorMessage.value = error.response?.data?.detail || t('auth.registerFailed')
  } finally {
    loading.value = false
  }
}
</script>
