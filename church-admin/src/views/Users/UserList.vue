<script setup>
import { ref, watch, onMounted } from 'vue'
import { UsersAPI } from '../../services/api'

const users = ref([])
const loading = ref(true)
const error = ref('')
const successMessage = ref('')
const search = ref('')
const currentPage = ref(1)
const perPage = ref(10)
const meta = ref({
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: 10
})

const confirmSuspendId = ref(null)
const suspending = ref(false)

const activatingId = ref(null)

const confirmResetPasswordId = ref(null)
const resettingPassword = ref(false)

async function loadUsers() {
  loading.value = true
  error.value = ''
  try {
    const response = await UsersAPI.list({
      search: search.value,
      page: currentPage.value,
      per_page: perPage.value
    })
    
    users.value = response.data?.data || []
    meta.value = response.data?.meta || {
      current_page: 1,
      last_page: 1,
      total: 0,
      per_page: 10
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Impossible de charger les utilisateurs.'
  } finally {
    loading.value = false
  }
}

let debounceTimeout = null
watch(search, () => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    if (currentPage.value !== 1) {
      currentPage.value = 1
    } else {
      loadUsers()
    }
  }, 350)
})

watch(currentPage, () => {
  loadUsers()
})

async function confirmSuspend(id) {
  suspending.value = true
  error.value = ''
  successMessage.value = ''
  try {
    const { data } = await UsersAPI.suspend(id)
    successMessage.value = data?.message || "L'utilisateur a été suspendu avec succès."
    const user = users.value.find((u) => u.id === id)
    if (user) {
      user.is_active = false
    }
  } catch (e) {
    error.value = e.response?.data?.message || "Impossible de suspendre l'utilisateur."
  } finally {
    suspending.value = false
    confirmSuspendId.value = null
  }
}

async function activateUser(id) {
  activatingId.value = id
  error.value = ''
  successMessage.value = ''
  try {
    const { data } = await UsersAPI.activate(id)
    successMessage.value = data?.message || "L'utilisateur a été activé avec succès."
    const user = users.value.find((u) => u.id === id)
    if (user) {
      user.is_active = true
    }
  } catch (e) {
    error.value = e.response?.data?.message || "Impossible d'activer l'utilisateur."
  } finally {
    activatingId.value = null
  }
}

async function confirmResetPassword(id) {
  resettingPassword.value = true
  error.value = ''
  successMessage.value = ''
  try {
    const { data } = await UsersAPI.resetPassword(id)
    successMessage.value = data?.message || "Le mot de passe de l'utilisateur a été réinitialisé avec succès."
  } catch (e) {
    error.value = e.response?.data?.message || "Impossible de réinitialiser le mot de passe."
  } finally {
    resettingPassword.value = false
    confirmResetPasswordId.value = null
  }
}

function formatRole(role) {
  if (role === 'mission_admin') return 'Admin Mission'
  if (role === 'church_admin') return 'Admin Église'
  return role || '—'
}

