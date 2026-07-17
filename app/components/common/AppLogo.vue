<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: number
    showText?: boolean
    fontSize?: number
    darkMode?: boolean
  }>(),
  {
    size: 28,
    showText: true,
  }
)
</script>

<template>
  <div class="flex items-center gap-2.5">
    <img
      :src="darkMode ? '/logo-white.png' : '/logo.webp'"
      alt="Nihtip"
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
      NIHTIP
    </span>
  </div>
</template>