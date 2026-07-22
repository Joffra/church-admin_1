<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { SanctionsAPI } from '../../services/api'

const router = useRouter()
const sanctions = ref([])
const loading = ref(true)
const error = ref('')

// ---- Search & Filters ----
const search = ref('')
const statusFilter = ref(null) // null (Toutes), 'active' (Actives), 'lifted' (Levées)

// ---- Pagination ----
const currentPage = ref(1)
const perPage = ref(15)
const totalPages = ref(1)
const totalRecords = ref(0)

// Simple JS debounce timeout reference
let debounceTimeout = null

// ---- Loading Data ----
async function loadSanctions() {
  loading.value = true
  error.value = ''
  try {
    const params = {
      page: currentPage.value,
      per_page: perPage.value,
    }
    
    if (search.value.trim()) {
      params.search = search.value.trim()
    }
    
    if (statusFilter.value !== null) {
      params.status = statusFilter.value
    }

    const { data } = await SanctionsAPI.list(params)
    
    // Support standard paginated formats safely
    const unwrappedData = data?.data || []
    const unwrappedMeta = data?.meta || {}

    sanctions.value = unwrappedData
    
    currentPage.value = unwrappedMeta.current_page || 1
    totalPages.value = unwrappedMeta.last_page || 1
    totalRecords.value = unwrappedMeta.total || unwrappedData.length
  } catch (e) {
    error.value = e.response?.data?.message || 'Impossible de charger les sanctions.'
  } finally {
    loading.value = false
  }
}

// Debounce search inputs to limit server requests
function onSearchInput() {
  currentPage.value = 1
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    loadSanctions()
  }, 300)
}

// Handle switching status filter tabs
function setStatusFilter(status) {
  statusFilter.value = status
  currentPage.value = 1
  loadSanctions()
}

// Handle page navigation
function changePage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadSanctions()
}

// ---- Formatting & Helpers ----
function memberName(member) {
  if (!member) return 'Membre inconnu'
  const title = member.ecclesiastical_title ? `${member.ecclesiastical_title} ` : ''
  return `${title}${member.first_name} ${member.last_name}`
}

