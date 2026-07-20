<script setup>
import { ref, watch, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { UsersAPI } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const users = ref([])
const loading = ref(true)
const error = ref('')
const successMessage = ref('')
const search = ref('')

// Pagination state
const currentPage = ref(1)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0
})

// Modal states for user actions
const suspendUser = ref(null)
const activateUser = ref(null)
const resetPasswordUser = ref(null)

const actionLoading = ref(false)

// Debounced fetch of users to prevent unnecessary API queries
let debounceTimeout = null

watch(search, () => {
  currentPage.value = 1
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    fetchUsers()
  }, 350)
})

watch(currentPage, () => {
  fetchUsers()
})

async function fetchUsers() {
  loading.value = true
  error.value = ''
  try {
    const res = await UsersAPI.list({
      search: search.value.trim(),
      page: currentPage.value,
      per_page: 20
    })
    
    // Support potential variations of wrapper objects
    const responseData = res.data ?? res
    users.value = responseData.data || []
    
    pagination.value = responseData.meta || {
      current_page: 1,
      last_page: 1,
      per_page: 20,
      total: responseData.data?.length || 0
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Impossible de charger les comptes utilisateurs.'
  } finally {
    loading.value = false
  }
}

// Helpers for user information
function getAvatarUrl(user) {
  return user?.member?.profile_picture || null
}

function getInitials(user) {
  const fn = user?.member?.first_name?.[0] || ''
  const ln = user?.member?.last_name?.[0] || ''
  return (fn + ln || 'U').toUpperCase()
}

function getUserName(user) {
  if (user?.member) {
    return `${user.member.first_name ?? ''} ${user.member.last_name ?? ''}`.trim() || 'Sans nom'
  }
  return `Utilisateur #${user?.id || ''}`
}

function formatRole(role) {
  if (role === 'mission_admin') return 'Admin Mission'
  if (role === 'church_admin') return 'Admin Église'
  if (role === 'user') return 'Utilisateur'
  return role || '—'
}

// Action Handlers
async function handleSuspend() {
  if (!suspendUser.value) return
  actionLoading.value = true
  error.value = ''
  successMessage.value = ''
  try {
    await UsersAPI.suspend(suspendUser.value.id)
    successMessage.value = `L'utilisateur "${getUserName(suspendUser.value)}" a été suspendu avec succès.`
    suspendUser.value = null
    await fetchUsers()
  } catch (e) {
    error.value = e.response?.data?.message || "Une erreur est survenue lors de la suspension de l'utilisateur."
  } finally {
    actionLoading.value = false
  }
}

async function handleActivate() {
  if (!activateUser.value) return
  actionLoading.value = true
  error.value = ''
  successMessage.value = ''
  try {
    await UsersAPI.activate(activateUser.value.id)
    successMessage.value = `L'utilisateur "${getUserName(activateUser.value)}" a été activé avec succès.`
    activateUser.value = null
    await fetchUsers()
  } catch (e) {
    error.value = e.response?.data?.message || "Une erreur est survenue lors de l'activation de l'utilisateur."
  } finally {
    actionLoading.value = false
  }
}

async function handleResetPassword() {
  if (!resetPasswordUser.value) return
  actionLoading.value = true
  error.value = ''
  successMessage.value = ''
  try {
    const res = await UsersAPI.resetPassword(resetPasswordUser.value.id)
    successMessage.value = res.data?.message || `Le mot de passe de "${getUserName(resetPasswordUser.value)}" a été réinitialisé avec succès.`
    resetPasswordUser.value = null
    await fetchUsers()
  } catch (e) {
    error.value = e.response?.data?.message || "Une erreur est survenue lors de la réinitialisation du mot de passe."
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
      <div>
        <p class="text-xs uppercase tracking-[0.16em] text-gold font-semibold">Administration</p>
        <h1 class="mt-1 font-display text-3xl text-ink-dark">Utilisateurs</h1>
        <p class="mt-1 text-sm text-ink-dark/55">
          Gestion des comptes utilisateurs
          <span v-if="!auth.isMissionAdmin && auth.userChurchId" class="text-gold font-medium">
            de votre paroisse.
          </span>
          <span v-else-if="auth.isMissionAdmin" class="text-gold font-medium">
            de l'ensemble de la mission.
          </span>
        </p>
      </div>
    </div>

    <!-- Toolbar: Search Input -->
    <div class="mb-6 flex items-center justify-between gap-4">
      <div class="relative w-full max-w-sm sm:w-72">
        <input
          v-model="search"
          type="text"
          placeholder="Rechercher par nom, code membre…"
          class="w-full rounded-md border border-rule bg-white px-3.5 py-2 text-sm text-ink-dark placeholder-ink-dark/40 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
        />
        <span
          v-if="search"
          @click="search = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-ink-dark/40 hover:text-ink-dark text-xs font-bold"
          title="Effacer la recherche"
        >
          ✕
        </span>
      </div>
    </div>

    <!-- Alert Banners -->
    <div
      v-if="error"
      class="rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust flex justify-between items-center"
    >
      <span class="font-medium">{{ error }}</span>
      <button @click="error = ''" class="text-rust/70 hover:text-rust text-xs font-bold ml-2">✕</button>
    </div>

    <div
      v-if="successMessage"
      class="rounded-md border border-sage/30 bg-sage/5 px-4 py-3 text-sm text-sage flex justify-between items-center"
    >
      <span class="font-medium">{{ successMessage }}</span>
      <button @click="successMessage = ''" class="text-sage/70 hover:text-sage text-xs font-bold ml-2">✕</button>
    </div>

    <!-- Table Container -->
    <div class="overflow-hidden rounded-lg border border-rule bg-white shadow-sm">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="bg-parchment-dark/40 text-[11px] uppercase tracking-wide text-ink-dark/45 border-b border-rule">
            <th class="px-5 py-3 font-semibold">Code membre</th>
            <th class="px-5 py-3 font-semibold">Nom</th>
            <th class="px-5 py-3 font-semibold">Rôle</th>
            <th class="px-5 py-3 font-semibold">Église</th>
            <th class="px-5 py-3 font-semibold">Statut</th>
            <th class="px-5 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading State -->
          <tr v-if="loading">
            <td colspan="6" class="px-5 py-10 text-center text-ink-dark/40">Chargement des utilisateurs…</td>
          </tr>
          
          <!-- Empty State -->
          <tr v-else-if="!users.length">
            <td colspan="6" class="px-5 py-10 text-center text-ink-dark/40">Aucun utilisateur trouvé.</td>
          </tr>
          
          <!-- Data Rows -->
          <tr
            v-else
            v-for="user in users"
            :key="user.id"
            class="border-b border-rule last:border-0 hover:bg-parchment/60 transition-colors duration-150"
          >
            <!-- Member Code -->
            <td class="px-5 py-3.5 font-mono text-xs text-ink-dark/60">
              {{ user.member?.member_code || '—' }}
            </td>
            
            <!-- Member Name with Avatar + RouterLink -->
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-3">
                <!-- Profile picture or initials avatar -->
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 border border-rule overflow-hidden">
                  <img
                    v-if="getAvatarUrl(user)"
                    :src="getAvatarUrl(user)"
                    :alt="getUserName(user)"
                    class="h-full w-full object-cover"
                  />
                  <span v-else class="text-sm font-semibold text-gold">
                    {{ getInitials(user) }}
                  </span>
                </div>
                <!-- Name link -->
                <RouterLink
                  v-if="user.member?.id"
                  :to="`/members/${user.member.id}`"
                  class="font-medium text-ink hover:text-gold hover:underline transition-colors"
                >
                  {{ getUserName(user) }}
                </RouterLink>
                <span v-else class="font-medium text-ink-dark/45 italic">
                  {{ getUserName(user) }}
                </span>
              </div>
            </td>
            
            <!-- Role -->
            <td class="px-5 py-3.5 text-ink-dark/75">
              {{ formatRole(user.role) }}
            </td>
            
            <!-- Church Name -->
            <td class="px-5 py-3.5 text-ink-dark/60">
              {{ user.member?.church?.name || '—' }}
            </td>
            
            <!-- Status Badge -->
            <td class="px-5 py-3.5">
              <span
                v-if="user.is_active"
                class="inline-flex items-center gap-1.5 rounded-full bg-sage/10 px-2.5 py-1 text-xs font-medium text-sage border border-sage/20"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-sage"></span>
                Actif
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1.5 rounded-full bg-rust/10 px-2.5 py-1 text-xs font-medium text-rust border border-rust/20"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-rust"></span>
                Suspendu
              </span>
            </td>
            
            <!-- Actions -->
            <td class="px-5 py-3.5 text-right">
              <div class="flex justify-end gap-1.5" v-if="auth.canManageUsers">
                <!-- Suspend/Activate buttons -->
                <button
                  v-if="user.is_active"
                  @click="suspendUser = user"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-rust/80 hover:bg-rust/10 hover:text-rust transition duration-150"
                  title="Suspendre cet utilisateur"
                >
                  Suspendre
                </button>
                <button
                  v-else
                  @click="activateUser = user"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-sage/80 hover:bg-sage/10 hover:text-sage transition duration-150"
                  title="Activer cet utilisateur"
                >
                  Activer
                </button>
                
                <!-- Reset Password -->
                <button
                  @click="resetPasswordUser = user"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-dark/60 hover:bg-parchment-dark hover:text-ink-dark transition duration-150"
                  title="Réinitialiser le mot de passe"
                >
                  Réinitialiser
                </button>
              </div>
              <span v-else class="text-xs text-ink-dark/40 italic">
                Lecture seule
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Server-Side Pagination -->
    <div v-if="!loading && pagination.last_page > 1" class="mt-4 flex items-center justify-between">
      <p class="text-xs text-ink-dark/45">
        Page {{ pagination.current_page }} sur {{ pagination.last_page }} ({{ pagination.total }} utilisateurs au total)
      </p>
      <div class="flex gap-1">
        <!-- Previous Page -->
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="rounded-md border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:border-gold hover:text-ink-dark disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink-dark/60"
        >
          ← Précédent
        </button>
        
        <!-- Page Numbers -->
        <div class="flex gap-1">
          <button
            v-for="p in pagination.last_page"
            :key="p"
            @click="currentPage = p"
            class="h-[30px] w-[30px] rounded-md border px-2 py-1.5 text-xs font-medium transition"
            :class="p === currentPage
              ? 'border-gold bg-gold/10 text-ink-dark font-semibold'
              : 'border-rule bg-white text-ink-dark/60 hover:border-gold hover:text-ink-dark'"
          >
            {{ p }}
          </button>
        </div>
        
        <!-- Next Page -->
        <button
          @click="currentPage++"
          :disabled="currentPage === pagination.last_page"
          class="rounded-md border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:border-gold hover:text-ink-dark disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink-dark/60"
        >
          Suivant →
        </button>
      </div>
    </div>

    <!-- Modals -->

    <!-- Suspend User Confirmation Modal -->
    <div
      v-if="suspendUser"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="suspendUser = null"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-rule">
        <h3 class="font-display text-lg text-ink-dark flex items-center gap-2">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rust/10 text-rust">⚠️</span>
          Suspendre l'utilisateur ?
        </h3>
        <p class="mt-3 text-sm text-ink-dark/60">
          Êtes-vous sûr de vouloir suspendre le compte de <strong>{{ getUserName(suspendUser) }}</strong> ? 
          Cet utilisateur perdra l'accès à la plateforme immédiatement.
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="suspendUser = null"
            :disabled="actionLoading"
            class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark hover:bg-parchment transition"
          >
            Annuler
          </button>
          <button
            :disabled="actionLoading"
            @click="handleSuspend"
            class="rounded-md bg-rust px-4 py-2 text-sm font-semibold text-white transition hover:bg-rust/90 disabled:opacity-60"
          >
            {{ actionLoading ? 'Suspension…' : 'Suspendre' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Activate User Confirmation Modal -->
    <div
      v-if="activateUser"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="activateUser = null"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-rule">
        <h3 class="font-display text-lg text-ink-dark flex items-center gap-2">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sage/10 text-sage">✔️</span>
          Activer l'utilisateur ?
        </h3>
        <p class="mt-3 text-sm text-ink-dark/60">
          Êtes-vous sûr de vouloir réactiver le compte de <strong>{{ getUserName(activateUser) }}</strong> ? 
          L'utilisateur retrouvera l'accès à l'ensemble de ses fonctionnalités autorisées.
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="activateUser = null"
            :disabled="actionLoading"
            class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark hover:bg-parchment transition"
          >
            Annuler
          </button>
          <button
            :disabled="actionLoading"
            @click="handleActivate"
            class="rounded-md bg-sage px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage/90 disabled:opacity-60"
          >
            {{ actionLoading ? 'Activation…' : 'Activer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reset Password Confirmation Modal -->
    <div
      v-if="resetPasswordUser"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="resetPasswordUser = null"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-rule">
        <h3 class="font-display text-lg text-ink-dark flex items-center gap-2">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold">🔑</span>
          Réinitialiser le mot de passe ?
        </h3>
        <p class="mt-3 text-sm text-ink-dark/60">
          Êtes-vous sûr de vouloir réinitialiser le mot de passe de <strong>{{ getUserName(resetPasswordUser) }}</strong> ? 
          Un nouveau mot de passe temporaire sera généré pour cet utilisateur.
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="resetPasswordUser = null"
            :disabled="actionLoading"
            class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark hover:bg-parchment transition"
          >
            Annuler
          </button>
          <button
            :disabled="actionLoading"
            @click="handleResetPassword"
            class="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink-dark transition hover:bg-gold-light disabled:opacity-60"
          >
            {{ actionLoading ? 'Réinitialisation…' : 'Réinitialiser' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
