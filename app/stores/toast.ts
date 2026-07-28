import { defineStore } from 'pinia'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
    id: string
    type: ToastType
    message: string
    duration: number
}

export const useToastStore = defineStore('toast', {
    state: () => ({
        toasts: [] as ToastItem[],
    }),

    actions: {
        add(message: string, type: ToastType = 'info', duration = 3500) {
            const id = Math.random().toString(36).slice(2)
            this.toasts.push({ id, type, message, duration })

            setTimeout(() => {
                this.remove(id)
            }, duration)
        },

        remove(id: string) {
            this.toasts = this.toasts.filter((t) => t.id !== id)
        },
    },
})

// Note: useToast() composable now lives in ~/composables/useToast.ts to avoid auto-import conflict
// Keep this file as store only
