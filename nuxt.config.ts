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
      // URL publik API untuk digunakan browser langsung (kosong = gunakan proxy lokal /api/v1)
      // Di production: set NUXT_PUBLIC_NITIP_API_URL=https://api.nihtip.com
      nitipApiUrl: process.env.NUXT_PUBLIC_NITIP_API_URL || process.env.API_BASE_URL || '',
    },
  },
  experimental: {
    payloadExtraction: false,
    inlineRouteRules: false,
    appManifest: false,
    // Disable import map generation that causes #entry error in HUAWEI WebView Chrome 88 (UA spoof 120 but engine 88, no importmap support)
    // HUAWEI AGS6-W09 log: Loaded native library version number "88.0.4324.93" but UA says Chrome/120.0.0.0
    // import maps support Chrome 89+, but HUAWEI triwebview 11.1.5.316 doesn't support it
    entryImportMap: false,
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
      ],
      // Polyfill for old WebView Chrome <92 - w.matched.at is not a function
      script: [
        {
          innerHTML: `if(!Array.prototype.at){Array.prototype.at=function(n){var o=Object(this),l=o.length>>>0,k=Math.trunc(n)||0;if(k<0)k+=l;if(k<0||k>=l)return;return o[k]}}if(!String.prototype.at){String.prototype.at=function(n){var s=String(this),l=s.length,k=Math.trunc(n)||0;if(k<0)k+=l;if(k<0||k>=l)return '';return s[k]||''}}`,
          type: 'text/javascript',
        },
      ],
    }
  },
  vite: {
    build: {
      // Fix 2026-07-28: downgrade from es2022 to es2019 to avoid Array.at() which breaks old Android System WebView (< Chrome 92)
      // Real HP error: "w.matched.at is not a function" -> only on real device, not emulator (emulator Chrome 120+ supports at)
      target: 'es2019',
    },
    optimizeDeps: {
      include: ['vue-router'],
    },
    plugins: [
      // Rewrite matched.at(-1) -> matched[matched.length-1] for old WebView compatibility
      // Must include node_modules/vue-router because matched.at comes from there
      {
        name: 'fix-array-at',
        transform(code: string, _id: string) {
          if (!code.includes('.at(')) return
          // Only care about matched.at pattern
          if (!code.includes('matched.at')) return
          let newCode = code
          newCode = newCode.replace(/(\w+)\.matched\.at\((-?\d+)\)/g, (_m, obj, idx) => {
            const i = parseInt(idx, 10)
            if (i === -1) return `${obj}.matched[${obj}.matched.length - 1]`
            if (i < 0) return `${obj}.matched[${obj}.matched.length + ${i}]`
            return `${obj}.matched[${i}]`
          })
          // Also handle generic route.matched.at and w.matched.at patterns
          newCode = newCode.replace(/(\b\w+\.matched)\.at\(-1\)/g, '$1[$1.length - 1]')
          if (newCode !== code) return { code: newCode, map: null }
        },
      },
    ],
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
