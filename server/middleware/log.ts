export default defineEventHandler((event) => {
  const method = event.method
  const path = getRequestURL(event).pathname
  if (path.startsWith('/_nuxt') || path.startsWith('/favicon') || path.includes('.')) return
  console.log(`[NITIP-WEB] ${method} ${path}`)
})