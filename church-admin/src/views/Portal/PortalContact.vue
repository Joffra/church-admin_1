<script setup>
import { ref, reactive } from 'vue'
import { PortalAPI } from '../../services/api'

const form = reactive({
  first_name: '',
  last_name: '',
  email: '',
  subject: '',
  message: '',
})

const errors = ref({})
const submitting = ref(false)
const success = ref(false)

function validate() {
  const e = {}
  if (!form.first_name.trim()) e.first_name = 'Le prénom est requis.'
  if (!form.last_name.trim()) e.last_name = 'Le nom est requis.'
  if (!form.subject.trim()) e.subject = 'L\'objet est requis.'
  if (!form.message.trim()) e.message = 'Le message est requis.'
  if (form.message.trim().length > 0 && form.message.trim().length < 10)
    e.message = 'Le message doit contenir au moins 10 caractères.'
  errors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  if (!validate()) return

  submitting.value = true
  success.value = false
  errors.value = {}

  try {
    await PortalAPI.sendContact({ ...form })
    success.value = true
    Object.keys(form).forEach(k => form[k] = '')
  } catch (err) {
    if (err.response?.status === 422 && err.response.data?.errors) {
      errors.value = err.response.data.errors
    } else {
      errors.value = { general: err.response?.data?.message || "Une erreur est survenue. Veuillez réessayer." }
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <!-- Breadcrumb -->
    <p class="text-sm text-ink-dark/40">
      <RouterLink to="/" class="hover:text-gold">Accueil</RouterLink>
      <span class="mx-2">/</span>
      <span class="text-ink-dark/60">Contact</span>
    </p>

    <h1 class="mt-4 font-display text-4xl text-ink-dark">Nous Contacter</h1>
    <p class="mt-2 text-ink-dark/50">
      Une question, une prière ou une demande ? Écrivez-nous, nous vous répondrons dès que possible.
    </p>

    <!-- Success message -->
    <div v-if="success" class="mt-8 rounded-lg border border-sage/30 bg-sage/5 p-6">
      <div class="flex items-start gap-3">
        <svg viewBox="0 0 24 24" class="h-6 w-6 shrink-0 text-sage" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="12" cy="12" r="10" />
        </svg>
        <div>
          <p class="font-medium text-sage">Message envoyé avec succès !</p>
          <p class="mt-1 text-sm text-sage/70">Nous vous contacterons bientôt. Merci de votre patience.</p>
        </div>
      </div>
      <button
        @click="success = false"
        class="mt-4 text-sm font-medium text-sage underline hover:no-underline"
      >
        Envoyer un autre message
      </button>
    </div>

    <!-- Form -->
    <form v-else @submit.prevent="submit" class="mt-8 space-y-5">
      <p v-if="errors.general" class="rounded-lg border border-rust/30 bg-rust/5 p-4 text-sm text-rust">
        {{ errors.general }}
      </p>

      <div class="grid gap-5 sm:grid-cols-2">
        <!-- First name -->
        <div>
          <label class="block text-sm font-medium text-ink-dark">Prénom <span class="text-rust">*</span></label>
          <input
            v-model="form.first_name"
            type="text"
            class="mt-1.5 w-full rounded-md border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink-dark placeholder:text-ink-dark/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            :class="errors.first_name ? 'border-rust/50' : ''"
            placeholder="Votre prénom"
          />
          <p v-if="errors.first_name" class="mt-1 text-xs text-rust">{{ errors.first_name }}</p>
        </div>

        <!-- Last name -->
        <div>
          <label class="block text-sm font-medium text-ink-dark">Nom <span class="text-rust">*</span></label>
          <input
            v-model="form.last_name"
            type="text"
            class="mt-1.5 w-full rounded-md border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink-dark placeholder:text-ink-dark/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            :class="errors.last_name ? 'border-rust/50' : ''"
            placeholder="Votre nom"
          />
          <p v-if="errors.last_name" class="mt-1 text-xs text-rust">{{ errors.last_name }}</p>
        </div>
      </div>

      <!-- Email (optional) -->
      <div>
        <label class="block text-sm font-medium text-ink-dark">Email <span class="text-ink-dark/30">(optionnel)</span></label>
        <input
          v-model="form.email"
          type="email"
          class="mt-1.5 w-full rounded-md border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink-dark placeholder:text-ink-dark/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          placeholder="votre@email.com"
        />
      </div>

      <!-- Subject -->
      <div>
        <label class="block text-sm font-medium text-ink-dark">Objet <span class="text-rust">*</span></label>
        <input
          v-model="form.subject"
          type="text"
          class="mt-1.5 w-full rounded-md border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink-dark placeholder:text-ink-dark/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          :class="errors.subject ? 'border-rust/50' : ''"
          placeholder="Sujet de votre message"
        />
        <p v-if="errors.subject" class="mt-1 text-xs text-rust">{{ errors.subject }}</p>
      </div>

      <!-- Message -->
      <div>
        <label class="block text-sm font-medium text-ink-dark">Message <span class="text-rust">*</span></label>
        <textarea
          v-model="form.message"
          rows="6"
          class="mt-1.5 w-full rounded-md border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink-dark placeholder:text-ink-dark/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold resize-y"
          :class="errors.message ? 'border-rust/50' : ''"
          placeholder="Votre message (minimum 10 caractères)..."
        ></textarea>
        <p v-if="errors.message" class="mt-1 text-xs text-rust">{{ errors.message }}</p>
        <p class="mt-1 text-xs text-ink-dark/30">{{ form.message.length }} / 3000</p>
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="submitting"
        class="inline-flex items-center justify-center rounded-md bg-ink px-6 py-3 text-sm font-semibold text-parchment transition hover:bg-ink-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span v-if="submitting" class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-parchment/30 border-t-parchment"></span>
        {{ submitting ? 'Envoi en cours...' : 'Envoyer le message' }}
      </button>
    </form>
  </div>
</template>
