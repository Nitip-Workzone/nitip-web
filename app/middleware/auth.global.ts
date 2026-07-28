export default defineNuxtRouteMiddleware(async (to) => {
    try {
    const authStore = useAuthStore()

    // === CRITICAL: Baca cookie langsung di middleware untuk mengatasi SSR hydration gap ===
    // Flow token dari Flutter WebView: /merchant/login?token=xxx atau /merchant/menu?token=xxx&t=xxx
    const tokenQuery = to.query.token as string
    const tParam = to.query.t as string
    if (tokenQuery) {
        try {
        const tokenCookie = useCookie('auth_token', {
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            sameSite: 'lax',
        })
        tokenCookie.value = tokenQuery
        authStore.setToken(tokenQuery)
        } catch {
            try { authStore.setToken(tokenQuery) } catch {}
        }
        
        try {
            await authStore.fetchProfile(true)
            // Remove token and t from query parameters for clean URL and route to merchant menu directly
            const cleanQuery = { ...to.query } as Record<string, unknown>
            delete cleanQuery.token
            delete cleanQuery.t
            // If already at /merchant/menu, just remove query (don't redirect loop)
            if (to.path === '/merchant/menu' || to.path === '/merchant/menu/') {
                if (Object.keys(cleanQuery).length === 0) {
                    return navigateTo({ path: '/merchant/menu' })
                }
                return navigateTo({ path: '/merchant/menu', query: cleanQuery as Record<string, string> })
            }
            return navigateTo({ path: '/merchant/menu', query: cleanQuery as Record<string, string> })
        } catch {
            // Token invalid/expired from Flutter - don't redirect to '/' which could 500 if root also has .at() issue
            // Clear token and go to merchant login
            try {
            authStore.token = null
            const tokenCookie = useCookie('auth_token')
            tokenCookie.value = null
            } catch {}
            // If token came from merchant flow, go back to merchant login, not home
            const wasMerchantRoute = to.path.startsWith('/merchant')
            if (wasMerchantRoute || to.path === '/') {
                // Trigger native logout for Flutter WebView to clear SecureStorage
                try {
                    if (typeof window !== 'undefined') {
                        const win = window as unknown as { NitipLogout?: { postMessage: (s: string) => void }, triggerNativeLogout?: (s: string) => void }
                        if (win.NitipLogout) win.NitipLogout.postMessage('token_invalid_middleware')
                        else if (win.triggerNativeLogout) win.triggerNativeLogout('token_invalid_middleware')
                    }
                } catch {}
                // Don't redirect to '/' - that caused 500 loop in diagnostics
                return navigateTo('/merchant/login')
            }
            return navigateTo('/')
        }
    }
    // Also handle ?t= param without token (leftover from previous buggy build) - just clean it
    if (tParam && !tokenQuery) {
        const cleanQuery = { ...to.query } as Record<string, unknown>
        delete cleanQuery.t
        if (to.path === '/merchant/menu' || to.path === '/merchant/menu/') {
            return navigateTo({ path: '/merchant/menu', query: cleanQuery as Record<string, string> })
        }
    }

    if (!authStore.token) {
        try {
        const tokenCookie = useCookie('auth_token')
        if (tokenCookie.value) {
            authStore.token = tokenCookie.value
        }
        } catch {
            // silent
        }
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

    // Define public routes (including map pages and welcome-simple test page for WebView 500 isolation)
    const publicRoutes = ['/', '/login', '/register', '/merchant/login', '/merchant/welcome-simple']
    const isMapRoute = to.path.startsWith('/map')
    const isPublic = publicRoutes.some(path => to.path === path) || isMapRoute || to.path === '/merchant/welcome-simple'

    // Route categories
    const isAdminRoute = to.path.startsWith('/admin')
    const isMerchantRoute = to.path.startsWith('/merchant')
    const isUserRoute = to.path.startsWith('/dashboard') || to.path.startsWith('/orders') || to.path.startsWith('/profile') || to.path.startsWith('/trips') || to.path.startsWith('/notifications')

    // Detect Flutter WebView via custom UserAgent (NitipMerchant / NitipApp) to allow token injection via JS after load
    let isFlutterWebView = false
    try {
        isFlutterWebView = typeof navigator !== 'undefined' && /NitipMerchant|NitipApp|wv|WebView/.test(navigator.userAgent)
    } catch { isFlutterWebView = false }

    // Redirect unauthenticated users trying to access protected routes
    // Exception: Flutter WebView untuk merchant route diberi kelonggaran (isPublic override) agar tidak 500
    const isPublicForWebView = isPublic || (isFlutterWebView && isMerchantRoute)

    if (!authStore.isAuthenticated && !isPublicForWebView) {
        // If we are inside Flutter WebView, trigger native logout instead of showing web login form
        if (isMerchantRoute) {
            if (!isFlutterWebView) {
                try { triggerNativeLogoutIfInWebView('middleware_merchant_401') } catch {}
                return navigateTo('/merchant/login')
            }
            // Flutter WebView: allow merchant route without auth — token will be injected via JS
        } else {
            try { triggerNativeLogoutIfInWebView('middleware_401') } catch {}
            return navigateTo('/login')
        }
    }

    // Fetch profile if authenticated but user data not loaded
    if (authStore.isAuthenticated && !authStore.user) {
        try {
            await authStore.fetchProfile()
        } catch {
            try {
            authStore.token = null
            const tokenCookie = useCookie('auth_token')
            tokenCookie.value = null
            } catch {}
            if (!isPublic && isMerchantRoute) {
                try { triggerNativeLogoutIfInWebView('fetchProfile_failed_merchant') } catch {}
            }
            if (!isPublic) {
                // Dulu return '/', sekarang ke login mapping yang benar agar tidak loop
                if (isMerchantRoute) return navigateTo('/merchant/login')
                if (isAdminRoute) return navigateTo('/admin/login')
                return navigateTo('/login')
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e: unknown) {
        // ——— GLOBAL GUARD: Jangan pernah throw 500 di middleware ———
        // Kalau ada bug di middleware, itu yang bikin prod return halaman error 500
        // di WebView build-apk-wa. Di sini kita biarkan page render, bukan throw ke error.vue
        // Jika masih ada token query, coba selamatkan sebagai login merchant
        try {
            const tq = to.query.token as string
            if (tq) {
                const authStore = useAuthStore()
                authStore.setToken(tq)
                return navigateTo({ path: '/merchant/menu' })
            }
        } catch {}
        // Jangan return 500, biarkan navigasi lanjut — page akan handle auth check sendiri
        return
    }
})