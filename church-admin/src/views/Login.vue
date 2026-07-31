<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { AuthAPI } from '../services/api'
import logo from '../assets/logo.png'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const member_code = ref('')
const password = ref('')
const showPassword = ref(false)
const submitted = ref(false)

// ---- Inline password change (must_change_password flow) ----
const showPasswordChange = computed(() => auth.mustChangePassword)
const changeForm = ref({
  current_password: '',
  new_password: '',
  new_password_confirmation: '',
})
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
const changeLoading = ref(false)
const changeSuccess = ref('')
const changeError = ref('')
const changeFieldErrors = ref({})

async function onSubmit() {
  submitted.value = true
  const ok = await auth.login(member_code.value.trim(), password.value)
  if (ok) {
    // If backend says must_change_password, DO NOT redirect — stay on login page
    // and show the inline password change form
    if (auth.mustChangePassword) {
      // Pre-fill current password with what they just typed
      changeForm.value.current_password = password.value
      return
    }

    // If user is a simple user (no admin access), redirect to portal
    if (!auth.canAccessDashboard) {
      router.push({ name: 'portal-home' })
      return
    }

    const redirect = route.query.redirect || '/admin'
    router.push(redirect)
  }
}

async function onChangePassword() {
  changeLoading.value = true
  changeSuccess.value = ''
  changeError.value = ''
  changeFieldErrors.value = {}

  try {
    await AuthAPI.changePassword(
      changeForm.value.current_password,
      changeForm.value.new_password,
      changeForm.value.new_password_confirmation,
    )
    changeSuccess.value = 'Votre mot de passe a été modifié avec succès.'
    changeForm.value = {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    }

    // Clear the forced-change flag
    auth.passwordChanged()

    // Redirect after short delay
    setTimeout(() => {
      if (auth.canAccessDashboard) {
        router.push({ name: 'dashboard' })
      } else {
        router.push({ name: 'portal-home' })
      }
    }, 1200)
  } catch (e) {
    if (e.response?.status === 422 && e.response.data?.errors) {
      changeFieldErrors.value = e.response.data.errors
      changeError.value = e.response.data.message || 'Veuillez corriger les champs en erreur.'
    } else if (e.response?.data?.message) {
      changeError.value = e.response.data.message
    } else {
      changeError.value = 'Impossible de modifier le mot de passe. Vérifiez votre connexion.'
    }
  } finally {
    changeLoading.value = false
  }
}

