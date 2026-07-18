<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { AuthAPI } from '../services/api'

const auth = useAuthStore()

const form = ref({
  current_password: '',
  new_password: '',
  new_password_confirmation: '',
})

const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
const loading = ref(false)
const success = ref('')
const error = ref('')
const fieldErrors = ref({})

async function onSubmit() {
  loading.value = true
  success.value = ''
  error.value = ''
  fieldErrors.value = {}

  try {
    await AuthAPI.changePassword(
      form.value.current_password,
      form.value.new_password,
      form.value.new_password_confirmation,
    )
    success.value = 'Votre mot de passe a été modifié avec succès.'
    form.value = {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    }
  } catch (e) {
    if (e.response?.status === 422 && e.response.data?.errors) {
      fieldErrors.value = e.response.data.errors
      error.value = e.response.data.message || 'Veuillez corriger les champs en erreur.'
    } else if (e.response?.data?.message) {
      error.value = e.response.data.message
    } else {
      error.value = 'Impossible de modifier le mot de passe. Vérifiez votre connexion.'
    }
  } finally {
    loading.value = false
  }
}

// Simple password strength indicator
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
  <div class="max-w-lg">
    <div class="mb-6 border-b border-rule pb-6">
      <p class="text-xs uppercase tracking-[0.16em] text-gold">Sécurité</p>
      <h1 class="mt-1 font-display text-3xl text-ink-dark">Modifier mon mot de passe</h1>
      <p class="mt-2 text-sm text-ink-dark/50">
        Choisissez un mot de passe robuste pour protéger votre compte.
      </p>
    </div>

    <!-- Success banner -->
    <div
      v-if="success"
      class="mb-5 flex items-center gap-2 rounded-md border border-sage/40 bg-sage/10 px-4 py-3 text-sm text-sage"
    >
      <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      {{ success }}
    </div>

    <!-- Error banner -->
    <div
      v-if="error"
      class="mb-5 rounded-md border border-rust/40 bg-rust/10 px-4 py-3 text-sm text-rust"
    >
      {{ error }}
    </div>

    <form class="space-y-5 rounded-lg border border-rule bg-white p-6" @submit.prevent="onSubmit">
      <!-- Current password -->
      <div>
        <label for="current_password" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
          Mot de passe actuel
        </label>
        <div class="relative">
          <input
            id="current_password"
            v-model="form.current_password"
            :type="showCurrent ? 'text' : 'password'"
            autocomplete="current-password"
            required
            :disabled="loading"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 pr-10 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
            placeholder="••••••••"
          />
          <button
            type="button"
            @click="showCurrent = !showCurrent"
            class="absolute inset-y-0 right-0 flex items-center px-3 text-ink-dark/40 hover:text-ink-dark/70"
            tabindex="-1"
          >
            <svg v-if="!showCurrent" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke-linejoin="round" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.6 6.6C4 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.2-.9M17.5 17.5C19.8 15.8 22 12 22 12s-1-2-2.8-3.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
        <p v-if="fieldErrors.current_password" class="mt-1 text-xs text-rust">{{ fieldErrors.current_password[0] }}</p>
      </div>

      <!-- New password -->
      <div>
        <label for="new_password" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
          Nouveau mot de passe
        </label>
        <div class="relative">
          <input
            id="new_password"
            v-model="form.new_password"
            :type="showNew ? 'text' : 'password'"
            autocomplete="new-password"
            required
            :disabled="loading"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 pr-10 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
            placeholder="••••••••"
          />
          <button
            type="button"
            @click="showNew = !showNew"
            class="absolute inset-y-0 right-0 flex items-center px-3 text-ink-dark/40 hover:text-ink-dark/70"
            tabindex="-1"
          >
            <svg v-if="!showNew" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke-linejoin="round" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.6 6.6C4 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.2-.9M17.5 17.5C19.8 15.8 22 12 22 12s-1-2-2.8-3.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
        <!-- Strength indicator -->
        <div v-if="form.new_password" class="mt-2">
          <div class="h-1 w-full overflow-hidden rounded-full bg-rule">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="passwordStrength(form.new_password).color"
              :style="{ width: passwordStrength(form.new_password).width }"
            ></div>
          </div>
          <p class="mt-1 text-xs text-ink-dark/40">{{ passwordStrength(form.new_password).label }}</p>
        </div>
        <p v-if="fieldErrors.new_password" class="mt-1 text-xs text-rust">{{ fieldErrors.new_password[0] }}</p>
      </div>

      <!-- Confirm new password -->
      <div>
        <label for="new_password_confirmation" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
          Confirmer le nouveau mot de passe
        </label>
        <div class="relative">
          <input
            id="new_password_confirmation"
            v-model="form.new_password_confirmation"
            :type="showConfirm ? 'text' : 'password'"
            autocomplete="new-password"
            required
            :disabled="loading"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 pr-10 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
            placeholder="••••••••"
          />
          <button
            type="button"
            @click="showConfirm = !showConfirm"
            class="absolute inset-y-0 right-0 flex items-center px-3 text-ink-dark/40 hover:text-ink-dark/70"
            tabindex="-1"
          >
            <svg v-if="!showConfirm" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke-linejoin="round" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.6 6.6C4 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.2-.9M17.5 17.5C19.8 15.8 22 12 22 12s-1-2-2.8-3.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
        <p v-if="form.new_password_confirmation && form.new_password !== form.new_password_confirmation" class="mt-1 text-xs text-rust">
          Les mots de passe ne correspondent pas.
        </p>
        <p v-if="fieldErrors.new_password_confirmation" class="mt-1 text-xs text-rust">{{ fieldErrors.new_password_confirmation[0] }}</p>
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="loading || (!!form.new_password_confirmation && form.new_password !== form.new_password_confirmation)"
        class="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg v-if="loading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {{ loading ? 'Modification…' : 'Modifier le mot de passe' }}
      </button>
    </form>
  </div>
</template>
