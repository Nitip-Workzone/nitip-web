<script setup lang="ts">
import '~/assets/css/main.css'
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UiErrorModal />
    <UiToastContainer />
    <PwaHandler />
  </div>
</template>
