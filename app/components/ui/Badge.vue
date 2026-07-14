<script setup lang="ts">
defineProps<{
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'secondary'
}>()
</script>

<template>
  <span
    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
    :class="{
      'bg-primary/10 text-primary': !variant || variant === 'default',
      'bg-emerald-500/10 text-emerald-500': variant === 'success',
      'bg-amber-500/10 text-amber-500': variant === 'warning',
      'bg-destructive/10 text-destructive': variant === 'destructive',
      'bg-blue-500/10 text-blue-400': variant === 'info',
      'bg-secondary text-muted-foreground': variant === 'secondary',
    }"
  >
    <slot />
  </span>
</template>
