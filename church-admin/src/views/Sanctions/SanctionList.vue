<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { SanctionsAPI } from '../../services/api'

const sanctions = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const statusFilter = ref(null) // null = toutes, 'active' = actives, 'lifted' = levées

// ---- Pagination ----
const currentPage = ref(1)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0
})

const startItem = computed(() => {
  if (!pagination.value.total) return 0
  return (currentPage.value - 1) * pagination.value.per_page + 1
})

const endItem = computed(() => {
  if (!pagination.value.total) return 0
  return Math.min(currentPage.value * pagination.value.per_page, pagination.value.total)
})

const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  const total = pagination.value.last_page
  if (total <= maxVisible) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    let start = Math.max(1, currentPage.value - 2)
    let end = Math.min(total, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    for (let i = start; i <= end; i++) pages.push(i)
  }
  return pages
})

// ---- Date Formatting ----
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

// ---- Status Badges ----
function getSanctionBadge(sanction) {
  if (sanction.lifted_at) {
    return {
      label: 'Levée',
      class: 'text-sage bg-sage/10 border border-sage/40'
    }
  }
  if (sanction.is_active) {
    return {
      label: 'Active',
      class: 'text-rust bg-rust/10 border border-rust/40'
    }
  }
  if (sanction.ends_at && new Date(sanction.ends_at) < new Date()) {
    return {
      label: 'Expirée',
      class: 'text-amber-700 bg-amber-50 border border-amber-200'
    }
  }
  return {
    label: 'Inactive',
    class: 'text-ink-dark/45 bg-ink-dark/5 border border-rule'
  }
}

// ---- API loading ----
async function loadSanctions() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await SanctionsAPI.list({
      status: statusFilter.value,
      search: search.value.trim() || undefined,
      page: currentPage.value,
      per_page: 15
    })
    sanctions.value = data?.data || []
    pagination.value = data?.meta || {
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: 0
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Impossible de charger les sanctions disciplinaires.'
  } finally {
    loading.value = false
  }
}

// ---- Event Handlers ----
function setStatusFilter(status) {
  statusFilter.value = status
  currentPage.value = 1
  loadSanctions()
}

let searchTimeout = null
function onSearchInput() {
  currentPage.value = 1
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadSanctions()
  }, 350)
}

function setPage(page) {
  if (page < 1 || page > pagination.value.last_page) return
  currentPage.value = page
  loadSanctions()
}

