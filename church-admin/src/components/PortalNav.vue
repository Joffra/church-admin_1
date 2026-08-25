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

// ---- Hamburger menu (phone + tablet) ----
const menuOpen = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

// ---- Avatar dropdown (desktop) ----
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

function dashboardLabel() {
  if (auth.isMissionAdmin) return 'Ma Mission'
  if (auth.isChurchAdmin) return 'Mon Église'
  return 'Mon Église'
}

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
  menuOpen.value = false
  await auth.logout()
  toast.info('Déconnecté avec succès')
  router.push({ name: 'portal-home' })
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-white/10 bg-ink/95 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center gap-3" @click="closeMenu">
        <img :src="logo" alt="MECEIPH" class="brand-logo h-9 w-9 object-contain" />
        <div>
          <p class="font-display text-sm leading-tight text-parchment">MECEIPH</p>
          <p class="text-[10px] uppercase tracking-[0.16em] text-gold/80">Mission Évangélique</p>
        </div>
      </RouterLink>

      <!-- Nav links (desktop — lg and up) -->
      <nav class="hidden items-center gap-1 lg:flex">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav-link-anim rounded-md px-3 py-2 text-sm transition-colors"
          :class="isActive(link.to) ? 'text-gold font-medium active hover:text-gold-light transition-colors' : 'text-parchment/70 hover:text-parchment'"
        >
          {{ link.label }}
        </RouterLink>
      </nav>

      <!-- Right side -->
      <div class="flex items-center gap-3">
        <!-- Not logged in: Connexion button (desktop only) -->
        <RouterLink
          v-if="!auth.isAuthenticated"
          to="/connexion"
          class="hidden rounded-md border border-gold/40 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-ink-dark lg:inline-flex"
        >
          Connexion
        </RouterLink>

        <!-- Logged in: avatar dropdown (desktop only) -->
        <template v-else>
          <div ref="avatarRef" class="relative hidden lg:block">
            <button
              @click="toggleDropdown"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-gold/20 text-sm font-semibold text-gold ring-2 ring-transparent transition hover:ring-gold/50"
              :aria-expanded="showDropdown"
              aria-haspopup="true"
            >
              {{ initials() }}
            </button>

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
                <div class="border-b border-white/10 px-4 py-3">
                  <p class="truncate text-sm font-medium text-parchment">
                    {{ auth.fullName || auth.user?.member_code || 'Utilisateur' }}
                  </p>
                  <p class="text-xs text-parchment/40">
                    {{ auth.isMissionAdmin ? 'Admin Mission' : auth.isChurchAdmin ? 'Admin Église' : 'Membre' }}
                  </p>
                </div>

                <div class="py-1">
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

        <!-- Hamburger button (phone + tablet) -->
        <button
          @click="toggleMenu"
          class="rounded-md p-2 text-parchment transition hover:bg-white/10 lg:hidden"
          aria-label="Menu"
          :aria-expanded="menuOpen"
        >
          <svg v-if="!menuOpen" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" />
          </svg>
          <svg v-else class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 6l12 12M6 18L18 6" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Slide-down mobile menu (phone + tablet) -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="menuOpen"
        class="border-t border-white/10 bg-ink-light px-4 py-4 lg:hidden"
      >
        <!-- Nav links -->
        <nav class="flex flex-col gap-1">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            @click="closeMenu"
            class="rounded-md px-3 py-2.5 text-sm transition-colors"
            :class="isActive(link.to) ? 'bg-white/10 text-gold font-medium' : 'text-parchment/70 hover:bg-white/5 hover:text-parchment'"
          >
            {{ link.label }}
          </RouterLink>
        </nav>

        <div class="my-3 border-t border-white/10"></div>

        <!-- Auth section -->
        <div v-if="!auth.isAuthenticated" class="flex flex-col gap-2">
          <RouterLink
            to="/connexion"
            @click="closeMenu"
            class="rounded-md border border-gold/40 px-4 py-2.5 text-center text-sm font-medium text-gold transition hover:bg-gold hover:text-ink-dark"
          >
            Connexion
          </RouterLink>
        </div>

        <div v-else class="flex flex-col gap-1">
          <div class="flex items-center gap-3 px-3 py-2">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-semibold text-gold">
              {{ initials() }}
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-parchment">{{ auth.fullName || auth.user?.member_code || 'Utilisateur' }}</p>
              <p class="text-xs text-parchment/40">
                {{ auth.isMissionAdmin ? 'Admin Mission' : auth.isChurchAdmin ? 'Admin Église' : 'Membre' }}
              </p>
            </div>
          </div>

          <RouterLink
            :to="dashboardRoute()"
            @click="closeMenu"
            class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-parchment/70 transition hover:bg-white/5 hover:text-parchment"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V10.5z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            {{ dashboardLabel() }}
          </RouterLink>

          <RouterLink
            to="/profile"
            @click="closeMenu"
            class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-parchment/70 transition hover:bg-white/5 hover:text-parchment"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke-linecap="round"/>
            </svg>
            Mon profil
          </RouterLink>

          <RouterLink
            v-if="auth.canAccessDashboard"
            to="/admin"
            @click="closeMenu"
            class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-parchment/70 transition hover:bg-white/5 hover:text-parchment"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Tableau de bord
          </RouterLink>

          <button
            @click="logout"
            class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-rust/70 transition hover:bg-white/5 hover:text-rust"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Se déconnecter
          </button>
        </div>
      </div>
    </transition>
  </header>
</template>
