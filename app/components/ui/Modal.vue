<script setup lang="ts">
import { X } from '@lucide/vue'

defineProps<{
  open: boolean
  title?: string
  description?: string
  maxWidth?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const close = () => emit('update:open', false)

onMounted(() => {
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close()
  }
  document.addEventListener('keydown', handleKey)
  onUnmounted(() => document.removeEventListener('keydown', handleKey))
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="close"
        />

        <!-- Panel -->
        <div
          class="relative z-10 w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          :class="maxWidth || 'max-w-lg'"
        >
          <!-- Header -->
          <div class="flex items-start justify-between p-6 border-b border-border/50">
            <div>
              <h2 v-if="title" class="text-lg font-bold text-foreground">{{ title }}</h2>
              <p v-if="description" class="text-sm text-muted-foreground mt-0.5">{{ description }}</p>
            </div>
            <button
              class="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              @click="close"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Body -->
          <div class="p-6">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="px-6 pb-6 pt-0">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>
