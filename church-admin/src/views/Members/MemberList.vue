<script setup>
import { ref, watch, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { MembersAPI } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import StatusBadge from '../../components/StatusBadge.vue'

const router = useRouter()
const auth = useAuthStore()

const members = ref([])
const loading = ref(true)
const error = ref('')
const confirmArchiveId = ref(null)
const archiving = ref(false)

// ---- Server-side search & pagination ----
const search = ref('')
const currentPage = ref(1)
const perPage = 15
const total = ref(0)
const lastPage = ref(1)
let searchTimer = null

async function loadMembers() {
  loading.value = true
  error.value = ''
  try {
    const params = {
      page: currentPage.value,
      per_page: perPage,
    }
    if (search.value.trim()) {
      params.search = search.value.trim()
    }
    const { data } = await MembersAPI.list(params)
    // Paginated response: data.data = array, data.meta = { current_page, last_page, total, per_page }
    members.value = data.data ?? data
    const meta = data.meta
    if (meta) {
      currentPage.value = meta.current_page
      lastPage.value = meta.last_page
      total.value = meta.total
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Impossible de charger les membres.'
  } finally {
    loading.value = false
  }
}

// Debounced search — reset to page 1 and reload
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    loadMembers()
  }, 350)
}

function goToPage(p) {
  if (p < 1 || p > lastPage.value || p === currentPage.value) return
  currentPage.value = p
  loadMembers()
}

