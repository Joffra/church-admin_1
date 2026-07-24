<script setup>
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/logo.png'

const route = useRoute()
const auth = useAuthStore()

const links = [
  { to: '/portail', label: 'Accueil' },
  { to: '/portail/mission', label: 'Mission' },
  { to: '/portail/eglises', label: 'Églises' },
  { to: '/portail/contact', label: 'Contact' },
]

function isActive(path) {
  if (path === '/portail') return route.path === '/portail'
  return route.path.startsWith(path)
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-white/10 bg-ink/95 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <RouterLink to="/portail" class="flex items-center gap-3">
        <img :src="logo" alt="MECEIPH" class="h-9 w-9 object-contain" />
        <div>
          <p class="font-display text-sm leading-tight text-parchment">MECEIPH</p>
          <p class="text-[10px] uppercase tracking-[0.16em] text-gold/80">Mission Évangélique</p>
        </div>
      </RouterLink>

      <nav class="hidden items-center gap-1 md:flex">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="rounded-md px-3 py-2 text-sm transition-colors"
          :class="isActive(link.to) ? 'text-gold font-medium' : 'text-parchment/70 hover:text-parchment'"
        >
          {{ link.label }}
        </RouterLink>
      </nav>

      <RouterLink
        :to="auth.isAuthenticated ? '/' : '/login'"
        class="rounded-md border border-gold/40 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-ink-dark"
      >
        {{ auth.isAuthenticated ? 'Tableau de bord' : 'Espace admin' }}
      </RouterLink>
    </div>

    <nav class="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors"
        :class="isActive(link.to) ? 'text-gold font-medium' : 'text-parchment/70 hover:text-parchment'"
      >
        {{ link.label }}
      </RouterLink>
    </nav>
  </header>
</template>
