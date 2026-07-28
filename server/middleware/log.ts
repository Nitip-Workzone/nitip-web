export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const path = url.pathname
  // Skip static assets noise
  if (path.startsWith('/_nuxt') || path.startsWith('/favicon') || path.includes('.')) return
  // Only log slow? Keep light for prod 512M docker json-file 10m*3
  const start = Date.now()
  event.context.logStart = start
})

