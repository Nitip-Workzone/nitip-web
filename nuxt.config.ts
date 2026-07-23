export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    '@vite-pwa/nuxt'
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
  pwa: {
    registerType: 'prompt',
    manifest: {
      name: 'Nihtip - Kirim & Titip Barang',
      short_name: 'Nihtip',
      description: 'Kirim & Titip barang lebih mudah dengan Nihtip',
      theme_color: '#0062cc',
      background_color: '#ffffff',
      display: 'standalone',
      icons: [
        {
          src: '/nitip-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/nitip-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,svg,ico}'],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },
  nitro: {
    devProxy: {
      '/api/v1': {
        target: 'https://api.nihtip.com/api/v1',
        changeOrigin: true,
      }
    }
  },
  future: {
    compatibilityVersion: 4,
  }
})
