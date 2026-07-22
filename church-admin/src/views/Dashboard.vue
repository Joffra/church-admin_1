<script setup>
import { ref, onMounted } from 'vue'
import { ChurchesAPI, EcclesiasticalTitlesAPI, MembersAPI, SanctionsAPI } from '../services/api'
import { useAuthStore } from '../stores/auth'
import StatCard from '../components/StatCard.vue'

const auth = useAuthStore()
const loading = ref(true)
const error = ref('')

const stats = ref({
  churches: null,
  churchesActive: null,
  ecclesiasticalTitles: null,
  members: null,
  membersSanctioned: null,
  activeSanctions: null,
})

const today = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})

function unwrap(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function paginatedTotal(payload) {
  // Paginated Laravel response: { data: [...], meta: { total: N } }
  const meta = payload?.meta
  if (meta && typeof meta.total === 'number') return meta.total
  const data = payload?.data
  if (Array.isArray(data)) return data.length
  if (Array.isArray(payload)) return payload.length
  return 0
}

async function loadStats() {
  loading.value = true
  error.value = ''
  try {
    const requests = [
      { key: 'churches', fn: () => ChurchesAPI.list() },
      { key: 'ecclesiasticalTitles', fn: () => EcclesiasticalTitlesAPI.list() },
    ]

    // Members — now paginated, request page 1 with per_page=1 to just get total count
    if (auth.isAuthenticated) {
      requests.push({ key: 'members', fn: () => MembersAPI.list({ per_page: 1, page: 1 }) })
      requests.push({ key: 'membersSanctioned', fn: () => MembersAPI.list({ per_page: 1, page: 1, search: 'sanctioned' }) })
    }

    // Sanctions visible to admins only
    if (auth.isAdmin) {
      requests.push({ key: 'activeSanctions', fn: () => SanctionsAPI.list({ status: 'active', per_page: 1 }) })
    }

    const results = await Promise.allSettled(requests.map((r) => r.fn()))

    results.forEach((result, i) => {
      const key = requests[i].key
      if (result.status !== 'fulfilled') return

      if (key === 'churches') {
        const list = unwrap(result.value.data)
        stats.value.churches = list.length
        stats.value.churchesActive = list.filter(
          (c) => (c.status || '').toLowerCase() === 'active' || (c.status || '').toLowerCase() === 'actif'
        ).length
      } else if (key === 'ecclesiasticalTitles') {
        stats.value.ecclesiasticalTitles = unwrap(result.value.data).length
      } else if (key === 'members') {
        // Now paginated — use meta.total
        stats.value.members = paginatedTotal(result.value.data)
      } else if (key === 'membersSanctioned') {
        // The members search doesn't filter by status directly, so we'll
        // estimate from a full request. Fall back to null if not available.
        // The backend SearchMemberRequest doesn't support status filter,
        // so we skip this stat and derive it from sanctions instead.
        stats.value.membersSanctioned = null
      } else if (key === 'activeSanctions') {
        stats.value.activeSanctions = paginatedTotal(result.value.data)
        // Use active sanctions count as proxy for sanctioned members
        stats.value.membersSanctioned = paginatedTotal(result.value.data)
      }
    })

    const allFailed = results.every((r) => r.status === 'rejected')
    if (allFailed) {
      error.value = "Impossible de joindre l'API. Vérifiez que le serveur Laravel est lancé."
    }
  } catch (e) {
    error.value = 'Une erreur est survenue lors du chargement du tableau de bord.'
  } finally {
    loading.value = false
  }
}

onMounted(loadStats)
</script>

<template>
  <div>
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
      <div>
        <p class="text-xs uppercase tracking-[0.16em] text-gold capitalize">{{ today }}</p>
        <h1 class="mt-1 font-display text-3xl text-ink">Vue d'ensemble</h1>
        <p class="mt-1 text-sm text-ink/55">Résumé du registre ecclésiastique.</p>
      </div>
      <button
        @click="loadStats"
        class="rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink/70 transition hover:border-gold hover:text-ink"
      >
        Actualiser
      </button>
    </div>

    <div v-if="error" class="mb-6 rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
      {{ error }}
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Églises" :value="stats.churches" :loading="loading" hint="Congrégations enregistrées" accent="gold" />
      <StatCard label="Églises actives" :value="stats.churchesActive" :loading="loading" hint="Statut actif" accent="sage" />
      <StatCard label="Titres ecclésiastiques" :value="stats.ecclesiasticalTitles" :loading="loading" hint="Rangs du clergé enregistrés" accent="rust" />
      <StatCard label="Membres" :value="stats.members" :loading="loading" hint="Membres enregistrés" accent="gold" />
      <StatCard label="Membres sanctionnés" :value="stats.membersSanctioned" :loading="loading" hint="Sous sanction active" accent="rust" />
      <StatCard v-if="auth.isAdmin" label="Sanctions actives" :value="stats.activeSanctions" :loading="loading" hint="Sanctions en cours" accent="rust" />
    </div>

    <div class="mt-10">
      <h2 class="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">Actions rapides</h2>
      <div class="flex flex-wrap gap-3">
        <RouterLink to="/churches" class="rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink/75 transition hover:border-gold hover:text-ink">
          Gérer les églises →
        </RouterLink>
        <RouterLink to="/members" class="rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink/75 transition hover:border-gold hover:text-ink">
          Gérer les membres →
        </RouterLink>
        <RouterLink v-if="auth.canManageChurches" to="/churches/new" class="rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink/75 transition hover:border-gold hover:text-ink">
          Ajouter une église →
        </RouterLink>
        <RouterLink v-if="auth.canManageMembers" to="/members/new" class="rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink/75 transition hover:border-gold hover:text-ink">
          Ajouter un membre →
        </RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/users" class="rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink/75 transition hover:border-gold hover:text-ink">
          Gérer les utilisateurs →
        </RouterLink>
      </div>
    </div>
  </div>
</template>
