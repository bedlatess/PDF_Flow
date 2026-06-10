import { createRouter, createWebHistory } from 'vue-router'
import { guestGuard, authGuard, enterpriseGuard } from './guards'

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue'),
    },
    {
      path: '/features',
      name: 'features',
      component: () => import('@/views/Features.vue'),
      meta: { title: '功能特性' }
    },
    {
      path: '/pricing',
      name: 'pricing',
      component: () => import('@/views/Pricing.vue'),
      meta: { title: '定价方案' }
    },
    {
      path: '/auth',
      children: [
        {
          path: 'login',
          name: 'login',
          component: () => import('@/views/auth/Login.vue'),
          beforeEnter: guestGuard,
          meta: { title: '登录' }
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/views/auth/Register.vue'),
          beforeEnter: guestGuard,
          meta: { title: '注册' }
        },
        {
          path: 'oauth-callback',
          name: 'oauth-callback',
          component: () => import('@/views/auth/OAuthCallback.vue'),
          meta: { title: '正在登录' }
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/auth/Profile.vue'),
          beforeEnter: authGuard,
          meta: { title: '我的账号' }
        }
      ]
    },
    {
      path: '/payment',
      children: [
        {
          path: 'success',
          name: 'payment-success',
          component: () => import('@/views/payment/PaymentSuccess.vue'),
          meta: { title: '支付成功' }
        },
        {
          path: 'cancel',
          name: 'payment-cancel',
          component: () => import('@/views/payment/PaymentCancel.vue'),
          meta: { title: '支付已取消' }
        }
      ]
    },
    {
      path: '/enterprise',
      children: [
        {
          path: 'dashboard',
          name: 'enterprise-dashboard',
          component: () => import('@/views/enterprise/Dashboard.vue'),
          beforeEnter: enterpriseGuard,
          meta: { title: '企业控制台' }
        }
      ]
    },
    {
      path: '/tools',
      children: [
        {
          path: 'merge',
          name: 'merge-pdf',
          component: () => import('@/views/tools/MergePDF.vue'),
        },
        {
          path: 'split',
          name: 'split-pdf',
          component: () => import('@/views/tools/SplitPDF.vue'),
        },
        {
          path: 'rotate',
          name: 'rotate-pdf',
          component: () => import('@/views/tools/RotatePDF.vue'),
        },
        {
          path: 'compress',
          name: 'compress-pdf',
          component: () => import('@/views/tools/CompressPDF.vue'),
        },
        {
          path: 'image-to-pdf',
          name: 'image-to-pdf',
          component: () => import('@/views/tools/ImageToPDF.vue'),
        },
        {
          path: 'pdf-to-image',
          name: 'pdf-to-image',
          component: () => import('@/views/tools/PDFToImage.vue'),
        },
        {
          path: 'ocr',
          name: 'ocr-pdf',
          component: () => import('@/views/tools/OCRPDF.vue'),
          meta: { title: 'OCR 文字识别' }
        },
        {
          path: 'office-to-pdf',
          name: 'office-to-pdf',
          component: () => import('@/views/tools/OfficeToPDF.vue'),
          meta: { title: 'Office 转 PDF' }
        },
        {
          path: 'ai-analyzer',
          name: 'ai-analyzer',
          component: () => import('@/views/tools/AIPDFAnalyzer.vue'),
          meta: { title: 'AI PDF 分析器' }
        },
        {
          path: 'watermark',
          name: 'watermark-pdf',
          component: () => import('@/views/tools/WatermarkPDF.vue'),
          meta: { title: '添加水印' }
        },
        {
          path: 'fill-form',
          name: 'fill-form-pdf',
          component: () => import('@/views/tools/FillFormPDF.vue'),
          meta: { title: '填写 PDF 表单', requiresPro: true }
        },
        {
          path: 'annotate',
          name: 'annotate-pdf',
          component: () => import('@/views/tools/AnnotatePDF.vue'),
          meta: { title: 'PDF 标注', requiresPro: true }
        },
      ],
    },
  ],
})

const dynamicImportErrorPattern = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\d\w-]+ failed/i

router.onError((error, to) => {
  if (typeof window === 'undefined') {
    return
  }

  const message = error instanceof Error ? error.message : String(error)
  if (!dynamicImportErrorPattern.test(message)) {
    return
  }

  const reloadKey = `pdf-flow:reload:${to.fullPath}`
  if (sessionStorage.getItem(reloadKey) === '1') {
    sessionStorage.removeItem(reloadKey)
    return
  }

  sessionStorage.setItem(reloadKey, '1')
  window.location.assign(to.fullPath)
})

// 全局前置守卫 - 设置页面标题
router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - PDF-Flow`
  } else {
    document.title = 'PDF-Flow - 隐私优先的 PDF 工具'
  }
  next()
})

router.afterEach((to) => {
  if (typeof window === 'undefined') {
    return
  }

  sessionStorage.removeItem(`pdf-flow:reload:${to.fullPath}`)
})

export default router
