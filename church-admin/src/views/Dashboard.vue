<script setup>
import { ref, onMounted } from 'vue'
import { ChurchesAPI, EcclesiasticalTitlesAPI } from '../services/api'
import StatCard from '../components/StatCard.vue'

const loading = ref(true)
const error = ref('')

const stats = ref({
  churches: null,
  churchesActive: null,
  ecclesiasticalTitles: null,
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
    ])

    const [churches, eccTitles] = results

    if (churches.status === 'fulfilled') {
      const list = unwrap(churches.value.data)
      stats.value.churches = list.length
      stats.value.churchesActive = list.filter(
        (c) => (c.status || '').toLowerCase() === 'active' || (c.status || '').toLowerCase() === 'actif'
      ).length
    } else {
      stats.value.churches = null
    }

    stats.value.ecclesiasticalTitles = eccTitles.status === 'fulfilled' ? unwrap(eccTitles.value.data).length : null

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
        <p class="mt-1 text-sm text-ink/55">Résumé des églises enregistrées dans le registre.</p>
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
    </div>

    <div class="mt-10">
      <h2 class="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">Actions rapides</h2>
      <div class="flex flex-wrap gap-3">
        <RouterLink to="/churches" class="rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink/75 transition hover:border-gold hover:text-ink">
          Gérer les églises →
        </RouterLink>
        <RouterLink to="/churches/new" class="rounded-md border border-rule bg-white px-4 py-2 text-sm text-ink/75 transition hover:border-gold hover:text-ink">
          Ajouter une église →
        </RouterLink>
      </div>
    </div>
  </div>
</template>
