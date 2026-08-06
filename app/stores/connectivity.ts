import { defineStore } from 'pinia'

export const useConnectivityStore = defineStore('connectivity', {
    state: () => ({
        isOffline: false,
        isPoorConnection: false,
    }),
    actions: {
        initialize() {
            if (import.meta.client) {
                this.isOffline = !navigator.onLine
                window.addEventListener('online', () => {
                    this.isOffline = false
                })
                window.addEventListener('offline', () => {
                    this.isOffline = true
                })
            }
        },
        setPoorConnection(value: boolean) {
            this.isPoorConnection = value
        }
    }
})
