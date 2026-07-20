<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/logo.png'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// Collapsible sections
const passwordExpanded = ref(route.path.startsWith('/password'))

const navGroups = computed(() => {
  const groups = [
    {
      label: 'Vue d\'ensemble',
      items: [
        { to: '/', label: 'Tableau de bord' },
      ],
    },
    {
      label: 'Registre',
      items: [
        // All authenticated users can view church list + details
        { to: '/churches', label: 'Églises' },
        // Admins can browse full member list; regular users see /profile (auth store only — no API call)
        ...(auth.canViewMembers
          ? [{ to: '/members', label: 'Membres' }]
          : [{ to: '/profile', label: 'Mon profil' }]
        ),
        // Only admins can view sanctions
        ...(auth.isAdmin ? [{ to: '/sanctions', label: 'Sanctions' }] : []),
      ],
    },
  ]

  // Administration section only for admins
  if (auth.canManageUsers) {
    groups.push({
      label: 'Administration',
      items: [
        { to: '/users', label: 'Utilisateurs' },
      ],
    })
  }

  return groups
})

function isActive(path) {
  if (path === '/churches') return route.path.startsWith('/churches')
  if (path === '/members') return route.path.startsWith('/members')
  if (path === '/sanctions') return route.path.startsWith('/sanctions')
  if (path === '/users') return route.path.startsWith('/users')
  // /profile: exact match
  if (path === '/profile') return route.path === '/profile'
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
          <li v-for="item in group.items.filter(i => !i.show || i.show())" :key="item.to">
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
          <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3Z" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="flex-1 text-left">Mot de passe</span>
          <svg
            viewBox="0 0 24 24"
            class="h-3.5 w-3.5 transition-transform duration-200"
            :class="passwordExpanded ? 'rotate-90' : ''"
            fill="none" stroke="currentColor" stroke-width="2"
          >
            <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <transition
          enter-active-class="transition-all duration-200 ease-out overflow-hidden"
          leave-active-class="transition-all duration-150 ease-in overflow-hidden"
          enter-from-class="max-h-0 opacity-0"
          enter-to-class="max-h-40 opacity-100"
          leave-from-class="max-h-40 opacity-100"
          leave-to-class="max-h-0 opacity-0"
        >
          <ul v-if="passwordExpanded" class="mt-0.5 ml-7 space-y-0.5 border-l border-white/10 pl-3">
            <li>
              <RouterLink
                to="/password/change"
                class="group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                :class="route.name === 'password-change'
                  ? 'bg-white/10 text-parchment font-medium'
                  : 'text-parchment/55 hover:bg-white/5 hover:text-parchment'"
              >
                <span
                  class="h-1.5 w-1.5 rounded-full transition-colors"
                  :class="route.name === 'password-change' ? 'bg-gold' : 'bg-transparent group-hover:bg-gold/50'"
                ></span>
                Modifier
              </RouterLink>
            </li>
            <li>
              <RouterLink
                to="/password/reset"
                class="group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                :class="route.name === 'password-reset'
                  ? 'bg-white/10 text-parchment font-medium'
                  : 'text-parchment/55 hover:bg-white/5 hover:text-parchment'"
              >
                <span
                  class="h-1.5 w-1.5 rounded-full transition-colors"
                  :class="route.name === 'password-reset' ? 'bg-gold' : 'bg-transparent group-hover:bg-gold/50'"
                ></span>
                Réinitialiser
              </RouterLink>
            </li>
          </ul>
        </transition>
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
