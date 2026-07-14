<script setup lang="ts">
interface Props {
  title?: string
  description?: string
  noPadding?: boolean
}

const props = defineProps<Props>()
</script>

<template>
  <div class="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
    <div v-if="props.title || props.description" class="flex flex-col space-y-1.5 p-6 border-b border-border/50 bg-background/30">
      <h3 v-if="props.title" class="leading-none tracking-tight font-semibold">
        {{ props.title }}
      </h3>
      <p v-if="props.description" class="text-sm text-muted-foreground">
        {{ props.description }}
      </p>
    </div>
    <div :class="[noPadding ? '' : 'p-6']">
      <slot />
    </div>
    <div v-if="$slots.footer" class="flex items-center p-6 pt-0">
      <slot name="footer" />
    </div>
  </div>
</template>
