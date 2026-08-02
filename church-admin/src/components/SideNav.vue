<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/logo.png'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

function roleLabel(role) {
  if (role === 'mission_admin') return 'Admin Mission'
  if (role === 'church_admin') return 'Admin Église'
  if (role === 'user') return 'Utilisateur'
  return role || 'Connecté'
}

// Collapsible sections
const passwordExpanded = ref(route.path.startsWith('/password'))

// User info popup
const showUserPopup = ref(false)

const navGroups = computed(() => {
  const groups = [
    {
      label: 'Vue d\'ensemble',
      items: [
        auth.isMissionAdmin
          ? { to: '/admin', label: 'Tableau de bord' }
          : { to: '/mon-eglise', label: 'Mon Église' },
        ...(auth.canAccessDashboard ? [{ to: '/admin', label: 'Tableau de bord' }] : []),
      ].filter((item, i, arr) => i === arr.findIndex(t => t.to === item.to)),
    },
    {
      label: 'Registre',
      items: [
        { to: '/churches', label: 'Églises' },
        ...(auth.canViewMembers
          ? [{ to: '/members', label: 'Membres' }]
          : [{ to: '/profile', label: 'Mon profil' }]
        ),
        ...(auth.isAdmin ? [{ to: '/sanctions', label: 'Sanctions' }] : []),
        { to: '/committees', label: 'Comités' },
      ],
    },
  ]

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
  if (path === '/committees') return route.path.startsWith('/committees')
  if (path === '/users') return route.path.startsWith('/users')
  if (path === '/profile') return route.path === '/profile'
  if (path === '/mon-eglise') return route.path === '/mon-eglise'
  return route.path === path
}

function togglePassword() {
  passwordExpanded.value = !passwordExpanded.value
}

function toggleUserPopup() {
  showUserPopup.value = !showUserPopup.value
}

// Close popup when clicking outside the user section
const userSectionRef = ref(null)
function handleOutsideClick(e) {
  if (showUserPopup.value && userSectionRef.value && !userSectionRef.value.contains(e.target)) {
    showUserPopup.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})

function goToProfile() {
  showUserPopup.value = false
  router.push({ name: 'profile' })
}

function goToPasswordChange() {
  showUserPopup.value = false
  router.push({ name: 'password-change' })
}

function goToPasswordReset() {
  showUserPopup.value = false
  router.push({ name: 'password-reset' })
}

async function onLogout() {
  await auth.logout()
  router.push({ name: 'portal-home' })
}
</script>

<template>
  <aside class="flex w-64 shrink-0 flex-col bg-ink">
    <!-- Logo + Retour portail -->
    <div class="px-6 pt-5 pb-3">
      <div class="flex items-center gap-3">
        <img :src="logo" alt="MECEIPH" class="brand-logo h-9 w-9 object-contain" />
        <div>
          <p class="font-display text-sm leading-tight text-parchment">MECEIPH</p>
          <p class="text-[10px] uppercase tracking-[0.16em] text-gold/80">Administration</p>
        </div>
      </div>
    </div>

    <!-- Retour au portail button -->
    <div class="px-4 pb-3">
      <RouterLink
        to="/"
        class="flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-parchment/60 transition hover:border-gold/40 hover:text-gold"
      >
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Retour au portail
      </RouterLink>
    </div>

    <div class="mx-6 border-t border-white/10"></div>

    <!-- Nav groups -->
    <nav class="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      <div v-for="group in navGroups" :key="group.label">
        <p class="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-parchment/35">
          {{ group.label }}
        </p>
        <ul class="space-y-0.5">
          <li v-for="item in group.items" :key="item.to">
            <RouterLink
              :to="item.to"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
              :class="isActive(item.to)
                ? 'bg-white/10 text-parchment font-medium'
                : 'text-parchment/55 hover:bg-white/5 hover:text-parchment'"
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
    <!-- User section with popup -->
    <div ref="userSectionRef" class="relative px-6 py-4">
      <!-- User popup -->
      <transition name="popup">
        <div
          v-if="showUserPopup"
          class="absolute bottom-full left-4 right-4 mb-2 rounded-lg border border-white/10 bg-ink-light p-4 shadow-xl"
        >
          <div class="flex items-center gap-3 mb-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-semibold text-gold">
              {{ (auth.user?.first_name?.[0] || auth.user?.member_code?.[0] || 'A').toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-parchment">{{ auth.fullName || auth.user?.member_code || 'Utilisateur' }}</p>
              <p class="text-xs text-parchment/40">{{ roleLabel(auth.user?.role) }}</p>
            </div>
          </div>
          <div class="space-y-1 text-xs text-parchment/50">
            <p><span class="text-parchment/30">Code:</span> {{ auth.user?.member_code || '—' }}</p>
            <p><span class="text-parchment/30">Rôle:</span> {{ roleLabel(auth.user?.role) }}</p>
          </div>
          <div class="mt-3 space-y-1 border-t border-white/10 pt-3">
            <button
              @click="goToProfile"
              class="flex w-full items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-parchment/70 transition hover:bg-white/5 hover:text-parchment"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke-linecap="round"/></svg>
              Mon profil
            </button>
            <button
              @click="goToPasswordChange"
              class="flex w-full items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-parchment/70 transition hover:bg-white/5 hover:text-parchment"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke-linecap="round"/></svg>
              Mot de passe
            </button>
            <button
              @click="goToPasswordReset"
              class="flex w-full items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-parchment/70 transition hover:bg-white/5 hover:text-parchment"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Réinitialiser
            </button>
          </div>
        </div>
      </transition>

      <div class="flex items-center gap-3">
        <button
          @click="toggleUserPopup"
          class="flex flex-1 items-center gap-3 text-left transition hover:opacity-80"
        >
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-semibold text-gold">
            {{ (auth.user?.first_name?.[0] || auth.user?.member_code?.[0] || 'A').toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1 text-sm">
            <p class="truncate leading-tight text-parchment/90">
              {{ auth.fullName || auth.user?.member_code || 'Administrateur' }}
            </p>
            <p class="text-xs text-parchment/40">{{ roleLabel(auth.user?.role) }}</p>
          </div>
        </button>
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
    </div>
  </aside>
</template>

<style scoped>
.popup-enter-active,
.popup-leave-active {
  transition: all 0.2s ease;
}
.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
