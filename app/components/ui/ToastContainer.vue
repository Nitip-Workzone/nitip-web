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
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  error: 'bg-destructive/10 border-destructive/20 text-destructive',
  info: 'bg-primary/10 border-primary/20 text-primary',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
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
