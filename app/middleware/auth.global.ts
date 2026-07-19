export default defineNuxtRouteMiddleware(async (to) => {
    const authStore = useAuthStore()

    // === CRITICAL: Baca cookie langsung di middleware untuk mengatasi SSR hydration gap ===
    // Plugin mungkin belum dieksekusi atau store belum tersinkronisasi saat middleware berjalan.
    // Membaca cookie di sini memastikan token selalu tersedia di setiap request SSR.
    if (!authStore.token) {
        const tokenCookie = useCookie('auth_token')
        console.log('[Auth Middleware] Reading auth_token cookie:', tokenCookie.value ? 'EXISTS' : 'EMPTY')
        if (tokenCookie.value) {
            authStore.token = tokenCookie.value
        }
    } else {
        console.log('[Auth Middleware] authStore.token already exists.')
    }

    // Define public routes (including map pages used by Flutter WebView — client-only, no user auth needed)
    const publicRoutes = ['/', '/login', '/register']
    const isMapRoute = to.path.startsWith('/map')
    const isPublic = publicRoutes.some(path => to.path === path) || isMapRoute

    // Admin-only routes
    const isAdminRoute = to.path.startsWith('/admin')

    // User (requester) routes
    const isUserRoute = to.path.startsWith('/dashboard') || to.path.startsWith('/orders') || to.path.startsWith('/profile') || to.path.startsWith('/trips') || to.path.startsWith('/notifications')

    // Redirect unauthenticated users trying to access protected routes
    if (!authStore.isAuthenticated && !isPublic) {
        return navigateTo('/login')
    }

    // Fetch profile if authenticated but user data not loaded
    if (authStore.isAuthenticated && !authStore.user) {
        try {
            console.log('[Auth Middleware] Fetching profile...')
            await authStore.fetchProfile()
            console.log('[Auth Middleware] Profile fetched successfully:', (authStore.user as any)?.email)
        } catch (err) {
            console.error('[Auth Middleware] fetchProfile failed:', err)
            // Jika fetch profile gagal (misal token expired), bersihkan state dan redirect ke login
            authStore.token = null
            const tokenCookie = useCookie('auth_token')
            tokenCookie.value = null
            if (!isPublic) {
                console.log('[Auth Middleware] Redirecting to login due to fetchProfile failure.')
                return navigateTo('/login')
            }
        }
    }

    // Role-based access control
    if (authStore.isAuthenticated && authStore.user) {
        const role = authStore.user.role

        // Runner is not allowed on Web Platform (exclusively mobile)
        if (role === ROLE_RUNNER) {
            const toastStore = useToastStore()
            if (toastStore) {
                toastStore.add('Akses Ditolak: Akun Runner hanya dapat diakses melalui Aplikasi Mobile.', 'error')
            }
            authStore.logout()
            return navigateTo('/login')
        }

        // Admin trying to access user routes → redirect to admin
        if (role === ROLE_ADMIN && isUserRoute) {
            return navigateTo('/admin')
        }

        // Requester trying to access admin routes → redirect to dashboard
        if (role === ROLE_REQUESTER && isAdminRoute) {
            return navigateTo('/dashboard')
        }

        // Authenticated user on public pages → redirect to their home (but NOT map routes — they're embedded in Flutter WebView)
        if (isPublic && !isMapRoute && to.path !== '/') {
            if (role === ROLE_ADMIN) {
                return navigateTo('/admin')
            }
            return navigateTo('/dashboard')
        }
    }
})