<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ChurchesAPI } from '../../services/api'
import StatusBadge from '../../components/StatusBadge.vue'

const router = useRouter()
const churches = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const confirmArchiveId = ref(null)
const archiving = ref(false)
const togglingId = ref(null)

// ---- Pagination ----
const currentPage = ref(1)
const perPage = 10

const filtered = computed(() => {
  if (!search.value.trim()) return churches.value
  const q = search.value.trim().toLowerCase()
  return churches.value.filter((c) =>
    [c.name, c.address, c.city].filter(Boolean).some((f) => f.toLowerCase().includes(q))
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)))
const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filtered.value.slice(start, start + perPage)
})

// Reset to page 1 when search changes
function onSearchInput() {
  currentPage.value = 1
}

function unwrap(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

async function loadChurches() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await ChurchesAPI.list()
    churches.value = unwrap(data)
  } catch (e) {
    error.value = e.response?.data?.message || 'Impossible de charger les églises.'
  } finally {
    loading.value = false
  }
}

function churchName(c) {
  return c.structure?.name || c.name || '—'
}
function churchAddress(c) {
  return c.address || '—'
}
function churchStatus(c) {
  return c.structure?.status || c.status || 'active'
}

// Binary status toggle via dedicated endpoint (backend requires status in body)
async function toggleStatus(church) {
  const current = churchStatus(church)
  const newStatus = current === 'active' ? 'inactive' : 'active'
  togglingId.value = church.id
  try {
    const { data } = await ChurchesAPI.changeStatus(church.id, newStatus)
    const updated = data.data ?? data
    if (church.structure) church.structure.status = updated.structure?.status ?? newStatus
    else church.status = newStatus
  } catch (e) {
    error.value = e.response?.data?.message || 'Impossible de changer le statut.'
  } finally {
    togglingId.value = null
  }
}

function goEdit(id) {
  router.push({ name: 'church-edit', params: { id } })
}
function goShow(id) {
  router.push({ name: 'church-show', params: { id } })
}

// Archive = soft delete on the backend (deleted_at). The record stays
// in the database for historical/audit purposes but disappears from
// this list once Eloquent's default scope excludes soft-deleted rows.
async function confirmArchive(id) {
  archiving.value = true
  try {
    await ChurchesAPI.remove(id)
    churches.value = churches.value.filter((c) => c.id !== id)
    // Adjust page if we deleted the last item on a page
    if (paginated.value.length === 0 && currentPage.value > 1) {
      currentPage.value--
    }
  } catch (e) {
    error.value = e.response?.data?.message || "Impossible d'archiver cette église."
  } finally {
    archiving.value = false
    confirmArchiveId.value = null
  }
}

onMounted(loadChurches)
</script>

<template>
  <div>
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
      <div>
        <p class="text-xs uppercase tracking-[0.16em] text-gold">Registre</p>
        <h1 class="mt-1 font-display text-3xl text-ink-dark">Églises</h1>
        <p class="mt-1 text-sm text-ink-dark/55">Toutes les congrégations enregistrées.</p>
      </div>
      <RouterLink
        v-if="auth.canManageChurches"
        to="/churches/new"
        class="rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-ink-dark transition hover:bg-gold-light"
      >
        + Ajouter une église
      </RouterLink>
    </div>

    <div class="mb-4">
      <input
        v-model="search"
        @input="onSearchInput"
        type="text"
        placeholder="Rechercher par nom, ville…"
        class="w-full max-w-sm rounded-md border border-rule bg-white px-3.5 py-2 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold sm:w-72"
      />
    </div>

    <p v-if="error" class="mb-4 rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
      {{ error }}
    </p>

    <div class="overflow-hidden rounded-lg border border-rule bg-white">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-rule bg-parchment-dark/40 text-[11px] uppercase tracking-wide text-ink-dark/45">
            <th class="px-5 py-3 font-semibold">Nom</th>
            <th class="px-5 py-3 font-semibold">Adresse</th>
            <th class="px-5 py-3 font-semibold">Statut</th>
            <th class="px-5 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4" class="px-5 py-10 text-center text-ink-dark/40">Chargement…</td>
          </tr>
          <tr v-else-if="!paginated.length">
            <td colspan="4" class="px-5 py-10 text-center text-ink-dark/40">Aucune église trouvée.</td>
          </tr>
          <tr
            v-for="church in paginated"
            :key="church.id"
            class="border-b border-rule last:border-0 hover:bg-parchment/60"
          >
            <td class="cursor-pointer px-5 py-3.5 font-medium text-ink-dark" @click="goShow(church.id)">
              {{ churchName(church) }}
            </td>
            <td class="px-5 py-3.5 text-ink-dark/60">{{ churchAddress(church) }}</td>
            <td class="px-5 py-3.5">
              <button
                v-if="auth.canManageChurches"
                @click="toggleStatus(church)"
                :disabled="togglingId === church.id"
                title="Cliquer pour changer le statut"
                class="disabled:opacity-50"
              >
                <StatusBadge :status="churchStatus(church)" />
              </button>
              <StatusBadge v-else :status="churchStatus(church)" />
            </td>
            <td class="px-5 py-3.5 text-right">
              <div class="flex justify-end gap-2">
                <button
                  @click="goShow(church.id)"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:bg-parchment-dark hover:text-ink-dark"
                >
                  Voir
                </button>
                <button
                  v-if="auth.canManageChurches"
                  @click="goEdit(church.id)"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:bg-parchment-dark hover:text-ink-dark"
                >
                  Modifier
                </button>
                <button
                  v-if="auth.canManageChurches"
                  @click="confirmArchiveId = church.id"
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

    <!-- Pagination -->
    <div v-if="!loading && filtered.length > perPage" class="mt-4 flex items-center justify-between">
      <p class="text-xs text-ink-dark/45">
        {{ (currentPage - 1) * perPage + 1 }}–{{ Math.min(currentPage * perPage, filtered.length) }} sur {{ filtered.length }}
      </p>
      <div class="flex gap-1">
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="rounded-md border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:border-gold hover:text-ink-dark disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink-dark/60"
        >
          ← Précédent
        </button>
        <div class="flex gap-1">
          <button
            v-for="p in totalPages"
            :key="p"
            @click="currentPage = p"
            class="h-[30px] w-[30px] rounded-md border px-2 py-1.5 text-xs font-medium transition"
            :class="p === currentPage
              ? 'border-gold bg-gold/10 text-ink-dark'
              : 'border-rule bg-white text-ink-dark/60 hover:border-gold hover:text-ink-dark'"
          >
            {{ p }}
          </button>
        </div>
        <button
          @click="currentPage++"
          :disabled="currentPage === totalPages"
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
        <h3 class="font-display text-lg text-ink-dark">Archiver cette église ?</h3>
        <p class="mt-2 text-sm text-ink-dark/60">
          L'église ne sera plus visible dans la liste, mais ses données resteront conservées dans le registre.
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
            class="rounded-md bg-rust px-4 py-2 text-sm font-semibold text-white transition hover:bg-rust/90 disabled:opacity-60"
          >
            {{ archiving ? 'Archivage…' : 'Archiver' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
