<script setup lang="ts">
// Super simple welcome - NO middleware, NO layout, NO auth, NO store, NO API
// For merchant mobile redirect after login - isolates 500 issue
// Outside /merchant/* so no merchant middleware group
definePageMeta({
  layout: false,
  middleware: [],
  ssr: false,
})

const probeText = ref('Loading probe...')
const roleText = ref('Checking auth...')
const tokenExists = ref(false)

onMounted(() => {
  try {
    const info: string[] = []
    info.push(`UA: ${navigator.userAgent.substring(0, 80)}...`)
    const m = navigator.userAgent.match(/Chrome\/([\d.]+)/)
    info.push(`Chrome: ${m ? m[1] : 'unknown'}`)
    info.push(`Array.at: ${typeof Array.prototype.at === 'function'}`)
    info.push(`Is WebView wv: ${navigator.userAgent.includes('wv')}`)
    info.push(`Is NitipMerchant: ${navigator.userAgent.includes('NitipMerchant')}`)
    info.push(`URL: ${window.location.href}`)
    info.push(`Has token query: ${window.location.search.includes('token')}`)
    info.push(`Cookie len: ${document.cookie.length}`)
    try {
      const lsToken = localStorage.getItem('auth_token') || localStorage.getItem('token') || ''
      info.push(`LS token len: ${lsToken.length}`)
      tokenExists.value = lsToken.length > 20 || document.cookie.includes('auth_token')
    } catch {}
    info.push(`Build: 2026-07-29 welcome-simple outside merchant, no middleware`)
    probeText.value = info.join('\n')

    // Check role from localStorage/pinia if available (best effort, no store import)
    try {
      const authData = localStorage.getItem('auth') || localStorage.getItem('auth-store') || ''
      if (authData) {
        roleText.value = `Auth storage found: ${authData.substring(0, 100)}...`
      } else {
        // Try to read from cookie-decoded JWT role (quick parse)
        const cookies = document.cookie
        if (cookies.includes('auth_token')) {
          roleText.value = `Cookie auth_token exists, len ${cookies.length}`
        } else {
          roleText.value = 'No auth cookie/token found (guest)'
        }
      }
    } catch (e) {
      roleText.value = `Role check error: ${e}`
    }
  } catch (e) {
    probeText.value = `Probe error: ${e}`
  }
})

const goMerchantMenu = () => {
  navigateTo('/merchant/menu')
}
const goLogin = () => {
  navigateTo('/login')
}
</script>

<template>
  <div style="min-height: 100vh; background: #f8fafc; font-family: sans-serif; padding: 24px;">
    <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 24px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center;">
      <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 32px;">
        ✅
      </div>
      <h1 style="font-size: 22px; font-weight: 900; color: #0f172a; margin: 0 0 8px;">
        Welcome Simple
      </h1>
      <p style="font-size: 12px; color: #64748b; margin: 0 0 4px;">
        No middleware, no layout, no auth, no store, no API
      </p>
      <p style="font-size: 10px; color: #94a3b8; margin: 0 0 12px; word-break: break-all;">
        Path: /welcome-simple (outside merchant)
      </p>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 10px; text-align: left; font-size: 11px; margin-bottom: 12px;">
        <strong>Auth:</strong><br>
        {{ roleText }}
        <div style="margin-top: 6px;">
          Token exists: {{ tokenExists ? 'Yes ✅' : 'No ❌' }}
        </div>
      </div>

      <div style="background: #f1f5f9; border-radius: 12px; padding: 12px; text-align: left; font-size: 10px; line-height: 1.5; color: #334155; margin-bottom: 16px; white-space: pre-line; max-height: 220px; overflow-y: auto;">
        <strong>WebView Probe:</strong><br>
        {{ probeText }}
      </div>

      <div style="display: grid; gap: 8px;">
        <button style="width: 100%; padding: 14px; background: #0f172a; color: white; border-radius: 12px; font-size: 13px; font-weight: 800; border: none; cursor: pointer;" @click="goMerchantMenu">
          Continue to Merchant Dashboard →
        </button>
        <a href="/merchant/login" style="display: block; padding: 12px; background: white; border: 1px solid #e2e8f0; color: #0f172a; border-radius: 12px; text-decoration: none; font-size: 12px; font-weight: 700;">
          Go to Merchant Login
        </a>
        <a href="/merchant/menu" style="display: block; padding: 12px; background: white; border: 1px solid #e2e8f0; color: #0f172a; border-radius: 12px; text-decoration: none; font-size: 12px; font-weight: 700;">
          Direct Merchant Menu (with middleware)
        </a>
        <a href="/map/picker" style="display: block; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; border-radius: 12px; text-decoration: none; font-size: 11px;">
          Test Map Picker (WebView)
        </a>
        <button style="width: 100%; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; border-radius: 12px; font-size: 11px; cursor: pointer;" @click="goLogin">
          Go to /login
        </button>
      </div>

      <p style="font-size: 9px; color: #94a3b8; margin-top: 16px;">
        Build: 2026-07-29 outside merchant - If you see this, bundle OK and no middleware 500
      </p>
    </div>
  </div>
</template>