function passwordStrength(pw) {
  if (!pw) return { label: '', width: '0%', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const levels = [
    { label: 'Faible', width: '25%', color: 'bg-rust' },
    { label: 'Moyen', width: '50%', color: 'bg-rust/70' },
    { label: 'Bon', width: '75%', color: 'bg-sage' },
    { label: 'Fort', width: '100%', color: 'bg-sage' },
  ]
  return levels[Math.max(0, score - 1)] || levels[0]
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-ink px-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="mb-8 flex flex-col items-center text-center">
        <img :src="logo" alt="MECEIPH" class="brand-logo mb-4 h-16 w-16 object-contain" />
        <h1 class="font-display text-xl leading-snug text-parchment">
          Mission Église Croisade Évangélique<br />Internationale de Pêcheurs d'Hommes
        </h1>
        <p class="mt-2 text-xs uppercase tracking-[0.18em] text-gold/90">MECEIPH · Administration</p>
      </div>

      <!-- ====== INLINE PASSWORD CHANGE (must_change_password) ====== -->
      <div v-if="showPasswordChange" class="rounded-lg border border-gold/30 bg-ink-light px-7 py-8 shadow-xl">
        <div class="mb-5 flex items-start gap-3 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
          <svg class="h-5 w-5 shrink-0 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <div>
            <p class="font-medium text-parchment">Modification obligatoire du mot de passe</p>
            <p class="mt-0.5 text-xs text-parchment/60">
              Pour des raisons de sécurité, vous devez changer votre mot de passe avant de continuer.
            </p>
          </div>
        </div>

        <div v-if="changeSuccess" class="mb-5 flex items-center gap-2 rounded-md border border-sage/40 bg-sage/10 px-4 py-3 text-sm text-sage">
          <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ changeSuccess }}
        </div>

        <div v-if="changeError" class="mb-5 rounded-md border border-rust/40 bg-rust/10 px-4 py-3 text-sm text-rust">
          {{ changeError }}
        </div>

        <form v-if="!changeSuccess" class="space-y-4" @submit.prevent="onChangePassword">
          <div>
            <label for="chg_current" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
              Mot de passe actuel
            </label>
            <div class="relative">
              <input
                id="chg_current"
                v-model="changeForm.current_password"
                :type="showCurrent ? 'text' : 'password'"
                autocomplete="current-password"
                required
                :disabled="changeLoading"
                class="w-full rounded-md border border-white/15 bg-ink px-3.5 py-2.5 pr-10 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
                placeholder="••••••••"
              />
              <button type="button" @click="showCurrent = !showCurrent" class="absolute inset-y-0 right-0 flex items-center px-3 text-parchment/40 hover:text-parchment/70" tabindex="-1">
                <svg v-if="!showCurrent" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke-linejoin="round" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.6 6.6C4 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.2-.9M17.5 17.5C19.8 15.8 22 12 22 12s-1-2-2.8-3.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
            <p v-if="changeFieldErrors.current_password" class="mt-1 text-xs text-rust">{{ changeFieldErrors.current_password[0] }}</p>
          </div>

          <div>
            <label for="chg_new" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
              Nouveau mot de passe
            </label>
            <div class="relative">
              <input
                id="chg_new"
                v-model="changeForm.new_password"
                :type="showNew ? 'text' : 'password'"
                autocomplete="new-password"
                required
                :disabled="changeLoading"
                class="w-full rounded-md border border-white/15 bg-ink px-3.5 py-2.5 pr-10 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
                placeholder="••••••••"
              />
              <button type="button" @click="showNew = !showNew" class="absolute inset-y-0 right-0 flex items-center px-3 text-parchment/40 hover:text-parchment/70" tabindex="-1">
                <svg v-if="!showNew" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke-linejoin="round" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.6 6.6C4 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.2-.9M17.5 17.5C19.8 15.8 22 12 22 12s-1-2-2.8-3.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
            <div v-if="changeForm.new_password" class="mt-2">
              <div class="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="passwordStrength(changeForm.new_password).color"
                  :style="{ width: passwordStrength(changeForm.new_password).width }"
                ></div>
              </div>
              <p class="mt-1 text-xs text-parchment/40">{{ passwordStrength(changeForm.new_password).label }}</p>
            </div>
            <p v-if="changeFieldErrors.new_password" class="mt-1 text-xs text-rust">{{ changeFieldErrors.new_password[0] }}</p>
          </div>

          <div>
            <label for="chg_confirm" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
              Confirmer le nouveau mot de passe
            </label>
            <div class="relative">
              <input
                id="chg_confirm"
                v-model="changeForm.new_password_confirmation"
                :type="showConfirm ? 'text' : 'password'"
                autocomplete="new-password"
                required
                :disabled="changeLoading"
                class="w-full rounded-md border border-white/15 bg-ink px-3.5 py-2.5 pr-10 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
                placeholder="••••••••"
              />
              <button type="button" @click="showConfirm = !showConfirm" class="absolute inset-y-0 right-0 flex items-center px-3 text-parchment/40 hover:text-parchment/70" tabindex="-1">
                <svg v-if="!showConfirm" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke-linejoin="round" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.6 6.6C4 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.2-.9M17.5 17.5C19.8 15.8 22 12 22 12s-1-2-2.8-3.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
            <p v-if="changeFieldErrors.new_password_confirmation" class="mt-1 text-xs text-rust">{{ changeFieldErrors.new_password_confirmation[0] }}</p>
          </div>

          <button
            type="submit"
            :disabled="changeLoading"
            class="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg v-if="changeLoading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ changeLoading ? 'Modification…' : 'Changer le mot de passe' }}
          </button>
        </form>

        <!-- Logout option -->
        <button
          v-if="!changeSuccess"
          @click="auth.logout()"
          class="mt-4 w-full text-center text-xs text-parchment/40 transition hover:text-parchment/70"
        >
          Se déconnecter
        </button>
      </div>

      <!-- ====== NORMAL LOGIN FORM ====== -->
      <div v-else class="rounded-lg border border-white/10 bg-ink-light px-7 py-8 shadow-xl">
        <h2 class="font-display text-xl text-parchment">Connexion</h2>
        <p class="mt-1 text-sm text-parchment/50">Entrez vos identifiants pour accéder au registre.</p>

        <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
          <div>
            <label for="member_code" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
              Code membre
            </label>
            <input
              id="member_code"
              v-model="member_code"
              type="text"
              autocomplete="username"
              required
              :disabled="auth.loading"
              class="w-full rounded-md border border-white/15 bg-ink px-3.5 py-2.5 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
              placeholder="ex. MEM-00123"
            />
          </div>

          <div>
            <label for="password" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
              Mot de passe
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                :disabled="auth.loading"
                class="w-full rounded-md border border-white/15 bg-ink px-3.5 py-2.5 pr-10 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
                placeholder="••••••••"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 flex items-center px-3 text-parchment/40 hover:text-parchment/70"
                tabindex="-1"
              >
                <svg v-if="!showPassword" viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke-linejoin="round" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.6 6.6C4 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.2-.9M17.5 17.5C19.8 15.8 22 12 22 12s-1-2-2.8-3.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Mot de passe oublié -->
          <div class="flex justify-end">
            <RouterLink
              to="/password/reset"
              class="text-xs text-gold/80 transition hover:text-gold"
            >
              Mot de passe oublié ?
            </RouterLink>
          </div>

          <p v-if="auth.error" class="rounded-md border border-rust/40 bg-rust/10 px-3 py-2 text-sm text-rust">
            {{ auth.error }}
          </p>

          <button
            type="submit"
            :disabled="auth.loading"
            class="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg v-if="auth.loading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ auth.loading ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>
      </div>

      <p class="mt-6 text-center text-xs text-parchment/30">
        Accès réservé au personnel autorisé de l'administration.
      </p>
    </div>
  </div>
</template>
