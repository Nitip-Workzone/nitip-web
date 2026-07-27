export default defineNuxtRouteMiddleware(async (to) => {
    const authStore = useAuthStore()

    // === CRITICAL: Baca cookie langsung di middleware untuk mengatasi SSR hydration gap ===
    const tokenQuery = to.query.token as string
    if (tokenQuery) {
        console.log('[Auth Middleware] Found token query parameter, setting cookie & state')
        const tokenCookie = useCookie('auth_token', {
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            sameSite: 'lax',
        })
        tokenCookie.value = tokenQuery
        authStore.setToken(tokenQuery)
        
        try {
            await authStore.fetchProfile(true)
            console.log('[Auth Middleware] Auto-login profile loaded:', authStore.user?.email)
            // Remove token from query parameters for clean URL and route to merchant menu directly
            const cleanQuery = { ...to.query }
            delete cleanQuery.token
            return navigateTo({ path: '/merchant/menu', query: cleanQuery })
        } catch (e) {
            console.error('[Auth Middleware] Auto-login profile fetch failed:', e)
            authStore.token = null
            tokenCookie.value = null
            return navigateTo('/')
        }
    }

    if (!authStore.token) {
        const tokenCookie = useCookie('auth_token')
        console.log('[Auth Middleware] Reading auth_token cookie:', tokenCookie.value ? 'EXISTS' : 'EMPTY')
        if (tokenCookie.value) {
            authStore.token = tokenCookie.value
        }
    } else {
        console.log('[Auth Middleware] authStore.token already exists.')
    }

    // Mobile WebView bridge helper: trigger native logout when session expired inside WebView
    const triggerNativeLogoutIfInWebView = (reason: string) => {
        if (typeof window !== 'undefined') {
            try {
                const win = window as unknown as { NitipLogout?: { postMessage: (r: string) => void }, triggerNativeLogout?: (r: string) => void }
                // WebView mobile injects NitipLogout channel + window.triggerNativeLogout
                if (win.NitipLogout && typeof win.NitipLogout.postMessage === 'function') {
                    win.NitipLogout.postMessage(reason)
                } else if (typeof win.triggerNativeLogout === 'function') {
                    win.triggerNativeLogout(reason)
                }
            } catch {
                // ignore bridge errors
            }
        }
    }

    // Define public routes (including map pages used by Flutter WebView — client-only, no user auth needed)
    const publicRoutes = ['/', '/login', '/register', '/merchant/login']
    const isMapRoute = to.path.startsWith('/map')
    const isPublic = publicRoutes.some(path => to.path === path) || isMapRoute

    // Route categories
    const isAdminRoute = to.path.startsWith('/admin')
    const isMerchantRoute = to.path.startsWith('/merchant')
    const isUserRoute = to.path.startsWith('/dashboard') || to.path.startsWith('/orders') || to.path.startsWith('/profile') || to.path.startsWith('/trips') || to.path.startsWith('/notifications')

    // Redirect unauthenticated users trying to access protected routes
    if (!authStore.isAuthenticated && !isPublic) {
        // If we are inside Flutter WebView, trigger native logout instead of showing web login form
        // This prevents merchant portal showing web login page inside WebView
        if (isMerchantRoute) {
            triggerNativeLogoutIfInWebView('middleware_merchant_401')
            return navigateTo('/merchant/login')
        }
        triggerNativeLogoutIfInWebView('middleware_401')
        return navigateTo('/login')
    }

    // Fetch profile if authenticated but user data not loaded
    if (authStore.isAuthenticated && !authStore.user) {
        try {
            console.log('[Auth Middleware] Fetching profile...')
            await authStore.fetchProfile()
            console.log('[Auth Middleware] Profile fetched successfully:', (authStore.user as unknown as { email?: string })?.email)
        } catch (err) {
            console.error('[Auth Middleware] fetchProfile failed:', err)
            authStore.token = null
            const tokenCookie = useCookie('auth_token')
            tokenCookie.value = null
            // Trigger native logout if inside WebView (merchant portal)
            if (!isPublic && isMerchantRoute) {
                triggerNativeLogoutIfInWebView('fetchProfile_failed_merchant')
            }
            if (!isPublic) {
                console.log('[Auth Middleware] Redirecting to login due to fetchProfile failure.')
                return navigateTo('/')
            }
        }
    }

    // Support / CS routes — only cs & admin can access /admin/support, cs redirects to support
    const isSupportCSRoute = to.path.startsWith('/admin/support')

    // Role-based access control
    if (authStore.isAuthenticated && authStore.user) {
        const role = authStore.user.role

        // Block direct access to merchant login for authenticated merchants
        if (role === ROLE_MERCHANT && to.path === '/merchant/login') {
            return navigateTo('/merchant/menu')
        }

        // Runner is not allowed on Web Platform (exclusively mobile)
        if (role === ROLE_RUNNER) {
            const toastStore = useToastStore()
            if (toastStore) {
                toastStore.add('Akses Ditolak: Akun Runner hanya dapat diakses melalui Aplikasi Mobile.', 'error')
            }
            authStore.logout()
            return navigateTo('/login')
        }

        // Admin trying to access user/merchant routes → redirect to admin
        if (role === ROLE_ADMIN && (isUserRoute || isMerchantRoute)) {
            return navigateTo('/admin')
        }

        // CS role: allow /admin/support, block all other admin/user/merchant routes except profile
        if (role === ROLE_CS) {
            if (isSupportCSRoute) {
                // allow
            } else if (isAdminRoute && !isSupportCSRoute) {
                return navigateTo('/admin/support')
            } else if (isUserRoute) {
                const allowed = to.path.startsWith('/profile')
                if (!allowed) return navigateTo('/admin/support')
            } else if (isMerchantRoute) {
                return navigateTo('/admin/support')
            }
        }

        // Requester trying to access admin or merchant routes
        if (role === ROLE_REQUESTER && isAdminRoute) {
            return navigateTo('/dashboard')
        }
        if (role === ROLE_REQUESTER && isMerchantRoute) {
            return navigateTo('/dashboard')
        }

        // Merchant trying to access admin or user routes → redirect to merchant panel
        if (role === ROLE_MERCHANT && isAdminRoute) {
            return navigateTo('/merchant/menu')
        }
        if (role === ROLE_MERCHANT && isUserRoute) {
            const isAllowedMerchantRoute = to.path.startsWith('/profile') || to.path.startsWith('/wallet')
            if (!isAllowedMerchantRoute) {
                return navigateTo('/merchant/menu')
            }
        }

        // Authenticated user on public pages → redirect to their home
        if (isPublic && !isMapRoute && to.path !== '/') {
            if (role === ROLE_ADMIN) return navigateTo('/admin')
            if (role === ROLE_MERCHANT) return navigateTo('/merchant/menu')
            if (role === ROLE_CS) return navigateTo('/admin/support')
            return navigateTo('/dashboard')
        }
    }
})