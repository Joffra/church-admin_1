<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/logo.png'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const member_code = ref('')
const password = ref('')
const showPassword = ref(false)
const submitted = ref(false)

async function onSubmit() {
  submitted.value = true
  const ok = await auth.login(member_code.value.trim(), password.value)
  if (ok) {
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  }
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
