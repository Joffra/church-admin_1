<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/logo.png'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const passwordExpanded = ref(route.path.startsWith('/password'))

// Role label shown in the sidebar footer
const roleLabel = computed(() => {
  const map = {
    mission_admin: 'Admin Mission',
    church_admin:  'Admin Église',
    secretaire:    'Secrétaire',
    utilisateur:   'Utilisateur',
  }
  return map[auth.role] || auth.role || ''
})

// Role-based nav groups
const navGroups = computed(() => {
  const groups = [
    {
      label: 'Vue d\'ensemble',
      items: [
        { to: '/', label: 'Tableau de bord', icon: 'grid' },
      ],
    },
  ]

  // Registre section
  const registreItems = []

  // Churches label depends on role
  if (auth.canManageChurches) {
    registreItems.push({ to: '/churches', label: 'Gérer les églises', icon: 'building' })
  } else {
    registreItems.push({ to: '/churches', label: 'Voir les églises', icon: 'building' })
  }

  // Members label depends on role
  if (auth.canManageMembers) {
    registreItems.push({ to: '/members', label: 'Gérer les membres', icon: 'users' })
  } else {
    registreItems.push({ to: '/members', label: 'Voir les membres', icon: 'users' })
  }

  // Sanctions — admin roles only
  if (auth.canViewSanctions) {
    registreItems.push({ to: '/sanctions', label: 'Sanctions', icon: 'shield' })
  }

  groups.push({ label: 'Registre', items: registreItems })

  // Administration section — admin roles only
  if (auth.canManageUsers) {
    groups.push({
      label: 'Administration',
      items: [
        { to: '/users', label: 'Utilisateurs', icon: 'user-cog' },
      ],
    })
  }

  return groups
})

function isActive(path) {
  if (path === '/churches') return route.path.startsWith('/churches')
  if (path === '/members') return route.path.startsWith('/members')
  if (path === '/users') return route.path.startsWith('/users')
  if (path === '/sanctions') return route.path.startsWith('/sanctions')
  return route.path === path
}

function togglePassword() {
  passwordExpanded.value = !passwordExpanded.value
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
      <!-- Standard nav groups -->
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

      <!-- Sécurité section (collapsible) -->
      <div class="mb-2">
        <p class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-parchment/40">
          Sécurité
        </p>
        <button
          @click="togglePassword"
          class="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
          :class="passwordExpanded
            ? 'bg-white/10 text-parchment font-medium'
            : 'text-parchment/65 hover:bg-white/5 hover:text-parchment'"
        >
          <span
            class="h-1.5 w-1.5 rounded-full transition-colors"
            :class="passwordExpanded ? 'bg-gold' : 'bg-transparent group-hover:bg-gold/50'"
          ></span>
          Mot de passe
          <svg
            viewBox="0 0 24 24"
            class="ml-auto h-3.5 w-3.5 shrink-0 transition-transform"
            :class="passwordExpanded ? 'rotate-180' : ''"
            fill="none" stroke="currentColor" stroke-width="2"
          >
            <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <ul v-if="passwordExpanded" class="mt-0.5 space-y-0.5 pl-4">
          <li>
            <RouterLink
              to="/password/change"
              class="group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
              :class="route.path === '/password/change'
                ? 'bg-white/10 text-parchment font-medium'
                : 'text-parchment/65 hover:bg-white/5 hover:text-parchment'"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-transparent group-hover:bg-gold/50"></span>
              Changer le mot de passe
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>

    <!-- User footer -->
    <div class="mx-6 border-t border-white/10"></div>
    <div class="flex items-center justify-between px-5 py-4">
      <div class="min-w-0">
        <p class="truncate text-sm font-medium text-parchment">{{ auth.fullName }}</p>
        <p class="text-[11px] text-gold/70">{{ roleLabel }}</p>
      </div>
      <button
        @click="onLogout"
        title="Se déconnecter"
        class="ml-3 shrink-0 rounded-md p-1.5 text-parchment/50 transition hover:bg-white/10 hover:text-parchment"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75">
          <path d="M17 16l4-4m0 0l-4-4m4 4H7" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </aside>
</template>
