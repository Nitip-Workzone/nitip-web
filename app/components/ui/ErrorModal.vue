<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next'
import { useErrorStore } from '~/stores/error'

const errorStore = useErrorStore()
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform scale-95 opacity-0"
    enter-to-class="transform scale-100 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform scale-100 opacity-100"
    leave-to-class="transform scale-95 opacity-0"
  >
    <div v-if="errorStore.isVisible" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div class="p-6 text-center space-y-4">
          <!-- Icon Centered -->
          <div class="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <AlertCircle class="w-6 h-6" />
          </div>
          
          <!-- Text Content -->
          <div class="space-y-1">
            <h3 class="text-lg font-bold text-foreground">{{ errorStore.title }}</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              {{ errorStore.message }}
            </p>
          </div>
          
          <!-- Confirm Button -->
          <div class="pt-2">
            <UiButton 
              variant="destructive" 
              class="w-full h-11 font-semibold rounded-xl"
              @click="errorStore.hideError()"
            >
              Mengerti
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
