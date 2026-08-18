// Central helper untuk enforce semua image read ke https://upload.nihtip.com/
// Backend sekarang sudah jadi single source of truth yang return https://upload.nihtip.com/,
// tapi helper ini tetap sebagai defense in depth untuk legacy DB yang mungkin masih simpan myqcloud.com atau localhost.

export const DEFAULT_ASSET_BASE = 'https://upload.nihtip.com/'

function getAssetBase(): string {
  try {
    const config = useRuntimeConfig()
    const base = (config.public as any).uploadBaseUrl || (config.public as any).assetBaseUrl || ''
    if (base) {
      const trimmed = String(base).trim()
      if (trimmed) {
        // jangan pakai myqcloud sebagai final read base — fallback ke default
        if (trimmed.includes('myqcloud.com')) return DEFAULT_ASSET_BASE
        return trimmed.replace(/\/+$/, '') + '/'
      }
    }
  } catch (_) {}
  return DEFAULT_ASSET_BASE
}

function extractKey(raw: string): string {
  if (!raw) return ''
  let u = raw.trim()

  // If https://upload.nihtip.com/banners/foo.jpg?sign -> keep as is? But we need to normalize legacy
  // If already https://upload.nihtip.com/ keep full path later — but for extraction we still handle myqcloud/localhost cases
  if (u.startsWith('http://') || u.startsWith('https://')) {
    // Handle legacy myqcloud.com/...?sign or localhost:8000
    if (u.includes('myqcloud.com/')) {
      const idx = u.indexOf('myqcloud.com/')
      u = u.substring(idx + 'myqcloud.com/'.length)
    } else if (u.includes('/uploads/')) {
      const idx = u.indexOf('/uploads/')
      u = u.substring(idx + '/uploads/'.length)
    } else if (u.startsWith('http://localhost:8000') || u.startsWith('http://nitip-core:8000') || u.includes('localhost:8000') || u.includes('127.0.0.1:8000')) {
      // extract after host
      try {
        const urlObj = new URL(u)
        u = urlObj.pathname
        if (u.startsWith('/uploads/')) u = u.substring('/uploads/'.length)
        else if (u.startsWith('/')) u = u.substring(1)
      } catch {
        // fallback string ops
        const slash = u.indexOf('/', u.indexOf('//') + 2)
        if (slash !== -1) {
          u = u.substring(slash + 1)
          if (u.startsWith('uploads/')) u = u.substring('uploads/'.length)
        }
      }
    } else {
      // external other (firebase, qrserver, etc) — return as-is directly (passthrough)
      // Check if it's already our CDN
      if (u.startsWith('https://upload.nihtip.com/') || u.startsWith(DEFAULT_ASSET_BASE)) {
        return u // already final CDN — keep with query
      }
      // If external domain not myqcloud/localhost, passthrough
      if (!u.includes('nihtip.com')) {
        // Check known external: firebase, qrserver, etc — passthrough
        if (u.includes('firebasestorage') || u.includes('qrserver') || u.includes('googleapis') || u.includes('cloudflare')) {
          return raw
        }
        // For other https urls that are not our asset, if they look like absolute external image (e.g. https://example.com/img.jpg) passthrough
        // But if it's bare path like banners/foo.jpg that somehow passed? Then we will prepend CDN below
        // So here we try to detect if it's really external absolute — if host not localhost/myqcloud/nitip, passthrough
        return raw
      }
      // If it still contains upload.nihtip.com but we already handled above, just return
      if (u.includes('upload.nihtip.com')) {
        return raw
      }
    }
    // strip query for extracted key path
    const qIdx = u.indexOf('?')
    if (qIdx !== -1) u = u.substring(0, qIdx)
  }

  // Remove leading slashes and uploads/ prefix
  u = u.replace(/^\/+/, '')
  if (u.startsWith('uploads/')) u = u.substring('uploads/'.length)
  if (u.startsWith('storage/')) u = u.substring('storage/'.length)
  // Clean
  u = u.trim()
  // Still has query?
  const q = u.indexOf('?')
  if (q !== -1) u = u.substring(0, q)
  return u
}

export function resolveImageUrl(url?: string | null): string {
  if (!url) return ''
  const raw = String(url).trim()
  if (!raw) return ''

  // Already final CDN https://upload.nihtip.com/... keep (preserve ?sign)
  if (raw.startsWith('https://upload.nihtip.com/') || raw.startsWith(DEFAULT_ASSET_BASE)) {
    return raw
  }

  // External passthrough for known non-asset hosts
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    // myqcloud or localhost -> extract key and prepend CDN
    if (raw.includes('myqcloud.com') || raw.includes('localhost:8000') || raw.includes('nitip-core:8000') || raw.includes('127.0.0.1:8000')) {
      const key = extractKey(raw)
      if (!key) return ''
      const base = getAssetBase()
      return `${base}${key}`
    }
    // If already upload.nihtip.com (handled above) — keep
    // Other https external — passthrough
    if (raw.includes('upload.nihtip.com')) return raw
    // Firebase, QRIS, etc passthrough
    if (raw.includes('firebasestorage') || raw.includes('googleapis') || raw.includes('qrserver') || raw.includes('cloudflare') || raw.startsWith('https://api.qrserver.com') || raw.startsWith('data:') || raw.startsWith('blob:')) {
      return raw
    }
    // If it looks like absolute https with host not ours but still image, passthrough for safety
    // However for nitip domains that are not asset (e.g. https://api.nihtip.com/uploads/..) — rewrite to CDN
    if (raw.includes('api.nihtip.com') && raw.includes('/uploads/')) {
      const key = extractKey(raw)
      const base = getAssetBase()
      return `${base}${key}`
    }
    // Default: if it's https but not recognized as our asset, passthrough to avoid breaking external banners
    return raw
  }

  // Relative paths: /uploads/banners/x.jpg, uploads/avatars/y.jpg, banners/x.jpg, avatars/y.jpg, menus/..., stores/..., etc
  const key = extractKey(raw)
  if (!key) return ''
  const base = getAssetBase()
  return `${base}${key}`
}

export function useImageUrl() {
  return {
    resolveImageUrl,
    defaultAssetBase: DEFAULT_ASSET_BASE,
    getAssetBase,
  }
}
