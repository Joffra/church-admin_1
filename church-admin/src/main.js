import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Global error handler — catches unhandled component errors
app.config.errorHandler = (err, instance, info) => {
  console.error('Unhandled Vue error:', err, info)
}

app.mount('#app')

// After mount: re-validate the session from the backend
// and listen for token-expired events from the axios interceptor
const auth = useAuthStore()
auth.initAuth()

// When the 401 interceptor fires, sync Pinia state and redirect to login
window.addEventListener('auth:expired', () => {
  auth.handleTokenExpired()
  if (router.currentRoute.value.name !== 'login') {
    router.push({ name: 'login' })
  }
})