onMounted(loadSanctions)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-8 border-b border-rule pb-6">
      <p class="text-xs uppercase tracking-[0.16em] text-gold">Registre</p>
      <h1 class="mt-1 font-display text-3xl text-ink-dark">Sanctions</h1>
      <p class="mt-1 text-sm text-ink-dark/55">Suivi des sanctions disciplinaires.</p>
    </div>

    <!-- Filters & Search Bar -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <!-- Filter Tabs -->
      <div class="flex gap-2">
        <button
          @click="setStatusFilter(null)"
          class="rounded-md px-4 py-2 text-sm font-medium transition cursor-pointer"
          :class="statusFilter === null
            ? 'bg-gold text-ink-dark font-semibold'
            : 'border border-rule bg-white text-ink-dark/70 hover:border-gold hover:text-ink-dark'"
        >
          Toutes
        </button>
        <button
          @click="setStatusFilter('active')"
          class="rounded-md px-4 py-2 text-sm font-medium transition cursor-pointer"
          :class="statusFilter === 'active'
            ? 'bg-gold text-ink-dark font-semibold'
            : 'border border-rule bg-white text-ink-dark/70 hover:border-gold hover:text-ink-dark'"
        >
          Actives
        </button>
        <button
          @click="setStatusFilter('lifted')"
          class="rounded-md px-4 py-2 text-sm font-medium transition cursor-pointer"
          :class="statusFilter === 'lifted'
            ? 'bg-gold text-ink-dark font-semibold'
            : 'border border-rule bg-white text-ink-dark/70 hover:border-gold hover:text-ink-dark'"
        >
          Levées
        </button>
      </div>

      <!-- Search Input -->
      <input
        v-model="search"
        @input="onSearchInput"
        type="text"
        placeholder="Rechercher par membre ou motif…"
        class="w-full max-w-sm rounded-md border border-rule bg-white px-3.5 py-2 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold sm:w-72"
      />
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mb-6 rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
      {{ error }}
    </div>

    <!-- Table Container -->
    <div class="overflow-hidden rounded-lg border border-rule bg-white">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-rule bg-parchment-dark/40 text-[11px] uppercase tracking-wide text-ink-dark/45">
            <th class="px-5 py-3 font-semibold">Membre</th>
            <th class="px-5 py-3 font-semibold">Motif</th>
            <th class="px-5 py-3 font-semibold">Description</th>
            <th class="px-5 py-3 font-semibold">Début</th>
            <th class="px-5 py-3 font-semibold">Fin</th>
            <th class="px-5 py-3 font-semibold">Statut</th>
            <th class="px-5 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="px-5 py-10 text-center text-ink-dark/40">Chargement des sanctions…</td>
          </tr>
          <tr v-else-if="!sanctions.length">
            <td colspan="7" class="px-5 py-10 text-center text-ink-dark/40">Aucune sanction enregistrée.</td>
          </tr>
          <tr
            v-else
            v-for="sanction in sanctions"
            :key="sanction.id"
            class="border-b border-rule last:border-0 hover:bg-parchment/60"
          >
            <!-- Membre -->
            <td class="px-5 py-3.5 font-medium text-ink-dark">
              <template v-if="sanction.member">
                <div class="font-semibold">{{ sanction.member.first_name }} {{ sanction.member.last_name }}</div>
                <div class="text-xs text-ink-dark/55 mt-0.5">{{ sanction.member.member_code }}</div>
              </template>
              <template v-else>
                <span class="text-ink-dark/45">—</span>
              </template>
            </td>

            <!-- Motif -->
            <td class="px-5 py-3.5 text-ink-dark font-medium">
              {{ sanction.reason || '—' }}
            </td>

            <!-- Description -->
            <td class="px-5 py-3.5 text-ink-dark/60 max-w-xs truncate" :title="sanction.description || '—'">
              {{ sanction.description || '—' }}
            </td>

            <!-- Début -->
            <td class="px-5 py-3.5 text-ink-dark/60">
              {{ formatDate(sanction.started_at) }}
            </td>

            <!-- Fin -->
            <td class="px-5 py-3.5 text-ink-dark/60">
              {{ formatDate(sanction.ends_at) }}
            </td>

            <!-- Statut -->
            <td class="px-5 py-3.5">
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                :class="getSanctionBadge(sanction).class"
              >
                {{ getSanctionBadge(sanction).label }}
              </span>
            </td>

            <!-- Actions -->
            <td class="px-5 py-3.5 text-right">
              <div class="flex justify-end gap-2" v-if="sanction.member">
                <RouterLink
                  :to="`/members/${sanction.member.id}`"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:bg-parchment-dark hover:text-ink-dark"
                >
                  Voir le membre
                </RouterLink>
              </div>
              <span v-else class="text-ink-dark/45 text-xs">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Server-Side Pagination -->
    <div v-if="!loading && pagination.total > 0" class="mt-4 flex items-center justify-between">
      <p class="text-xs text-ink-dark/45">
        {{ startItem }}–{{ endItem }} sur {{ pagination.total }}
      </p>
      <div class="flex gap-1">
        <button
          @click="setPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="rounded-md border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:border-gold hover:text-ink-dark disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink-dark/60 cursor-pointer disabled:cursor-not-allowed"
        >
          ← Précédent
        </button>
        <div class="flex gap-1">
          <button
            v-for="p in visiblePages"
            :key="p"
            @click="setPage(p)"
            class="h-[30px] w-[30px] rounded-md border px-2 py-1.5 text-xs font-medium transition cursor-pointer"
            :class="p === currentPage
              ? 'border-gold bg-gold/10 text-ink-dark font-semibold'
              : 'border-rule bg-white text-ink-dark/60 hover:border-gold hover:text-ink-dark'"
          >
            {{ p }}
          </button>
        </div>
        <button
          @click="setPage(currentPage + 1)"
          :disabled="currentPage === pagination.last_page"
          class="rounded-md border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:border-gold hover:text-ink-dark disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink-dark/60 cursor-pointer disabled:cursor-not-allowed"
        >
          Suivant →
        </button>
      </div>
    </div>
  </div>
</template>