// Page numbers for pagination buttons (show up to 5 around current page)
function pageNumbers() {
  const pages = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(lastPage.value, currentPage.value + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

function goShow(id) {
  router.push({ name: 'member-show', params: { id } })
}

function goEdit(id) {
  router.push({ name: 'member-edit', params: { id } })
}

function goSanction(id) {
  router.push({ name: 'member-show', params: { id }, query: { action: 'sanction' } })
}

function goTransfer(id) {
  router.push({ name: 'member-show', params: { id }, query: { action: 'transfer' } })
}

async function confirmArchive(id) {
  archiving.value = true
  try {
    await MembersAPI.remove(id)
    // Reload the current page to get updated list
    await loadMembers()
  } catch (e) {
    error.value = e.response?.data?.message || "Impossible d'archiver ce membre."
  } finally {
    archiving.value = false
    confirmArchiveId.value = null
  }
}

onMounted(loadMembers)
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
      <div>
        <p class="text-xs uppercase tracking-[0.16em] text-gold">Registre</p>
        <h1 class="mt-1 font-display text-3xl text-ink-dark">Membres</h1>
        <p class="mt-1 text-sm text-ink-dark/55">Tous les membres enregistrés.</p>
      </div>
      <RouterLink
        v-if="auth.canManageMembers"
        to="/members/new"
        class="rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-ink-dark transition hover:bg-gold-light"
      >
        + Ajouter un membre
      </RouterLink>
    </div>

    <!-- Search Input -->
    <div class="mb-4">
      <input
        v-model="search"
        @input="onSearchInput"
        type="text"
        placeholder="Rechercher par nom, code, email…"
        class="w-full max-w-sm rounded-md border border-rule bg-white px-3.5 py-2 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold sm:w-72"
      />
    </div>

    <!-- Error Display -->
    <p v-if="error" class="mb-4 rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
      {{ error }}
    </p>

    <!-- Table -->
    <div class="overflow-hidden rounded-lg border border-rule bg-white">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-rule bg-parchment-dark/40 text-[11px] uppercase tracking-wide text-ink-dark/45">
            <th class="px-5 py-3 font-semibold">Nom</th>
            <th class="px-5 py-3 font-semibold">Code membre</th>
            <th class="px-5 py-3 font-semibold">Titre</th>
            <th class="px-5 py-3 font-semibold">Église</th>
            <th class="px-5 py-3 font-semibold">Statut</th>
            <th class="px-5 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="px-5 py-10 text-center text-ink-dark/40">Chargement…</td>
          </tr>
          <tr v-else-if="!members.length">
            <td colspan="6" class="px-5 py-10 text-center text-ink-dark/40">Aucun membre trouvé.</td>
          </tr>
          <tr
            v-for="member in members"
            :key="member.id"
            class="cursor-pointer border-b border-rule last:border-0 hover:bg-parchment/60"
            @click="goShow(member.id)"
          >
            <td class="px-5 py-3.5 font-medium text-ink-dark">
              {{ member.first_name }} {{ member.last_name }}
            </td>
            <td class="px-5 py-3.5 text-ink-dark/60">
              {{ member.member_code }}
            </td>
            <td class="px-5 py-3.5 text-ink-dark/60">
              {{ member.ecclesiastical_title || '—' }}
            </td>
            <td class="px-5 py-3.5 text-ink-dark/60">
              {{ member.church?.name || '—' }}
            </td>
            <td class="px-5 py-3.5">
              <StatusBadge :status="member.status" />
            </td>
            <td class="px-5 py-3.5 text-right" @click.stop>
              <div class="flex justify-end gap-2">
                <button
                  @click="goShow(member.id)"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:bg-parchment-dark hover:text-ink-dark"
                >
                  Voir
                </button>
                <button
                  v-if="auth.canManageMembers"
                  @click="goEdit(member.id)"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:bg-parchment-dark hover:text-ink-dark"
                >
                  Modifier
                </button>
                <button
                  v-if="auth.canSanctionMembers && member.status === 'active'"
                  @click="goSanction(member.id)"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50 hover:text-amber-800"
                >
                  Sanctionner
                </button>
                <button
                  v-if="auth.canManageMembers"
                  @click="goTransfer(member.id)"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:bg-parchment-dark hover:text-ink-dark"
                >
                  Transférer
                </button>
                <button
                  v-if="auth.canManageMembers"
                  @click="confirmArchiveId = member.id"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-rust/70 transition hover:bg-rust/10 hover:text-rust"
                >
                  Archiver
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Server-side Pagination -->
    <div v-if="!loading && total > 0" class="mt-4 flex items-center justify-between">
      <p class="text-xs text-ink-dark/45">
        {{ (currentPage - 1) * perPage + 1 }}–{{ Math.min(currentPage * perPage, total) }} sur {{ total }}
      </p>
      <div class="flex gap-1">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="rounded-md border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:border-gold hover:text-ink-dark disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink-dark/60"
        >
          ← Précédent
        </button>
        <div class="flex gap-1">
          <button
            v-for="p in pageNumbers()"
            :key="p"
            @click="goToPage(p)"
            class="h-[30px] w-[30px] rounded-md border px-2 py-1.5 text-xs font-medium transition"
            :class="p === currentPage
              ? 'border-gold bg-gold/10 text-ink-dark'
              : 'border-rule bg-white text-ink-dark/60 hover:border-gold hover:text-ink-dark'"
          >
            {{ p }}
          </button>
        </div>
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === lastPage"
          class="rounded-md border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:border-gold hover:text-ink-dark disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink-dark/60"
        >
          Suivant →
        </button>
      </div>
    </div>

    <!-- Confirm archive modal -->
    <div
      v-if="confirmArchiveId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="confirmArchiveId = null"
    >
      <div class="w-full max-w-sm rounded-lg bg-white p-6">
        <h3 class="font-display text-lg text-ink-dark">Archiver ce membre ?</h3>
        <p class="mt-2 text-sm text-ink-dark/60">
          Le membre ne sera plus visible dans la liste, mais ses données resteront conservées dans le registre.
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="confirmArchiveId = null"
            class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark"
          >
            Annuler
          </button>
          <button
            :disabled="archiving"
            @click="confirmArchive(confirmArchiveId)"
            class="rounded-md bg-rust px-4 py-2 text-sm font-medium text-white transition hover:bg-rust/90 disabled:opacity-60"
          >
            {{ archiving ? 'Archivage…' : 'Archiver' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
