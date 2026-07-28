// Polyfill for old Android System WebView (< Chrome 92) - MUST load before vue-router
// Real HP error: w.matched.at is not a function -> error.vue 500 only on real device
// Fix 2026-07-28: this file is named polyfill.client.ts and will be loaded first by Nuxt
export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return

  // Array.at
  if (!Array.prototype.at) {
    Object.defineProperty(Array.prototype, 'at', {
      value: function (n: number) {
        const O = Object(this)
        const len = O.length >>> 0
        let k = Math.trunc(n) || 0
        if (k < 0) k += len
        if (k < 0 || k >= len) return undefined
        return O[k]
      },
      writable: true,
      configurable: true,
    })
  }

  // String.at
  if (!String.prototype.at) {
    Object.defineProperty(String.prototype, 'at', {
      value: function (n: number) {
        const s = String(this)
        const len = s.length
        let k = Math.trunc(n) || 0
        if (k < 0) k += len
        if (k < 0 || k >= len) return ''
        return s[k] || ''
      },
      writable: true,
      configurable: true,
    })
  }

  // Object.hasOwn
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Obj = Object as any
  if (!Obj.hasOwn) {
    Obj.hasOwn = (o: object, p: PropertyKey) => Object.prototype.hasOwnProperty.call(o, p)
  }
})
