<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import logo from '../assets/logo.png'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

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

// ---- Avatar dropdown (when authenticated) ----
const showDropdown = ref(false)
const avatarRef = ref(null)

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function handleOutside(e) {
  if (showDropdown.value && avatarRef.value && !avatarRef.value.contains(e.target)) {
    showDropdown.value = false
  }
}

onMounted(() => document.addEventListener('click', handleOutside))
onUnmounted(() => document.removeEventListener('click', handleOutside))

// Label du bouton principal selon le rôle
function dashboardLabel() {
  if (auth.isMissionAdmin) return 'Ma Mission'
  if (auth.isChurchAdmin) return 'Mon Église'
  return 'Mon Église'
}

// Route cible selon le rôle
function dashboardRoute() {
  if (auth.isMissionAdmin) return '/admin'
  return '/mon-eglise'
}

function initials() {
  const fn = auth.user?.first_name
  const ln = auth.user?.last_name
  if (fn && ln) return (fn[0] + ln[0]).toUpperCase()
  if (fn) return fn[0].toUpperCase()
  return (auth.user?.member_code?.[0] || 'U').toUpperCase()
}

async function logout() {
  showDropdown.value = false
  await auth.logout()
  toast.info('Déconnecté avec succès')
  router.push({ name: 'portal-home' })
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-white/10 bg-ink/95 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center gap-3">
        <img :src="logo" alt="MECEIPH" class="brand-logo h-9 w-9 object-contain" />
        <div>
          <p class="font-display text-sm leading-tight text-parchment">MECEIPH</p>
          <p class="text-[10px] uppercase tracking-[0.16em] text-gold/80">Mission Évangélique</p>
        </div>
      </RouterLink>

      <!-- Nav links (desktop) -->
      <nav class="hidden items-center gap-1 md:flex">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav-link-anim rounded-md px-3 py-2 text-sm transition-colors"
          :class="isActive(link.to) ? 'text-gold font-medium active' : 'text-parchment/70 hover:text-parchment'"
        >
          {{ link.label }}
        </RouterLink>
      </nav>

      <!-- Right side -->
      <div class="flex items-center gap-3">
        <!-- Not logged in -->
        <RouterLink
          v-if="!auth.isAuthenticated"
          to="/connexion"
          class="rounded-md border border-gold/40 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-ink-dark"
        >
          Connexion
        </RouterLink>

        <!-- Logged in: shortcut button + avatar dropdown -->
        <template v-else>
          <!-- Avatar dropdown (only icon shown — label is inside the dropdown) -->
          <div ref="avatarRef" class="relative">
            <button
              @click="toggleDropdown"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-gold/20 text-sm font-semibold text-gold ring-2 ring-transparent transition hover:ring-gold/50"
              :aria-expanded="showDropdown"
              aria-haspopup="true"
            >
              {{ initials() }}
            </button>

            <!-- Dropdown menu -->
            <transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 translate-y-1 scale-95"
              enter-to-class="opacity-100 translate-y-0 scale-100"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 translate-y-0 scale-100"
              leave-to-class="opacity-0 translate-y-1 scale-95"
            >
              <div
                v-if="showDropdown"
                class="absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-white/10 bg-ink-light shadow-xl"
              >
                <!-- User identity -->
                <div class="border-b border-white/10 px-4 py-3">
                  <p class="truncate text-sm font-medium text-parchment">
                    {{ auth.fullName || auth.user?.member_code || 'Utilisateur' }}
                  </p>
                  <p class="text-xs text-parchment/40">
                    {{ auth.isMissionAdmin ? 'Admin Mission' : auth.isChurchAdmin ? 'Admin Église' : 'Membre' }}
                  </p>
                </div>

                <!-- Actions -->
                <div class="py-1">
                  <!-- Mon Église / Ma Mission -->
                  <RouterLink
                    :to="dashboardRoute()"
                    @click="showDropdown = false"
                    class="flex items-center gap-3 px-4 py-2.5 text-sm text-parchment/70 transition hover:bg-white/5 hover:text-parchment"
                  >
                    <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V10.5z" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    {{ dashboardLabel() }}
                  </RouterLink>

                  <!-- Mon profil -->
                  <RouterLink
                    to="/profile"
                    @click="showDropdown = false"
                    class="flex items-center gap-3 px-4 py-2.5 text-sm text-parchment/70 transition hover:bg-white/5 hover:text-parchment"
                  >
                    <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5">
                      <circle cx="12" cy="8" r="4"/>
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke-linecap="round"/>
                    </svg>
                    Mon profil
                  </RouterLink>

                  <!-- Gestion mot de passe -->
                  <RouterLink
                    to="/password/change"
                    @click="showDropdown = false"
                    class="flex items-center gap-3 px-4 py-2.5 text-sm text-parchment/70 transition hover:bg-white/5 hover:text-parchment"
                  >
                    <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4" stroke-linecap="round"/>
                    </svg>
                    Mot de passe
                  </RouterLink>

                  <!-- Tableau de bord (admins only) -->
                  <RouterLink
                    v-if="auth.canAccessDashboard"
                    to="/admin"
                    @click="showDropdown = false"
                    class="flex items-center gap-3 px-4 py-2.5 text-sm text-parchment/70 transition hover:bg-white/5 hover:text-parchment"
                  >
                    <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5">
                      <rect x="3" y="3" width="7" height="7" rx="1"/>
                      <rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/>
                      <rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                    Tableau de bord
                  </RouterLink>
                </div>

                <!-- Logout -->
                <div class="border-t border-white/10 py-1">
                  <button
                    @click="logout"
                    class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-rust/70 transition hover:bg-white/5 hover:text-rust"
                  >
                    <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Se déconnecter
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </template>
      </div>
    </div>

    <!-- Mobile nav -->
    <nav class="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="nav-link-anim whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors"
        :class="isActive(link.to) ? 'text-gold font-medium active' : 'text-parchment/70 hover:text-parchment'"
      >
        {{ link.label }}
      </RouterLink>
    </nav>
  </header>
</template>
