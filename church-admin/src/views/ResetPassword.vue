<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { AuthAPI } from '../services/api'
import logo from '../assets/logo.png'

const router = useRouter()
const auth = useAuthStore()

// Step 1 = enter email, Step 2 = enter verification code
const step = ref(1)

const email = ref('')
const code = ref('')
const loading = ref(false)
const success = ref('')
const error = ref('')
const fieldErrors = ref({})

const stepTitle = computed(() =>
  step.value === 1 ? 'Réinitialiser mon mot de passe' : 'Vérification du code'
)

const stepDescription = computed(() =>
  step.value === 1
    ? 'Entrez votre adresse email pour recevoir un code de vérification.'
    : `Un code de vérification a été envoyé à ${email.value}. Saisissez-le ci-dessous.`
)

async function onSendCode() {
  loading.value = true
  error.value = ''
  success.value = ''
  fieldErrors.value = {}

  try {
    const { data } = await AuthAPI.sendResetCode(email.value)
    success.value = data.message || 'Code de vérification envoyé par email.'
    step.value = 2
  } catch (e) {
    if (e.response?.status === 422 && e.response.data?.errors) {
      fieldErrors.value = e.response.data.errors
      error.value = e.response.data.message || 'Veuillez corriger les champs en erreur.'
    } else if (e.response?.data?.message) {
      error.value = e.response.data.message
    } else {
      error.value = "Impossible d'envoyer le code. Vérifiez votre connexion."
    }
  } finally {
    loading.value = false
  }
}

async function onVerifyCode() {
  loading.value = true
  error.value = ''
  success.value = ''
  fieldErrors.value = {}

  try {
    const { data } = await AuthAPI.verifyResetCode(email.value, code.value)
    success.value = data.message || 'Votre mot de passe a été réinitialisé. Un mot de passe temporaire vous a été envoyé par email.'
    // The system kills all sessions per the use case — log out locally
    setTimeout(() => {
      auth.logout()
      router.push({ name: 'login' })
    }, 3000)
  } catch (e) {
    if (e.response?.status === 422 && e.response.data?.errors) {
      fieldErrors.value = e.response.data.errors
      error.value = e.response.data.message || 'Veuillez corriger les champs en erreur.'
    } else if (e.response?.data?.message) {
      error.value = e.response.data.message
    } else {
      error.value = 'Code de vérification incorrect ou expiré.'
    }
  } finally {
    loading.value = false
  }
}

function backToStep1() {
  step.value = 1
  code.value = ''
  error.value = ''
  success.value = ''
  fieldErrors.value = {}
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

      <!-- Card -->
      <div class="rounded-lg border border-white/10 bg-ink-light px-7 py-8 shadow-xl">
        <h2 class="font-display text-xl text-parchment">{{ stepTitle }}</h2>
        <p class="mt-1 text-sm text-parchment/50">{{ stepDescription }}</p>

        <!-- Success banner -->
        <div
          v-if="success"
          class="mt-5 flex items-start gap-2 rounded-md border border-sage/40 bg-sage/10 px-4 py-3 text-sm text-sage"
        >
          <svg viewBox="0 0 24 24" class="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>{{ success }}</span>
        </div>

        <!-- Error banner -->
        <div
          v-if="error"
          class="mt-5 rounded-md border border-rust/40 bg-rust/10 px-4 py-3 text-sm text-rust"
        >
          {{ error }}
        </div>

        <!-- Step 1: Email -->
        <form v-if="step === 1 && !success" class="mt-6 space-y-4" @submit.prevent="onSendCode">
          <div>
            <label for="email" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
              Adresse email
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              :disabled="loading"
              class="w-full rounded-md border border-white/15 bg-ink px-3.5 py-2.5 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
              placeholder="votre.email@meceiph.org"
            />
            <p v-if="fieldErrors.email" class="mt-1 text-xs text-rust">{{ fieldErrors.email[0] }}</p>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg v-if="loading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ loading ? 'Envoi…' : 'Envoyer le code' }}
          </button>
        </form>

        <!-- Step 2: Verification code -->
        <form v-if="step === 2 && !success" class="mt-6 space-y-4" @submit.prevent="onVerifyCode">
          <div>
            <label for="code" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/60">
              Code de vérification
            </label>
            <input
              id="code"
              v-model="code"
              type="text"
              inputmode="numeric"
              maxlength="6"
              required
              :disabled="loading"
              class="w-full rounded-md border border-white/15 bg-ink px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.5em] text-parchment placeholder:text-parchment/30 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
              placeholder="000000"
            />
            <p v-if="fieldErrors.code" class="mt-1 text-xs text-rust">{{ fieldErrors.code[0] }}</p>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg v-if="loading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ loading ? 'Vérification…' : 'Vérifier le code' }}
          </button>

          <button
            type="button"
            @click="backToStep1"
            :disabled="loading"
            class="w-full text-center text-xs text-parchment/40 transition hover:text-parchment/70"
          >
            ← Changer d'adresse email
          </button>
        </form>
      </div>

      <p class="mt-6 text-center text-xs text-parchment/30">
        Accès réservé au personnel autorisé de l'administration.
      </p>
    </div>
  </div>
</template>
