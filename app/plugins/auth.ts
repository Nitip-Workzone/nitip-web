/**
 * Plugin: auth.ts
 *
 * Plugin ini berjalan di sisi server (SSR) sebelum middleware auth.global.ts dipanggil.
 * Tugasnya adalah membaca cookie 'auth_token' dari request header dan langsung
 * menginisialisasi state token di Pinia store.
 *
 * Tanpa plugin ini, store selalu dimulai dengan token: null karena Pinia tidak
 * dapat mengakses cookies dari state() secara langsung saat SSR.
 */
export default defineNuxtPlugin(() => {
    const authStore = useAuthStore()
    const tokenCookie = useCookie('auth_token')

    // Hidrasikan token dari cookie ke store jika belum ada
    if (tokenCookie.value && !authStore.token) {
        authStore.token = tokenCookie.value
    }
})
