// Log backend API calls during SSR (disabled)
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    // console.log disabled
  })

  nitroApp.hooks.hook('afterResponse', (event) => {
    // console.log disabled
  })
})