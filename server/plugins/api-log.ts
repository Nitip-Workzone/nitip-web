// Log backend API calls during SSR (visible in Docker logs / Dozzle)
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    // Log incoming SSR request
    const path = getRequestURL(event).pathname
    if (!path.startsWith('/_nuxt') && !path.startsWith('/favicon')) {
      console.log(`[NITIP-WEB-SSR] Incoming: ${event.method} ${path}`)
    }
  })

  nitroApp.hooks.hook('afterResponse', (event) => {
    const path = getRequestURL(event).pathname
    if (!path.startsWith('/_nuxt') && !path.startsWith('/favicon')) {
      console.log(`[NITIP-WEB-SSR] Response: ${event.method} ${path}`)
    }
  })
})