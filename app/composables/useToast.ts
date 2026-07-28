/**
 * useToast composable — auto-imported by Nuxt
 * This file exists to guarantee useToast() is auto-imported in all pages,
 * avoiding ReferenceError in production build that causes error.vue 500.
 * It delegates to useToastStore defined in ~/stores/toast
 */
export const useToast = () => {
  const store = useToastStore()
  return {
    success: (msg: string) => store.add(msg, 'success'),
    error: (msg: string) => store.add(msg, 'error'),
    info: (msg: string) => store.add(msg, 'info'),
    warning: (msg: string) => store.add(msg, 'warning'),
  }
}
