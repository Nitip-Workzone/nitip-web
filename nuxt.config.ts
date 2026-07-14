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
    },
  },
  app: {
    head: {
      title: 'Nitip - Kirim & Titip Barang',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { charset: 'utf-8' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/nitip-mini.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap' }
      ]
    }
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Nitip - Kirim & Titip Barang',
      short_name: 'Nitip',
      description: 'Kirim & Titip barang lebih mudah dengan Nitip',
      theme_color: '#1E3A5F',
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
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },
  future: {
    compatibilityVersion: 4,
  },
  nitro: {
    devProxy: {
      '/api/v1': {
        target: process.env.API_BASE_URL || 'http://localhost:8000/api/v1',
        changeOrigin: true
      }
    }
  }
})
