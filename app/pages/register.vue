<script setup lang="ts">
definePageMeta({
  layout: false,
})

// Disable registration page and redirect to login
navigateTo('/login')
</script>

<template>
  <div class="min-h-screen bg-background flex items-center justify-center">
    <p class="text-sm text-muted-foreground">Halaman pendaftaran dinonaktifkan. Mengalihkan...</p>
  </div>
</template>