<script setup lang="ts">
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-vue-next'

const toastStore = useToastStore()

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const colorMap = {
  success: 'bg-card border-emerald-500/30 text-foreground shadow-lg',
  error: 'bg-card border-destructive/30 text-foreground shadow-lg',
  info: 'bg-card border-primary/30 text-foreground shadow-lg',
  warning: 'bg-card border-amber-500/30 text-foreground shadow-lg',
}

const iconColorMap = {
  success: 'text-emerald-500',
  error: 'text-destructive',
  info: 'text-primary',
  warning: 'text-amber-400',
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      style="min-width: 280px; max-width: 360px"
    >
      <TransitionGroup
        name="toast"
        tag="div"
        class="flex flex-col gap-2"
      >
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg pointer-events-auto"
          :class="colorMap[toast.type]"
        >
          <component
            :is="iconMap[toast.type]"
            class="w-4 h-4 flex-shrink-0 mt-0.5"
            :class="iconColorMap[toast.type]"
          />
          <p class="text-sm font-medium text-foreground leading-snug flex-1">
            {{ toast.message }}
          </p>
          <button
            class="flex-shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            @click="toastStore.remove(toast.id)"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.25s ease-out;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>
