<script setup lang="ts">
import '~/assets/css/main.css'

// Polyfill for old Android WebView (Chrome <92) which doesn't support Array.at() / String.at()
// Real HP error: "w.matched.at is not a function" in vue-router matched.at(-1) -> triggers Nuxt error.vue 500 only on real device, not emulator (emulator Chrome 120+ supports at)
// Fix 2026-07-28
if (import.meta.client) {
  // Array.prototype.at
  if (!Array.prototype.at) {
    Object.defineProperty(Array.prototype, 'at', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: function (n: number) {
        const idx = Math.trunc(n) || 0
        if (idx < 0) return this[this.length + idx]
        return this[idx]
      },
      writable: true,
      configurable: true,
    })
  }
  // String.prototype.at
  if (!String.prototype.at) {
    Object.defineProperty(String.prototype, 'at', {
      value: function (n: number) {
        const idx = Math.trunc(n) || 0
        if (idx < 0) return this[this.length + idx] || ''
        return this[idx] || ''
      },
      writable: true,
      configurable: true,
    })
  }
  // Object.hasOwn (ES2022) sometimes used by Nuxt
  if (!(Object as unknown as { hasOwn?: unknown }).hasOwn) {
    ;(Object as unknown as { hasOwn: (o: object, p: PropertyKey) => boolean }).hasOwn = (o, p) => Object.prototype.hasOwnProperty.call(o, p)
  }
}
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UiErrorModal />
    <UiToastContainer />
    <PwaHandler />
  </div>
</template>
