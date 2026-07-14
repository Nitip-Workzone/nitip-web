import { defineStore } from 'pinia'

export const useErrorStore = defineStore('error', {
    state: () => ({
        isVisible: false,
        message: '',
        title: 'Terjadi Kesalahan',
    }),

    actions: {
        showError(message: string, title: string = 'Terjadi Kesalahan') {
            // Singleton behavior: if already showing, ignore or update? 
            // Requirement: "pastikan modal ini hanya muncul 1 walaupun ada beberapa endpoint yang error"
            if (this.isVisible) return

            this.message = message
            this.title = title
            this.isVisible = true
        },
        hideError() {
            this.isVisible = false
            this.message = ''
        }
    }
})
