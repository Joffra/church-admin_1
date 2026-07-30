<script setup>
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/logo.png'

const route = useRoute()
const auth = useAuthStore()

const links = [
  { to: '/', label: 'Accueil' },
  { to: '/mission', label: 'Mission' },
  { to: '/eglises', label: 'Églises' },
  { to: '/contact', label: 'Contact' },
]

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-white/10 bg-ink/95 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <RouterLink to="/" class="flex items-center gap-3">
        <img :src="logo" alt="MECEIPH" class="brand-logo h-9 w-9 object-contain" />
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

      <div class="flex items-center gap-2">
        <!-- Login button for unauthenticated users -->
        <RouterLink
          v-if="!auth.isAuthenticated"
          to="/login"
          class="rounded-md border border-gold/40 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-ink-dark"
        >
          Connexion
        </RouterLink>
        <!-- Dashboard button for admins -->
        <RouterLink
          v-else-if="auth.canAccessDashboard"
          to="/admin"
          class="rounded-md border border-gold/40 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-ink-dark"
        >
          Tableau de bord
        </RouterLink>
        <!-- For simple users: show profile access -->
        <RouterLink
          v-else
          to="/profile"
          class="rounded-md border border-gold/40 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-ink-dark"
        >
          Mon profil
        </RouterLink>
      </div>
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
