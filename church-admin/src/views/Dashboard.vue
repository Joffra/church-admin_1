<script setup>
import { ref, onMounted } from 'vue'
import { ChurchesAPI, EcclesiasticalTitlesAPI, MembersAPI, SanctionsAPI } from '../services/api'
import StatCard from '../components/StatCard.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const loading = ref(true)
const error = ref('')

const stats = ref({
  churches: null,
  churchesActive: null,
  ecclesiasticalTitles: null,
  members: null,
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

async function loadStats() {
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
    stats.value.members = members.status === 'fulfilled' ? unwrap(members.value.data).length : null
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

onMounted(loadStats)
</script>

<template>
  <div>
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
      <div>
        <p class="text-xs uppercase tracking-[0.16em] text-gold capitalize">{{ today }}</p>
        <h1 class="mt-1 font-display text-3xl text-ink">Vue d'ensemble</h1>
        <p class="mt-1 text-sm text-ink/55">Résumé du registre MECEIPH.</p>
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
          {{ auth.canManageChurches ? 'Gérer les églises' : 'Voir les églises' }} →
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
  </div>
</template>
