<script setup lang="ts">
defineProps<{
  header?: boolean
}>()
</script>

<template>
  <tr
    class="border-b border-border/50 transition-colors"
    :class="header ? 'bg-muted/40' : 'hover:bg-muted/30'"
  >
    <slot />
  </tr>
</template>
