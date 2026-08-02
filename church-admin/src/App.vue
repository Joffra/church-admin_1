<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SideNav from './components/SideNav.vue'
import PortalNav from './components/PortalNav.vue'
import PortalFooter from './components/PortalFooter.vue'
import AiChatWidget from './components/AiChatWidget.vue'
import ToastContainer from './components/ToastContainer.vue'
import DailyVerseWidget from './components/DailyVerseWidget.vue'
import { useAuthStore } from './stores/auth'
import { setPasswordChangeHandler } from './services/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// Wire up the 403 PASSWORD_CHANGE_REQUIRED interceptor
// When the backend blocks an API call because the user hasn't changed their
// password, we flag it in the store and redirect to the password change page.
onMounted(() => {
  setPasswordChangeHandler(() => {
    auth.flagMustChangePassword()
    if (router.currentRoute.value.name !== 'password-change') {
      router.push({ name: 'password-change' })
    }
  })
})
</script>

<template>
  <!-- Public portal layout (navbar + footer) -->
  <div v-if="route.meta.portal" class="flex min-h-screen flex-col bg-parchment">
    <PortalNav />
    <main class="flex-1">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <PortalFooter />
    <!-- Floating overlays — visible on all portal pages -->
    <DailyVerseWidget />
    <AiChatWidget />
  </div>

  <!-- Standalone public pages (login, password reset) -->
  <div v-else-if="route.meta.public" class="min-h-screen bg-ink">
    <RouterView />
  </div>

  <!-- Admin layout (SideNav) -->
  <div v-else class="flex min-h-screen bg-parchment">
    <SideNav />
    <main class="flex-1 overflow-y-auto">
      <!-- Slim top bar with portal return button -->
      <div class="sticky top-0 z-30 border-b border-rule bg-white/80 px-6 py-2.5 backdrop-blur md:px-10 lg:px-12">
        <RouterLink
          to="/"
          class="inline-flex items-center gap-2 rounded-md border border-rule px-3 py-1.5 text-xs font-medium text-ink/55 transition hover:border-gold hover:text-ink"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Retour au portail web
        </RouterLink>
      </div>

      <!-- Page content -->
      <div class="px-8 py-8 lg:px-12">
        <div class="mx-auto max-w-6xl">
          <RouterView v-slot="{ Component }">
            <Transition name="page" mode="out-in">
              <component :is="Component" />
            </Transition>
          </RouterView>
        </div>
      </div>
    </main>
  </div>
  <!-- Global toast notifications -->
  <ToastContainer />
</template>
