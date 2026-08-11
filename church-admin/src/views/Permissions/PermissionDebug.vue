<script setup>
import { ref, onMounted } from 'vue'
import { PermissionsAPI } from '../../services/api'

const raw = ref(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await PermissionsAPI.list()
    raw.value = data
  } catch (e) {
    error.value = e.response?.data?.message || e.message || 'Erreur'
    raw.value = e.response?.data || null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-6 border-b border-rule pb-6">
      <p class="text-xs uppercase tracking-[0.16em] text-gold">Debug</p>
      <h1 class="mt-1 font-display text-3xl text-ink-dark">Permissions (JSON brut)</h1>
      <p class="mt-2 text-sm text-ink-dark/55">
        Réponse brute de <code class="rounded bg-parchment-dark px-1.5 py-0.5 text-xs">GET /api/permissions</code>
      </p>
    </div>

    <button
      @click="load"
      :disabled="loading"
      class="mb-4 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink-dark transition hover:bg-gold-light disabled:opacity-60"
    >
      {{ loading ? 'Chargement…' : 'Recharger' }}
    </button>

    <div v-if="error" class="mb-4 rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
      {{ error }}
    </div>

    <pre v-if="raw" class="overflow-x-auto rounded-lg border border-rule bg-ink-dark p-5 text-sm text-parchment"><code>{{ JSON.stringify(raw, null, 2) }}</code></pre>
  </div>
</template>
