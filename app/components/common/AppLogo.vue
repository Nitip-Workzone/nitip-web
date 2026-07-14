<script setup lang="ts">
defineProps<{
  size?: number
  showText?: boolean
  fontSize?: number
  darkMode?: boolean
}>()
</script>

<template>
  <div class="flex items-center gap-2.5">
    <img
      src="/logo_premium.png"
      alt="Nitip"
      class="object-contain"
      :style="{
        width: `${(size || 24) * 1.5}px`,
        height: `${(size || 24) * 1.5}px`,
      }"
    >
    <span
      v-if="showText !== false"
      class="font-extrabold tracking-[2px]"
      :style="{
        fontSize: `${fontSize || 18}px`,
        color: darkMode ? 'white' : undefined,
      }"
      :class="!darkMode ? 'text-primary' : ''"
    >
      NITIP
    </span>
  </div>
</template>