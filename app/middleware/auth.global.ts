/**
 * Auth Middleware - Simple, Deterministic, No Flutter/WebView Logic
 * 
 * Principles:
 * - Cookie-only auth (auth_token), no ?token= or ?t= query support
 * - No navigator.userAgent detection
 * - No isFlutterWebView / isPublicForWebView
 * - No native bridge (NitipLogout, triggerNativeLogout, postMessage)
 * - No throw, no createError(500), only navigateTo or return
 * - fetchProfile failures handled locally, never bubble to 500
 * 
 * Flow:
 * a. Read auth_token cookie
 * b. If no cookie -> redirect to login by area
 * c. If cookie exists but no user -> fetchProfile
 * d. If fetchProfile fails -> clear auth + clear cookie + redirect login
 * e. If user exists -> role authorization
 * f. Done
 */

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()
  const path = to.path

  // ===== Route Classification =====
  const publicRoutes = ['/', '/login', '/register', '/merchant/login']
  const isPublicExact = publicRoutes.includes(path) || publicRoutes.includes(path.replace(/\/$/, ''))
  const isMapRoute = path.startsWith('/map')
  const isPublic = isPublicExact || isMapRoute

  const isAdminRoute = path.startsWith('/admin')
  const isMerchantRoute = path.startsWith('/merchant')
  const isUserRoute = path.startsWith('/dashboard') || path.startsWith('/orders') || path.startsWith('/profile') || path.startsWith('/trips') || path.startsWith('/notifications') || path.startsWith('/wallet')

  // ===== Helper: Load token from cookie =====
  const loadToken = (): string | null => {
    if (authStore.token) return authStore.token
    try {
      const tokenCookie = useCookie('auth_token')
      if (tokenCookie.value) {
        authStore.token = tokenCookie.value
        return tokenCookie.value
      }
    } catch {}
    return null
  }

  // ===== Helper: Clear auth + cookie =====
  const clearAuth = () => {
    try {
      authStore.token = null
      authStore.setUser(null)
      const tokenCookie = useCookie('auth_token')
      tokenCookie.value = null
    } catch {}
  }

  // ===== Helper: Redirect to login by area =====
  const redirectToLogin = () => {
    if (isMerchantRoute) return navigateTo('/merchant/login')
    if (isAdminRoute) return navigateTo('/admin/login')
    return navigateTo('/login')
  }

  // ===== Helper: Redirect by role when accessing public pages =====
  const redirectByRole = (role: string) => {
    if (role === ROLE_ADMIN) return navigateTo('/admin')
    if (role === ROLE_MERCHANT) return navigateTo('/merchant/menu')
    if (role === ROLE_CS) return navigateTo('/admin/support')
    return navigateTo('/dashboard')
  }

  // ===== Helper: Ensure authenticated =====
  const ensureAuthenticated = (): boolean => {
    return authStore.isAuthenticated
  }

  // ===== Helper: Ensure profile loaded =====
  const ensureProfile = async (): Promise<boolean> => {
    if (authStore.user) return true
    if (!authStore.isAuthenticated) return false
    try {
      await authStore.fetchProfile()
      return !!authStore.user
    } catch {
      // fetchProfile failed - clear auth, will redirect to login
      clearAuth()
      return false
    }
  }

  // ===== Helper: Role authorization =====
  const ensureRole = (): ReturnType<typeof navigateTo> | null => {
    if (!authStore.user) return null
    const role = authStore.user.role

    // Block merchant login page for already authenticated merchant
    if (role === ROLE_MERCHANT && path === '/merchant/login') {
      return navigateTo('/merchant/menu')
    }

    // Runner not allowed on Web Platform (mobile only)
    if (role === ROLE_RUNNER) {
      const toastStore = useToastStore()
      try {
        toastStore.add('Akses Ditolak: Akun Runner hanya dapat diakses melalui Aplikasi Mobile.', 'error')
      } catch {}
      authStore.logout()
      return navigateTo('/login')
    }

    // Admin trying to access user/merchant routes -> redirect to admin
    if (role === ROLE_ADMIN && (isUserRoute || isMerchantRoute)) {
      return navigateTo('/admin')
    }

    // CS role
    const isSupportCSRoute = path.startsWith('/admin/support')
    if (role === ROLE_CS) {
      if (isSupportCSRoute) {
        return null // allow
      }
      if (isAdminRoute && !isSupportCSRoute) {
        return navigateTo('/admin/support')
      }
      if (isUserRoute) {
        const allowed = path.startsWith('/profile')
        if (!allowed) return navigateTo('/admin/support')
      }
      if (isMerchantRoute) {
        return navigateTo('/admin/support')
      }
    }

    // Requester trying to access admin or merchant routes
    if (role === ROLE_REQUESTER) {
      if (isAdminRoute) return navigateTo('/dashboard')
      if (isMerchantRoute) return navigateTo('/dashboard')
    }

    // Merchant trying to access admin or user routes -> redirect to merchant panel
    if (role === ROLE_MERCHANT) {
      if (isAdminRoute) return navigateTo('/merchant/menu')
      if (isUserRoute) {
        const isAllowedMerchantRoute = path.startsWith('/profile') || path.startsWith('/wallet')
        if (!isAllowedMerchantRoute) {
          return navigateTo('/merchant/menu')
        }
      }
    }

    return null
  }

  // ===== Main Flow =====

  // Step a: Load token from cookie
  const token = loadToken()
  const hasCookie = !!token

  // Step b: If no cookie and not public -> redirect to login
  if (!hasCookie && !isPublic) {
    return redirectToLogin()
  }

  // Step c: If has cookie but no user -> fetchProfile
  if (hasCookie && !authStore.user) {
    const profileOk = await ensureProfile()
    // Step d: If fetchProfile failed -> clear and redirect
    if (!profileOk && !isPublic) {
      return redirectToLogin()
    }
  }

  // If still not authenticated and not public -> redirect
  if (!ensureAuthenticated() && !isPublic) {
    return redirectToLogin()
  }

  // Step e: Role authorization
  if (authStore.isAuthenticated && authStore.user) {
    // If authenticated user visits public pages (except / and map) -> redirect by role
    if (isPublic && !isMapRoute && path !== '/') {
      const roleRedirect = redirectByRole(authStore.user.role)
      if (roleRedirect) return roleRedirect
    }

    // Check role access for protected routes
    const roleRedirect = ensureRole()
    if (roleRedirect) return roleRedirect
  }

  // f. Done - allow navigation
  return
})
