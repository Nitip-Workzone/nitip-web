// P1: restore api log with level warn sampling for prod (json-file 10m*3 limit)
// Only logs errors or slow (>500ms) to respect docker-compose logging driver limits
export default defineNitroPlugin((nitroApp) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nitroApp.hooks.hook('request', (event: any) => {
    if (!event.context) event.context = {}
    event.context._startAt = Date.now()
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nitroApp.hooks.hook('afterResponse', (event: any) => {
    try {
      const start = event.context?._startAt as number | undefined
      if (!start) return
      const dur = Date.now() - start
      const url = getRequestURL(event)
      const path = url.pathname
      if (path.startsWith('/_nuxt') || path.startsWith('/favicon') || path.includes('.')) return
      const status = event.response?.status || 200
      if (dur > 500 || status >= 400) {
        console.log(`[NITIP-WEB-SSR] ${event.method} ${path} -> ${status} ${dur}ms`)
      }
    } catch {
      // ignore
    }
  })
})

