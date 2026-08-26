<script setup>
/**
 * LoginPortal.vue — Connexion pour les membres (accès Mon Église)
 * Route: /connexion  (public, meta.public = true)
 * After login: simple users → /mon-eglise  |  admins → /admin
 */
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import logo from '../assets/logo.png'

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()
const route = useRoute()

const member_code = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  const ok = await auth.login(member_code.value.trim(), password.value)
  loading.value = false

  if (ok) {
    if (auth.mustChangePassword) {
      router.push({ name: 'password-change' })
      return
    }
    toast.success('Connecté avec succès')
    // Admins who land here → redirect to admin dashboard
    if (auth.canAccessDashboard) {
      router.push({ name: 'dashboard' })
    } else {
      const redirect = route.query.redirect
      const safe = (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) ? redirect : '/mon-eglise'
      router.push(safe)
    }
  } else {
    error.value = auth.error || 'Code membre ou mot de passe incorrect.'
  }
}
</script>

<template>
  <!-- Portal-themed login — warm parchment bg matching the portal -->
  <div class="flex min-h-screen items-center justify-center bg-parchment px-4">
    <div class="w-full max-w-sm">

      <!-- Logo block -->
      <div class="mb-8 flex flex-col items-center text-center fade-in-up">
        <RouterLink to="/" class="flex flex-col items-center gap-3 group">
          <img :src="logo" alt="MECEIPH" class="h-14 w-14 object-contain transition duration-300 group-hover:scale-105"
               style="filter: none;" />
          <div>
            <p class="font-display text-lg leading-tight text-ink">MECEIPH</p>
            <p class="text-[10px] uppercase tracking-[0.18em] text-gold/90 mt-0.5">Espace membre</p>
          </div>
        </RouterLink>
      </div>

      <!-- Card -->
      <div class="rounded-2xl border border-rule bg-white px-7 py-8 shadow-sm fade-in-up" style="animation-delay:0.1s">
        <h2 class="font-display text-xl text-ink">Connexion</h2>
        <p class="mt-1 text-sm text-ink/55">Accédez à votre espace membre.</p>

        <!-- Error -->
        <div v-if="error" class="mt-4 rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
          {{ error }}
        </div>

        <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
          <!-- Code membre -->
          <div>
            <label for="code" class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">
              Code membre
            </label>
            <input
              id="code"
              v-model="member_code"
              type="text"
              autocomplete="username"
              required
              :disabled="loading"
              placeholder="ex. MEM-00123"
              class="w-full rounded-lg border border-rule bg-parchment px-3.5 py-2.5 text-sm text-ink outline-none transition
                     placeholder:text-ink/30 focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:opacity-60"
            />
          </div>

          <!-- Mot de passe -->
          <div>
            <label for="pw" class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">
              Mot de passe
            </label>
            <div class="relative">
              <input
                id="pw"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                :disabled="loading"
                placeholder="••••••••"
                class="w-full rounded-lg border border-rule bg-parchment px-3.5 py-2.5 pr-10 text-sm text-ink outline-none transition
                       placeholder:text-ink/30 focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:opacity-60"
              />
              <button type="button" @click="showPassword = !showPassword"
                      class="absolute inset-y-0 right-0 flex items-center px-3 text-ink/30 hover:text-ink/70 transition"
                      tabindex="-1">
                <svg v-if="!showPassword" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke-linejoin="round" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.6 6.6C4 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.2-.9M17.5 17.5C19.8 15.8 22 12 22 12s-1-2-2.8-3.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
            <div class="mt-1.5 text-right">
              <RouterLink to="/password/reset" class="text-xs text-gold hover:underline">
                Mot de passe oublié ?
              </RouterLink>
            </div>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="loading"
            class="portal-btn btn-press mt-2 w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-parchment
                   transition disabled:opacity-60"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Connexion…
            </span>
            <span v-else>Se connecter</span>
          </button>
        </form>
      </div>

      <!-- Links -->
      <div class="mt-5 flex items-center justify-between text-xs text-ink/40">
        <RouterLink to="/" class="footer-link flex items-center gap-1.5 hover:text-gold transition">
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Retour au portail
        </RouterLink>
        <RouterLink to="/login" class="footer-link hover:text-gold transition">
          Espace administration →
        </RouterLink>
      </div>

    </div>
  </div>
</template>
