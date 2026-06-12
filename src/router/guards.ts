/**
 * Router Guards - 路由守卫
 * 处理路由权限验证和重定向
 */
import { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useSiteConfigStore } from '@/stores/siteConfig'

/**
 * 认证守卫 - 保护需要登录的路由
 */
export async function authGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const userStore = useUserStore()

  // 如果用户已经认证，直接通过
  if (userStore.isAuthenticated) {
    next()
    return
  }

  // 尝试从 localStorage 恢复登录状态
  const isLoggedIn = await userStore.checkAuth()

  if (isLoggedIn) {
    next()
  } else {
    // 未登录，重定向到登录页，并记录目标页面
    next({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
  }
}

/**
 * 游客守卫 - 已登录用户不能访问的路由（如登录、注册页面）
 */
export function guestGuard(
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const userStore = useUserStore()

  if (userStore.isAuthenticated) {
    // 已登录用户访问登录页，重定向到首页
    next('/')
  } else {
    next()
  }
}

/**
 * Pro 功能守卫 - 只允许 Pro 和 Enterprise 用户访问
 */
export async function proGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const userStore = useUserStore()

  // 确保用户已认证
  if (!userStore.isAuthenticated) {
    await userStore.checkAuth()
  }

  if (userStore.canUseCloudFeatures) {
    next()
  } else {
    // 非 Pro 用户，重定向到升级页面
    next({
      path: '/pricing',
      query: { feature: to.meta.featureName as string || 'pro' }
    })
  }
}

/**
 * 企业功能守卫 - 只允许 Enterprise 用户访问
 */
export async function enterpriseGuard(
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const userStore = useUserStore()

  // 确保用户已认证
  if (!userStore.isAuthenticated) {
    await userStore.checkAuth()
  }

  if (userStore.isEnterpriseTier) {
    next()
  } else {
    // 非企业用户，重定向到联系页面
    next({
      path: '/contact',
      query: { plan: 'enterprise' }
    })
  }
}

export async function adminGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const userStore = useUserStore()

  if (!userStore.isAuthenticated) {
    const isLoggedIn = await userStore.checkAuth()
    if (!isLoggedIn) {
      next({
        path: '/auth/login',
        query: { redirect: to.fullPath }
      })
      return
    }
  }

  if (userStore.isAdmin) {
    next()
    return
  }

  next('/')
}

export async function featureFlagGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const featureKey = to.meta.featureKey as string | undefined
  if (!featureKey) {
    next()
    return
  }

  const siteConfigStore = useSiteConfigStore()
  const userStore = useUserStore()
  await siteConfigStore.fetchPublicConfig(true)

  const flag = siteConfigStore.getFeatureFlag(featureKey, String(to.meta.titleKey || featureKey))
  if (!flag.enabled) {
    next({
      path: '/availability/feature-disabled',
      query: {
        state: 'feature-disabled',
        feature: featureKey,
        message: flag.maintenance_message || 'feature_unavailable',
        returnTo: to.fullPath,
      },
    })
    return
  }

  if (flag.requires_login && !userStore.isAuthenticated) {
    const isLoggedIn = await userStore.checkAuth()
    if (!isLoggedIn) {
      next({
        path: '/auth/login',
        query: { redirect: to.fullPath },
      })
      return
    }
  }

  if (flag.requires_pro && !userStore.canUseCloudFeatures) {
    next({
      path: '/pricing',
      query: { feature: featureKey },
    })
    return
  }

  next()
}
