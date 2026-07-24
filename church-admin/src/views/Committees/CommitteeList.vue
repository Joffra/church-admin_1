<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CommitteesAPI } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const committees = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')

const filtered = computed(() => {
  if (!search.value.trim()) return committees.value
  const q = search.value.toLowerCase().trim()
  return committees.value.filter(c => {
    const name = (c.name || '').toLowerCase()
    const structureName = (c.structure?.name || '').toLowerCase()
    const type = (c.structure?.structurable_type || '').toLowerCase()
    return name.includes(q) || structureName.includes(q) || type.includes(q)
  })
})

function structureLabel(type) {
  if (type === 'mission') return 'Mission'
  if (type === 'church') return 'Église'
  if (type === 'group') return 'Groupe'
  return type || '—'
}

function memberCount(c) {
  return c.members?.length ?? 0
}

async function loadCommittees() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await CommitteesAPI.list()
    committees.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch (e) {
    error.value = e.response?.data?.message || 'Impossible de charger les comités.'
  } finally {
    loading.value = false
  }
}

function goShow(id) {
  router.push({ name: 'committee-show', params: { id } })
}

onMounted(loadCommittees)
</script>

<template>
  <div>
    <div class="mb-8 border-b border-rule pb-6">
      <p class="text-xs uppercase tracking-[0.16em] text-gold">Registre</p>
      <h1 class="mt-1 font-display text-3xl text-ink-dark">Comités</h1>
      <p class="mt-1 text-sm text-ink-dark/55">Gestion des comités et affectation des membres.</p>
    </div>

    <div class="mb-6 flex justify-end">
      <input
        v-model="search"
        type="text"
        placeholder="Rechercher un comité…"
        class="w-full max-w-sm rounded-md border border-rule bg-white px-3.5 py-2 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold sm:w-72"
      />
    </div>

    <div v-if="error" class="mb-6 rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
      {{ error }}
    </div>

    <div class="overflow-hidden rounded-lg border border-rule bg-white">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-rule bg-parchment-dark/40 text-[11px] uppercase tracking-wide text-ink-dark/45">
            <th class="px-5 py-3 font-semibold">Nom du comité</th>
            <th class="px-5 py-3 font-semibold">Structure</th>
            <th class="px-5 py-3 font-semibold">Type</th>
            <th class="px-5 py-3 font-semibold">Membres</th>
            <th class="px-5 py-3 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="px-5 py-10 text-center text-ink-dark/40">Chargement des comités…</td>
          </tr>
          <tr v-else-if="!filtered.length">
            <td colspan="5" class="px-5 py-10 text-center text-ink-dark/40">Aucun comité trouvé.</td>
          </tr>
          <tr
            v-else
            v-for="committee in filtered"
            :key="committee.id"
            class="cursor-pointer border-b border-rule last:border-0 hover:bg-parchment/60"
            @click="goShow(committee.id)"
          >
            <td class="px-5 py-3.5 font-medium text-ink-dark">{{ committee.name || '—' }}</td>
            <td class="px-5 py-3.5 text-ink-dark/60">{{ committee.structure?.name || '—' }}</td>
            <td class="px-5 py-3.5">
              <span class="inline-flex items-center rounded-full bg-gold/10 px-2.5 py-1 text-xs font-medium text-ink-dark/70">
                {{ structureLabel(committee.structure?.structurable_type) }}
              </span>
            </td>
            <td class="px-5 py-3.5 text-ink-dark/60">{{ memberCount(committee) }}</td>
            <td class="px-5 py-3.5 text-right">
              <span class="text-xs font-medium text-ink-dark/50">Voir →</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
