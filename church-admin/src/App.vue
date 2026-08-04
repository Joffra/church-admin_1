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