onMounted(loadUsers)
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-8 border-b border-rule pb-6">
      <div>
        <p class="text-xs uppercase tracking-[0.16em] text-gold">Administration</p>
        <h1 class="mt-1 font-display text-3xl text-ink-dark">Utilisateurs</h1>
        <p class="mt-1 text-sm text-ink-dark/55">Gestion des comptes utilisateurs.</p>
      </div>
    </div>

    <!-- Search Input -->
    <div class="mb-4">
      <input
        v-model="search"
        type="text"
        placeholder="Rechercher par nom, code membre…"
        class="w-full max-w-sm rounded-md border border-rule bg-white px-3.5 py-2 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold sm:w-72"
      />
    </div>

    <!-- Alerts -->
    <p v-if="error" class="mb-4 rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
      {{ error }}
    </p>

    <div
      v-if="successMessage"
      class="mb-4 flex items-center justify-between rounded-md border border-sage/30 bg-sage/5 px-4 py-3 text-sm text-sage"
    >
      <span>{{ successMessage }}</span>
      <button @click="successMessage = ''" class="text-xs font-semibold hover:underline">
        Fermer
      </button>
    </div>

    <!-- Users Table -->
    <div class="overflow-hidden rounded-lg border border-rule bg-white">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-rule bg-parchment-dark/40 text-[11px] uppercase tracking-wide text-ink-dark/45">
            <th class="px-5 py-3 font-semibold">Nom</th>
            <th class="px-5 py-3 font-semibold">Code membre</th>
            <th class="px-5 py-3 font-semibold">Rôle</th>
            <th class="px-5 py-3 font-semibold">Église</th>
            <th class="px-5 py-3 font-semibold">Statut</th>
            <th class="px-5 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="px-5 py-10 text-center text-ink-dark/40">Chargement…</td>
          </tr>
          <tr v-else-if="!users.length">
            <td colspan="6" class="px-5 py-10 text-center text-ink-dark/40">Aucun utilisateur trouvé.</td>
          </tr>
          <tr
            v-for="user in users"
            :key="user.id"
            class="border-b border-rule last:border-0 hover:bg-parchment/60"
          >
            <!-- Nom -->
            <td class="px-5 py-3.5 font-medium text-ink-dark">
              {{ user.member ? `${user.member.first_name} ${user.member.last_name}` : '—' }}
            </td>
            <!-- Code Membre -->
            <td class="px-5 py-3.5 text-ink-dark/60">
              {{ user.member?.member_code || '—' }}
            </td>
            <!-- Role -->
            <td class="px-5 py-3.5 text-ink-dark/60 font-medium">
              {{ formatRole(user.role) }}
            </td>
            <!-- Eglise -->
            <td class="px-5 py-3.5 text-ink-dark/60">
              {{ user.member?.church?.name || '—' }}
            </td>
            <!-- Statut badge -->
            <td class="px-5 py-3.5">
              <span
                v-if="user.is_active"
                class="inline-flex items-center gap-1.5 rounded-full bg-sage/10 px-2.5 py-1 text-xs font-medium text-sage"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-sage"></span>
                Actif
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1.5 rounded-full bg-rust/10 px-2.5 py-1 text-xs font-medium text-rust"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-rust"></span>
                Suspendu
              </span>
            </td>
            <!-- Actions -->
            <td class="px-5 py-3.5 text-right">
              <div class="flex justify-end gap-2">
                <button
                  v-if="user.is_active"
                  @click="confirmSuspendId = user.id"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-rust transition hover:bg-rust/10"
                >
                  Suspendre
                </button>
                <button
                  v-else
                  @click="activateUser(user.id)"
                  :disabled="activatingId === user.id"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-sage transition hover:bg-sage/10 disabled:opacity-50"
                >
                  {{ activatingId === user.id ? 'Activation…' : 'Activer' }}
                </button>
                <button
                  @click="confirmResetPasswordId = user.id"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:bg-parchment-dark hover:text-ink-dark"
                >
                  Réinitialiser
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && meta.total > meta.per_page" class="mt-4 flex items-center justify-between">
      <p class="text-xs text-ink-dark/45">
        {{ (meta.current_page - 1) * meta.per_page + 1 }}–{{ Math.min(meta.current_page * meta.per_page, meta.total) }} sur {{ meta.total }}
      </p>
      <div class="flex gap-1">
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="rounded-md border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:border-gold hover:text-ink-dark disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink-dark/60"
        >
          ← Précédent
        </button>
        <div class="flex gap-1">
          <button
            v-for="p in meta.last_page"
            :key="p"
            @click="currentPage = p"
            class="h-[30px] w-[30px] rounded-md border px-2 py-1.5 text-xs font-medium transition"
            :class="p === currentPage
              ? 'border-gold bg-gold/10 text-ink-dark'
              : 'border-rule bg-white text-ink-dark/60 hover:border-gold hover:text-ink-dark'"
          >
            {{ p }}
          </button>
        </div>
        <button
          @click="currentPage++"
          :disabled="currentPage === meta.last_page"
          class="rounded-md border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:border-gold hover:text-ink-dark disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink-dark/60"
        >
          Suivant →
        </button>
      </div>
    </div>

    <!-- Confirm suspend modal -->
    <div
      v-if="confirmSuspendId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="confirmSuspendId = null"
    >
      <div class="w-full max-w-sm rounded-lg bg-white p-6">
        <h3 class="font-display text-lg text-ink-dark">Suspendre cet utilisateur ?</h3>
        <p class="mt-2 text-sm text-ink-dark/60">
          L'utilisateur ne pourra plus se connecter à l'application. Ses données resteront conservées dans le système.
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="confirmSuspendId = null"
            class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark"
          >
            Annuler
          </button>
          <button
            :disabled="suspending"
            @click="confirmSuspend(confirmSuspendId)"
            class="rounded-md bg-rust px-4 py-2 text-sm font-semibold text-white transition hover:bg-rust/90 disabled:opacity-60"
          >
            {{ suspending ? 'Suspension…' : 'Suspendre' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm reset password modal -->
    <div
      v-if="confirmResetPasswordId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="confirmResetPasswordId = null"
    >
      <div class="w-full max-w-sm rounded-lg bg-white p-6">
        <h3 class="font-display text-lg text-ink-dark">Réinitialiser le mot de passe ?</h3>
        <p class="mt-2 text-sm text-ink-dark/60">
          Un nouveau mot de passe temporaire sera généré et envoyé à l'adresse e-mail de cet utilisateur.
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="confirmResetPasswordId = null"
            class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark"
          >
            Annuler
          </button>
          <button
            :disabled="resettingPassword"
            @click="confirmResetPassword(confirmResetPasswordId)"
            class="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink-dark transition hover:bg-gold-light disabled:opacity-60"
          >
            {{ resettingPassword ? 'Réinitialisation…' : 'Réinitialiser' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
