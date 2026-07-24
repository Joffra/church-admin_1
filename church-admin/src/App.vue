<script setup>
import { useRoute } from 'vue-router'
import SideNav from './components/SideNav.vue'
import PortalNav from './components/PortalNav.vue'
import PortalFooter from './components/PortalFooter.vue'

const route = useRoute()
</script>

<template>
  <!-- Public portal layout (navbar + footer) -->
  <div v-if="route.meta.portal" class="flex min-h-screen flex-col bg-parchment">
    <PortalNav />
    <main class="flex-1">
      <RouterView />
    </main>
    <PortalFooter />
  </div>

  <!-- Standalone public pages (login, password reset) -->
  <div v-else-if="route.meta.public" class="min-h-screen bg-ink">
    <RouterView />
  </div>

  <!-- Admin layout (SideNav) -->
  <div v-else class="flex min-h-screen bg-parchment">
    <SideNav />
    <main class="flex-1 overflow-y-auto px-8 py-8 lg:px-12">
      <div class="mx-auto max-w-6xl">
        <RouterView />
      </div>
    </main>
  </div>
</template>
