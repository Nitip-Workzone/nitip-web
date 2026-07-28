<script setup lang="ts">
// Super simple page - NO middleware, NO auth, NO store, NO API, NO layout dependencies
// For testing WebView 500 isolation on real HP
definePageMeta({
  layout: false,
  middleware: [],
  ssr: false,
})

const probeText = ref('Loading probe...')

onMounted(() => {
  try {
    const info: string[] = []
    info.push(`UA: ${navigator.userAgent.substring(0, 80)}...`)
    const m = navigator.userAgent.match(/Chrome\/([\d.]+)/)
    info.push(`Chrome: ${m ? m[1] : 'unknown'}`)
    info.push(`Array dot at: ${typeof Array.prototype.at === 'function'}`)
    info.push(`URL: ${window.location.href}`)
    info.push(`Has token query: ${window.location.search.includes('token')}`)
    info.push(`Build: 2026-07-29 simple - bundle OK`)
    probeText.value = info.join('\n')
  } catch (e) {
    probeText.value = `Probe error: ${e}`
  }
})
</script>

<template>
  <div style="min-height: 100vh; background: #f8fafc; font-family: sans-serif; padding: 24px;">
    <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 24px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center;">
      <div style="width: 64px; height: 64px; background: #e0f2fe; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 32px;">
        ✅
      </div>
      <h1 style="font-size: 20px; font-weight: 900; color: #0f172a; margin: 0 0 8px;">
        Welcome Simple
      </h1>
      <p style="font-size: 12px; color: #64748b; margin: 0 0 4px;">
        No middleware, no auth, no store, no API
      </p>
      <p style="font-size: 10px; color: #94a3b8; margin: 0 0 16px; word-break: break-all;">
        Path: /merchant/welcome-simple
      </p>

      <div style="background: #f1f5f9; border-radius: 12px; padding: 12px; text-align: left; font-size: 11px; line-height: 1.5; color: #334155; margin-bottom: 16px; white-space: pre-line;">
        <strong>WebView Probe:</strong><br>
        {{ probeText }}
      </div>

      <div style="display: grid; gap: 8px;">
        <a href="/merchant/login" style="display: block; padding: 12px; background: #0f172a; color: white; border-radius: 12px; text-decoration: none; font-size: 12px; font-weight: 700;">
          Go to Merchant Login
        </a>
        <a href="/merchant/menu" style="display: block; padding: 12px; background: white; border: 1px solid #e2e8f0; color: #0f172a; border-radius: 12px; text-decoration: none; font-size: 12px; font-weight: 700;">
          Go to Merchant Menu (with middleware)
        </a>
        <a href="/login" style="display: block; padding: 12px; background: white; border: 1px solid #e2e8f0; color: #64748b; border-radius: 12px; text-decoration: none; font-size: 12px;">
          Go to /login
        </a>
      </div>

      <p style="font-size: 10px; color: #94a3b8; margin-top: 16px;">
        Build: 2026-07-29 simple test
      </p>
    </div>
  </div>
</template>
