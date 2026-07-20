<script setup>
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ChurchesAPI, EcclesiasticalTitlesAPI, MembersAPI, SanctionsAPI } from '../services/api'
import StatCard from '../components/StatCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const loading = ref(true)
const error = ref('')

const today = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})

// ---- Admin stats ----
const stats = ref({
  churches: null,
  churchesActive: null,
  ecclesiasticalTitles: null,
  members: null,
  activeSanctions: null,
})

// ---- Regular user data ----
const myProfile = ref(null)
const myChurch = ref(null)
const profileError = ref('')
const churchError = ref('')

function unwrap(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

// ---- Admin dashboard ----
async function loadAdminStats() {
  loading.value = true
  error.value = ''
  try {
    const results = await Promise.allSettled([
      ChurchesAPI.list(),
      EcclesiasticalTitlesAPI.list(),
      MembersAPI.list(),
      SanctionsAPI.list({ status: 'active', per_page: 1 }),
    ])

    const [churches, eccTitles, members, sanctions] = results

    if (churches.status === 'fulfilled') {
      const list = unwrap(churches.value.data)
      stats.value.churches = list.length
      stats.value.churchesActive = list.filter(
        (c) => (c.status || '').toLowerCase() === 'active' || (c.status || '').toLowerCase() === 'actif'
      ).length
    }

    stats.value.ecclesiasticalTitles = eccTitles.status === 'fulfilled' ? unwrap(eccTitles.value.data).length : null
    stats.value.members = members.status === 'fulfilled' ? unwrap(memberss.value.data).length : null
    stats.value.activeSanctions = sanctions.status === 'fulfilled' ? (sanctions.value.data?.meta?.total ?? unwrap(sanctions.value.data).length) : null

    if (results.every((r) => r.status === 'rejected')) {
      error.value = "Impossible de joindre l'API. Vérifiez que le serveur Laravel est lancé."
    }
  } catch (e) {
    error.value = 'Une erreur est survenue lors du chargement du tableau de bord.'
  } finally {
    loading.value = false
  }
}

// ---- Regular user dashboard ----
async function loadUserData() {
  loading.value = true
  const memberId = auth.userMemberId
  const churchId = auth.userChurchId

  const tasks = []

  if (memberId) {
    tasks.push(
      MembersAPI.get(memberId)
        .then(({ data }) => { myProfile.value = data.data ?? data })
        .catch(() => { profileError.value = 'Impossible de charger votre profil.' })
    )
  }

  if (churchId) {
    tasks.push(
      ChurchesAPI.get(churchId)
        .then(({ data }) => { myChurch.value = data.data ?? data })
        .catch(() => { churchError.value = 'Impossible de charger les informations de votre église.' })
    )
  }

  await Promise.allSettled(tasks)
  loading.value = false
}

function getField(obj, field) {
  return obj?.structure?.[field] || obj?.[field] || '—'
}

function getStatus(obj) {
  return obj?.structure?.status || obj?.status || 'active'
}

function formatGender(g) {
  if (!g) return '—'
  const val = g.toLowerCase()
  if (val === 'm' || val === 'homme' || val === 'male') return 'Homme'
  if (val === 'f' || val === 'femme' || val === 'female') return 'Femme'
  return g
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

onMounted(() => {
  if (auth.isAdmin) {
    loadAdminStats()
  } else {
    loadUserData()
  }
})
</script>

<template>
  <div>
    <!-- Header (shared) -->
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
      <div>
        <p class="text-xs uppercase tracking-[0.16em] text-gold capitalize">{{ today }}</p>
        <h1 class="mt-1 font-display text-3xl text-ink">
          {{ auth.isAdmin ? "Vue d'ensemble" : 'Bienvenue' }}
        </h1>
        <p class="mt-1 text-sm text-ink/55">
          {{ auth.isAdmin ? 'Résumé du registre MECEIPH.' : `${auth.fullName || auth.user?.member_code} — ${auth.user?.role || 'Membre'}` }}
        </p>
      </div>
      <button
        v-if="auth.isAdmin"
        @click="loadAdminStats"
        class="rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink/70 transition hover:border-gold hover:text-ink"
      >
        Actualiser
      </button>
    </div>

    <!-- =================== ADMIN DASHBOARD =================== -->
    <template v-if="auth.isAdmin">
      <div v-if="error" class="mb-6 rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
        {{ error }}
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Églises" :value="stats.churches" :loading="loading" hint="Congrégations" accent="gold" />
        <StatCard label="Églises actives" :value="stats.churchesActive" :loading="loading" hint="Statut actif" accent="sage" />
        <StatCard label="Membres" :value="stats.members" :loading="loading" hint="Membres enregistrés" accent="gold" />
        <StatCard label="Sanctions actives" :value="stats.activeSanctions" :loading="loading" hint="Sanctions en cours" accent="rust" />
      </div>

      <div class="mt-10">
        <h2 class="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">Actions rapides</h2>
        <div class="flex flex-wrap gap-3">
          <RouterLink to="/churches" class="rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink/75 transition hover:border-gold hover:text-ink">
            Gérer les églises →
          </RouterLink>
          <RouterLink v-if="auth.canViewMembers" to="/members" class="rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink/75 transition hover:border-gold hover:text-ink">
            Gérer les membres →
          </RouterLink>
          <RouterLink v-if="auth.canManageUsers" to="/users" class="rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink/75 transition hover:border-gold hover:text-ink">
            Gérer les utilisateurs →
          </RouterLink>
          <RouterLink v-if="auth.isAdmin" to="/sanctions" class="rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink/75 transition hover:border-gold hover:text-ink">
            Voir les sanctions →
          </RouterLink>
        </div>
      </div>
    </template>

    <!-- =================== REGULAR USER DASHBOARD =================== -->
    <template v-else>
      <div v-if="loading" class="py-10 text-center text-ink/40">Chargement…</div>

      <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- My Profile Card -->
        <div class="rounded-lg border border-rule bg-white p-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">Mon profil</h2>
            <RouterLink
              v-if="auth.userMemberId"
              :to="{ name: 'member-show', params: { id: auth.userMemberId } }"
              class="text-xs text-gold hover:underline"
            >
              Voir la fiche complète →
            </RouterLink>
          </div>

          <p v-if="profileError" class="text-sm text-rust">{{ profileError }}</p>

          <div v-else-if="myProfile" class="space-y-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 text-sm font-semibold text-gold">
                {{ (myProfile.first_name?.[0] || 'M').toUpperCase() }}
              </div>
              <div>
                <p class="font-medium text-ink">{{ myProfile.first_name }} {{ myProfile.last_name }}</p>
                <p class="text-xs text-ink/50">{{ myProfile.member_code || '—' }}</p>
              </div>
            </div>

            <dl class="grid grid-cols-2 gap-3 pt-2">
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink/40">Téléphone</dt>
                <dd class="mt-0.5 text-sm text-ink">{{ myProfile.phone || '—' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink/40">Email</dt>
                <dd class="mt-0.5 text-sm text-ink">{{ myProfile.email || '—' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink/40">Genre</dt>
                <dd class="mt-0.5 text-sm text-ink">{{ formatGender(myProfile.gender) }}</dd>
              </div>
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink/40">Baptisé</dt>
                <dd class="mt-0.5 text-sm text-ink">{{ myProfile.baptized ? 'Oui' : 'Non' }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- My Church Card -->
        <div class="rounded-lg border border-rule bg-white p-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">Mon église</h2>
            <RouterLink
              v-if="auth.userChurchId"
              :to="{ name: 'church-show', params: { id: auth.userChurchId } }"
              class="text-xs text-gold hover:underline"
            >
              Voir l'église →
            </RouterLink>
          </div>

          <p v-if="churchError" class="text-sm text-rust">{{ churchError }}</p>

          <div v-else-if="myChurch" class="space-y-3">
            <div class="flex items-center gap-2">
              <h3 class="font-display text-xl text-ink">{{ getField(myChurch, 'name') }}</h3>
              <StatusBadge :status="getStatus(myChurch)" />
            </div>

            <dl class="grid grid-cols-2 gap-3 pt-2">
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink/40">Adresse</dt>
                <dd class="mt-0.5 text-sm text-ink">{{ myChurch.address || '—' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink/40">Téléphone</dt>
                <dd class="mt-0.5 text-sm text-ink">{{ getField(myChurch, 'phone') }}</dd>
              </div>
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink/40">Email</dt>
                <dd class="mt-0.5 text-sm text-ink">{{ getField(myChurch, 'email') }}</dd>
              </div>
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink/40">Pasteur</dt>
                <dd class="mt-0.5 text-sm text-ink">
                  {{ myChurch.pastor ? `${myChurch.pastor.first_name ?? ''} ${myChurch.pastor.last_name ?? ''}`.trim() : '—' }}
                </dd>
              </div>
            </dl>
          </div>

          <div v-else-if="!auth.userChurchId" class="py-4 text-center text-sm text-ink/40">
            Aucune église rattachée à votre compte.
          </div>
        </div>
      </div>

      <!-- Quick links for regular users -->
      <div class="mt-8">
        <h2 class="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">Navigation</h2>
        <div class="flex flex-wrap gap-3">
          <RouterLink to="/churches" class="rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink/75 transition hover:border-gold hover:text-ink">
            Annuaire des églises →
          </RouterLink>
          <RouterLink
            v-if="auth.userMemberId"
            :to="{ name: 'member-show', params: { id: auth.userMemberId } }"
            class="rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink/75 transition hover:border-gold hover:text-ink"
          >
            Mon profil →
          </RouterLink>
        </div>
      </div>
    </template>
  </div>
</template>
