<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-parchment px-4">
    <div class="text-center">
      <p class="font-display text-7xl text-ink/30">404</p>
      <h1 class="mt-4 font-display text-2xl text-ink-dark">Page introuvable</h1>
      <p class="mt-2 text-sm text-ink-dark/55">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <RouterLink
        to="/"
        class="mt-6 inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-ink-dark transition hover:bg-gold-light"
      >
        ← Retour au tableau de bord
      </RouterLink>
    </div>
  </div>
</template>
