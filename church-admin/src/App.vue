<script setup>
import { onMounted, ref, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SideNav from './components/SideNav.vue'
import PortalNav from './components/PortalNav.vue'
import PortalFooter from './components/PortalFooter.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useAuthStore } from './stores/auth'
import { setPasswordChangeHandler } from './services/api'

// Lazy-load heavy widgets — only loaded on portal pages, not on login/admin
const AiChatWidget = defineAsyncComponent(() => import('./components/AiChatWidget.vue'))
const DailyVerseWidget = defineAsyncComponent(() => import('./components/DailyVerseWidget.vue'))

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// Mobile sidebar drawer
const sidebarOpen = ref(false)

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

  <!-- Admin layout (SideNav + mobile drawer) -->
  <div v-else class="flex min-h-screen bg-parchment">
    <!-- Mobile hamburger -->
    <button
      @click="sidebarOpen = true"
      class="fixed left-4 top-4 z-30 rounded-md border border-rule bg-white p-2 shadow-sm lg:hidden"
      aria-label="Menu"
    >
      <svg class="h-5 w-5 text-ink-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" />
      </svg>
    </button>

    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen"
      @click="sidebarOpen = false"
      class="fixed inset-0 z-40 bg-black/40 lg:hidden"
    ></div>

    <!-- Sidebar — fixed drawer on mobile and desktop -->
    <div
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      class="fixed z-50 h-full transition-transform duration-200 lg:inset-y-0 lg:left-0 lg:h-screen lg:translate-x-0 lg:z-auto"
    >
      <SideNav />
    </div>

    <main class="min-w-0 flex-1 overflow-y-auto lg:ml-64 lg:h-screen">
      <div class="px-4 py-8 pt-16 lg:px-12 lg:pt-8">
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
