export default defineNuxtRouteMiddleware(async (to) => {
    const authStore = useAuthStore()

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
        await authStore.fetchProfile()
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