function truncate(str, max = 50) {
  if (!str) return '—'
  return str.length > max ? str.slice(0, max) + '…' : str
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatEndsAt(dateStr) {
  if (!dateStr) return 'Indéterminée'
  return formatDate(dateStr)
}

function goMember(memberId) {
  if (memberId) {
    router.push(`/members/${memberId}`)
  }
}

// Calculate smart pagination window (max 5 buttons visible)
const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = start + maxVisible - 1
  if (end > totalPages.value) {
    end = totalPages.value
    start = Math.max(1, end - maxVisible + 1)
  }
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

onMounted(loadSanctions)
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-8 border-b border-rule pb-6">
      <p class="text-xs uppercase tracking-[0.16em] text-gold">Registre</p>
      <h1 class="mt-1 font-display text-3xl text-ink-dark">Sanctions</h1>
      <p class="mt-1 text-sm text-ink-dark/55">Historique des sanctions disciplinaires.</p>
    </div>

    <!-- Filters & Search Bar -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <!-- Search Input -->
      <div class="w-full sm:w-auto">
        <input
          v-model="search"
          @input="onSearchInput"
          type="text"
          placeholder="Rechercher par motif, membre…"
          class="w-full max-w-sm rounded-md border border-rule bg-white px-3.5 py-2 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold sm:w-72"
        />
      </div>

      <!-- Status Filter Tabs -->
      <div class="flex self-start rounded-md border border-rule bg-white p-1 sm:self-auto">
        <button
          @click="setStatusFilter(null)"
          class="rounded-md px-3.5 py-1.5 text-xs font-medium transition"
          :class="statusFilter === null
            ? 'bg-gold text-ink-dark font-semibold'
            : 'text-ink-dark/60 hover:text-ink-dark'"
        >
          Toutes
        </button>
        <button
          @click="setStatusFilter('active')"
          class="rounded-md px-3.5 py-1.5 text-xs font-medium transition"
          :class="statusFilter === 'active'
            ? 'bg-gold text-ink-dark font-semibold'
            : 'text-ink-dark/60 hover:text-ink-dark'"
        >
          Actives
        </button>
        <button
          @click="setStatusFilter('lifted')"
          class="rounded-md px-3.5 py-1.5 text-xs font-medium transition"
          :class="statusFilter === 'lifted'
            ? 'bg-gold text-ink-dark font-semibold'
            : 'text-ink-dark/60 hover:text-ink-dark'"
        >
          Levées
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <p v-if="error" class="mb-4 rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
      {{ error }}
    </p>

    <!-- Sanctions Table -->
    <div class="overflow-hidden rounded-lg border border-rule bg-white">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-rule bg-parchment-dark/40 text-[11px] uppercase tracking-wide text-ink-dark/45">
            <th class="px-5 py-3 font-semibold">Membre</th>
            <th class="px-5 py-3 font-semibold">Motif</th>
            <th class="px-5 py-3 font-semibold">Description</th>
            <th class="px-5 py-3 font-semibold">Date début</th>
            <th class="px-5 py-3 font-semibold">Date fin</th>
            <th class="px-5 py-3 font-semibold">Statut</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading State -->
          <tr v-if="loading">
            <td colspan="6" class="px-5 py-10 text-center text-ink-dark/40">Chargement…</td>
          </tr>
          <!-- Empty State -->
          <tr v-else-if="!sanctions.length">
            <td colspan="6" class="px-5 py-10 text-center text-ink-dark/40">Aucune sanction trouvée.</td>
          </tr>
          <!-- Table Rows -->
          <tr
            v-else
            v-for="sanction in sanctions"
            :key="sanction.id"
            class="border-b border-rule last:border-0 hover:bg-parchment/60"
          >
            <!-- Membre cell clickable -> /members/:id -->
            <td class="cursor-pointer px-5 py-3.5" @click="goMember(sanction.member?.id)">
              <div class="font-medium text-ink-dark hover:text-gold transition">
                {{ memberName(sanction.member) }}
              </div>
              <div class="text-[11px] text-ink-dark/40 tracking-wide mt-0.5">
                {{ sanction.member?.member_code || '—' }}
              </div>
            </td>
            <!-- Motif -->
            <td class="px-5 py-3.5 font-medium text-ink-dark">
              {{ sanction.reason || '—' }}
            </td>
            <!-- Description (truncated) -->
            <td class="px-5 py-3.5 text-ink-dark/60 max-w-xs" :title="sanction.description">
              {{ truncate(sanction.description) }}
            </td>
            <!-- Date debut -->
            <td class="px-5 py-3.5 text-ink-dark/60 whitespace-nowrap">
              {{ formatDate(sanction.started_at) }}
            </td>
            <!-- Date fin -->
            <td class="px-5 py-3.5 text-ink-dark/60 whitespace-nowrap">
              {{ formatEndsAt(sanction.ends_at) }}
            </td>
            <!-- Statut badge -->
            <td class="px-5 py-3.5">
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
                :class="sanction.is_active ? 'bg-sage/10 text-sage' : 'bg-rust/10 text-rust'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="sanction.is_active ? 'bg-sage' : 'bg-rust'"></span>
                {{ sanction.is_active ? 'Active' : 'Levée' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Server-Side Pagination -->
    <div v-if="!loading && sanctions.length > 0" class="mt-4 flex items-center justify-between">
      <p class="text-xs text-ink-dark/45">
        {{ (currentPage - 1) * perPage + 1 }}–{{ Math.min(currentPage * perPage, totalRecords) }} sur {{ totalRecords }}
      </p>
      
      <div class="flex gap-1" v-if="totalPages > 1">
        <!-- Previous Page Button -->
        <button
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="rounded-md border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:border-gold hover:text-ink-dark disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink-dark/60"
        >
          ← Précédent
        </button>
        
        <!-- Visible Page Selection Buttons -->
        <div class="flex gap-1">
          <button
            v-for="p in visiblePages"
            :key="p"
            @click="changePage(p)"
            class="h-[30px] w-[30px] rounded-md border px-2 py-1.5 text-xs font-medium transition"
            :class="p === currentPage
              ? 'border-gold bg-gold/10 text-ink-dark font-semibold'
              : 'border-rule bg-white text-ink-dark/60 hover:border-gold hover:text-ink-dark'"
          >
            {{ p }}
          </button>
        </div>
        
        <!-- Next Page Button -->
        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="rounded-md border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:border-gold hover:text-ink-dark disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink-dark/60"
        >
          Suivant →
        </button>
      </div>
    </div>
  </div>
</template>
