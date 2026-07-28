export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    // PWA dimatikan sementara (2026-07-28) agar web selalu fresh, tidak cache 500 error page di WebView prod
    // Alasan: Service Worker pernah cache error 500 saat NUXT_PUBLIC_NITIP_API_KEY kosong, WebView mobile tidak bisa update
    // Untuk aktifkan lagi, ganti jadi '@vite-pwa/nuxt' dan uncomment blok pwa di bawah
    // '@vite-pwa/nuxt'
  ],
  runtimeConfig: {
    public: {
      nitipApiKey: process.env.NUXT_PUBLIC_NITIP_API_KEY || '',
      nitipApiSecret: process.env.NUXT_PUBLIC_NITIP_API_SECRET || '',
      // URL publik API untuk digunakan browser langsung (kosong = gunakan proxy lokal /api/v1)
      // Di production: set NUXT_PUBLIC_NITIP_API_URL=https://api.nihtip.com
      nitipApiUrl: process.env.NUXT_PUBLIC_NITIP_API_URL || process.env.API_BASE_URL || '',
    },
  },
  app: {
    head: {
      title: 'Nihtip - Kirim & Titip Barang',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { charset: 'utf-8' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap' }
      ]
    }
  },
  nitro: {
    devProxy: {
      '/api/v1': {
        target: 'https://api.nihtip.com/api/v1',
        changeOrigin: true,
      }
    },
    routeRules: {
      // Jangan pernah cache halaman merchant di WebView / SW
      '/merchant/**': {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      },
      '/api/**': {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    },
  },
  future: {
    compatibilityVersion: 4,
  }
})
