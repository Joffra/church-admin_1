<script setup>
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/logo.png'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: 'grid' },
    ],
  },
  {
    label: 'Registry',
    items: [
      { to: '/churches', label: 'Churches', icon: 'building' },
    ],
  },
]

function isActive(path) {
  if (path === '/churches') return route.path.startsWith('/churches')
  return route.path === path
}

async function onLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <aside class="flex h-screen w-64 shrink-0 flex-col bg-ink text-parchment">
    <!-- Logo / brand -->
    <div class="flex items-center gap-3 px-6 py-6">
      <img :src="logo" alt="MECEIPH" class="brand-logo h-9 w-9 object-contain" />
      <div>
        <p class="font-display text-base leading-tight text-parchment">MECEIPH</p>
        <p class="text-[10px] uppercase tracking-[0.16em] text-gold/80">Administration</p>
      </div>
    </div>

    <div class="mx-6 border-t border-white/10"></div>

    <nav class="flex-1 overflow-y-auto px-4 py-5">
      <div v-for="group in navGroups" :key="group.label" class="mb-6">
        <p class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-parchment/40">
          {{ group.label }}
        </p>
        <ul class="space-y-0.5">
          <li v-for="item in group.items" :key="item.to">
            <RouterLink
              :to="item.to"
              class="group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
              :class="isActive(item.to)
                ? 'bg-white/10 text-parchment font-medium'
                : 'text-parchment/65 hover:bg-white/5 hover:text-parchment'"
            >
              <span
                class="h-1.5 w-1.5 rounded-full transition-colors"
                :class="isActive(item.to) ? 'bg-gold' : 'bg-transparent group-hover:bg-gold/50'"
              ></span>
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>

    <div class="mx-6 border-t border-white/10"></div>
    <div class="flex items-center gap-3 px-6 py-5">
      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-semibold text-gold">
        {{ (auth.user?.first_name?.[0] || auth.user?.member_code?.[0] || 'A').toUpperCase() }}
      </div>
      <div class="min-w-0 flex-1 text-sm">
        <p class="truncate leading-tight text-parchment/90">
          {{ auth.fullName || auth.user?.member_code || 'Administrateur' }}
        </p>
        <p class="text-xs text-parchment/40">{{ auth.user?.role || 'Connecté' }}</p>
      </div>
      <button
        @click="onLogout"
        title="Se déconnecter"
        class="shrink-0 rounded-md p-1.5 text-parchment/40 transition hover:bg-white/5 hover:text-gold"
      >
        <svg viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </aside>
</template>

