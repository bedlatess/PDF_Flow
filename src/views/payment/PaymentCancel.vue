<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 px-4 py-12">
    <div class="max-w-2xl w-full">
      <!-- Cancel Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
        <!-- Cancel Icon -->
        <div class="inline-block p-4 bg-orange-100 rounded-full mb-6">
          <XCircle class="h-16 w-16 text-orange-600" />
        </div>

        <!-- Title -->
        <h1 class="text-3xl font-bold text-gray-900 mb-4">
          {{ $t('payment.cancel.title') }}
        </h1>

        <p class="text-lg text-gray-600 mb-8">
          {{ $t('payment.cancel.message') }}
        </p>

        <!-- Why Pro -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 text-left">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            💎 {{ $t('payment.cancel.whyPro') }}
          </h3>
          <ul class="space-y-2">
            <li class="flex items-start">
              <span class="text-indigo-600 mr-2">✓</span>
              <span class="text-gray-700">{{ $t('payment.cancel.benefit1') }}</span>
            </li>
            <li class="flex items-start">
              <span class="text-indigo-600 mr-2">✓</span>
              <span class="text-gray-700">{{ $t('payment.cancel.benefit2') }}</span>
            </li>
            <li class="flex items-start">
              <span class="text-indigo-600 mr-2">✓</span>
              <span class="text-gray-700">{{ $t('payment.cancel.benefit3') }}</span>
            </li>
            <li class="flex items-start">
              <span class="text-indigo-600 mr-2">✓</span>
              <span class="text-gray-700">{{ $t('payment.cancel.benefit4') }}</span>
            </li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="flex gap-4 mb-6">
          <button
            @click="tryAgain"
            class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
          >
            {{ $t('payment.cancel.tryAgain') }}
          </button>
          <button
            @click="goBack"
            class="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
          >
            {{ $t('payment.cancel.goBack') }}
          </button>
        </div>

        <!-- Continue Free -->
        <button
          @click="continueFree"
          class="text-gray-600 hover:text-gray-800 text-sm font-medium"
        >
          {{ $t('payment.cancel.continueFree') }} →
        </button>
      </div>

      <!-- FAQ -->
      <div class="mt-8 bg-white rounded-xl p-6 shadow-lg">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          ❓ {{ $t('payment.cancel.faqTitle') }}
        </h3>
        <div class="space-y-4">
          <div>
            <h4 class="font-medium text-gray-900 mb-1">{{ $t('payment.cancel.faq1Q') }}</h4>
            <p class="text-gray-600 text-sm">{{ $t('payment.cancel.faq1A') }}</p>
          </div>
          <div>
            <h4 class="font-medium text-gray-900 mb-1">{{ $t('payment.cancel.faq2Q') }}</h4>
            <p class="text-gray-600 text-sm">{{ $t('payment.cancel.faq2A') }}</p>
          </div>
          <div>
            <h4 class="font-medium text-gray-900 mb-1">{{ $t('payment.cancel.faq3Q') }}</h4>
            <p class="text-gray-600 text-sm">{{ $t('payment.cancel.faq3A') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { XCircle } from 'lucide-vue-next'

const router = useRouter()

const tryAgain = () => {
  router.push('/pricing')
}

const goBack = () => {
  router.push('/pricing')
}

const continueFree = () => {
  router.push('/')
}
</script>
