<script setup>
import { useRoute } from 'vue-router'
import SideNav from './components/SideNav.vue'

const route = useRoute()
</script>

<template>
  <div v-if="route.meta.public" class="min-h-screen bg-ink">
    <RouterView />
  </div>
  <div v-else class="flex min-h-screen bg-parchment">
    <SideNav />
    <main class="flex-1 overflow-y-auto px-8 py-8 lg:px-12">
      <div class="mx-auto max-w-6xl">
        <RouterView />
      </div>
    </main>
  </div>
</template>
