<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { MembersAPI, ChurchesAPI } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import StatusBadge from '../../components/StatusBadge.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const member = ref(null)
const loading = ref(true)
const error = ref('')

// Confirm archive modal
const confirmArchive = ref(false)
const archiving = ref(false)

// Sanction modal
const showSanctionModal = ref(false)
const sanctionSubmitting = ref(false)
const sanctionForm = ref({
  reason: '',
  description: '',
  ends_at: ''
})
const sanctionErrors = ref({})

// Lift sanction modal
const showLiftModal = ref(false)
const liftSubmitting = ref(false)
const liftForm = ref({
  lifted_reason: ''
})
const liftErrors = ref({})

// Transfer modal
const showTransferModal = ref(false)
const transferSubmitting = ref(false)
const transferForm = ref({
  new_church_id: ''
})
const transferErrors = ref({})
const churches = ref([])
const loadingChurches = ref(false)

// Helper for min date in date picker (after now)
const minDate = computed(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
})

// Unwrap payload helper
function unwrap(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await MembersAPI.get(route.params.id)
    member.value = data.data ?? data
  } catch (e) {
    error.value = "Impossible de charger le membre demandé."
  } finally {
    loading.value = false
  }
}

function formatGender(gender) {
  if (gender === 'M') return 'Masculin'
  if (gender === 'F') return 'Féminin'
  return gender || '—'
}

function formatBaptized(baptized) {
  if (baptized === true || baptized === 1 || baptized === '1') return 'Oui'
  if (baptized === false || baptized === 0 || baptized === '0') return 'Non'
  return '—'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  } catch {
    return dateStr
  }
}

// Actions handlers
async function onArchive() {
  archiving.value = true
  try {
    await MembersAPI.remove(route.params.id)
    router.push({ name: 'members' })
  } catch (e) {
    error.value = "Impossible d'archiver ce membre."
    archiving.value = false
    confirmArchive.value = false
  }
}

// Modal open/close helpers
function openSanctionModal() {
  showSanctionModal.value = true
}

function closeSanctionModal() {
  showSanctionModal.value = false
  sanctionForm.value = { reason: '', description: '', ends_at: '' }
  sanctionErrors.value = {}
}

function openLiftModal() {
  showLiftModal.value = true
}

function closeLiftModal() {
  showLiftModal.value = false
  liftForm.value = { lifted_reason: '' }
  liftErrors.value = {}
}

async function openTransferModal() {
  showTransferModal.value = true
  loadingChurches.value = true
  try {
    const { data } = await ChurchesAPI.list()
    churches.value = unwrap(data)
  } catch (e) {
    console.error('Impossible de charger la liste des églises', e)
  } finally {
    loadingChurches.value = false
  }
}

function closeTransferModal() {
  showTransferModal.value = false
  transferForm.value = { new_church_id: '' }
  transferErrors.value = {}
}

// Validations
function validateSanction() {
  const errors = {}
  if (!sanctionForm.value.reason.trim()) {
    errors.reason = 'La raison est obligatoire.'
  } else if (sanctionForm.value.reason.length > 255) {
    errors.reason = 'La raison ne doit pas dépasser 255 caractères.'
  }
  
  if (sanctionForm.value.ends_at) {
    const selectedDate = new Date(sanctionForm.value.ends_at)
    const now = new Date()
    if (selectedDate <= now) {
      errors.ends_at = "La date de fin doit être postérieure à maintenant."
    }
  }
  
  sanctionErrors.value = errors
  return Object.keys(errors).length === 0
}

async function submitSanction() {
  if (!validateSanction()) return
  sanctionSubmitting.value = true
  try {
    await MembersAPI.sanction(route.params.id, {
      reason: sanctionForm.value.reason,
      description: sanctionForm.value.description || null,
      ends_at: sanctionForm.value.ends_at || null,
    })
    closeSanctionModal()
    await load()
  } catch (e) {
    if (e.response?.data?.errors) {
      sanctionErrors.value = e.response.data.errors
    } else {
      error.value = e.response?.data?.message || 'Une erreur est survenue lors de la sanction.'
      closeSanctionModal()
    }
  } finally {
    sanctionSubmitting.value = false
  }
}

function validateLift() {
  const errors = {}
  if (!liftForm.value.lifted_reason.trim()) {
    errors.lifted_reason = 'Le motif de levée est obligatoire.'
  } else if (liftForm.value.lifted_reason.length > 255) {
    errors.lifted_reason = 'Le motif ne doit pas dépasser 255 caractères.'
  }
  liftErrors.value = errors
  return Object.keys(errors).length === 0
}

async function submitLift() {
  if (!validateLift()) return
  liftSubmitting.value = true
  try {
    await MembersAPI.liftSanction(route.params.id, {
      lifted_reason: liftForm.value.lifted_reason,
    })
    closeLiftModal()
    await load()
  } catch (e) {
    if (e.response?.data?.errors) {
      liftErrors.value = e.response.data.errors
    } else {
      error.value = e.response?.data?.message || 'Une erreur est survenue lors de la levée de sanction.'
      closeLiftModal()
    }
  } finally {
    liftSubmitting.value = false
  }
}

function validateTransfer() {
  const errors = {}
  if (!transferForm.value.new_church_id) {
    errors.new_church_id = 'Le choix de la nouvelle église est obligatoire.'
  }
  transferErrors.value = errors
  return Object.keys(errors).length === 0
}

async function submitTransfer() {
  if (!validateTransfer()) return
  transferSubmitting.value = true
  try {
    await MembersAPI.transfer(route.params.id, {
      new_church_id: transferForm.value.new_church_id,
    })
    closeTransferModal()
    await load()
  } catch (e) {
    if (e.response?.data?.errors) {
      transferErrors.value = e.response.data.errors
    } else {
      error.value = e.response?.data?.message || 'Une erreur est survenue lors du transfert.'
      closeTransferModal()
    }
  } finally {
    transferSubmitting.value = false
  }
}

onMounted(async () => {
  await load()
  if (member.value) {
    if (route.query.action === 'sanction' && auth.canSanctionMembers && member.value.status === 'active') {
      openSanctionModal()
    } else if (route.query.action === 'transfer' && auth.canManageMembers) {
      openTransferModal()
    }
  }
})
</script>

<template>
  <div class="max-w-2xl">
    <button @click="router.back()" class="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-dark/50 hover:text-ink-dark">
      ← Retour
    </button>

    <div v-if="loading" class="py-10 text-center text-ink-dark/40">Chargement…</div>
    <p v-else-if="error" class="rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">{{ error }}</p>

    <div v-else-if="member">
      <!-- Header -->
      <div class="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-6">
        <div>
          <p class="text-xs uppercase tracking-[0.16em] text-gold">Fiche détaillée</p>
          <h1 class="mt-1 font-display text-3xl text-ink-dark">{{ member.first_name }} {{ member.last_name }}</h1>
          <div class="mt-2">
            <StatusBadge :status="member.status" />
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <!-- Modifier -->
          <RouterLink
            v-if="auth.canManageMembers"
            :to="{ name: 'member-edit', params: { id: member.id } }"
            class="rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink-dark/70 transition hover:border-gold hover:text-ink-dark"
          >
            Modifier
          </RouterLink>

          <!-- Sanctionner (only if active) -->
          <button
            v-if="auth.canSanctionMembers && member.status === 'active'"
            @click="openSanctionModal"
            class="rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink-dark/70 transition hover:border-gold hover:text-ink-dark cursor-pointer"
          >
            Sanctionner
          </button>

          <!-- Lever la sanction (only if sanctioned) -->
          <button
            v-if="auth.canSanctionMembers && member.status === 'sanctioned'"
            @click="openLiftModal"
            class="rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink-dark/70 transition hover:border-gold hover:text-ink-dark cursor-pointer"
          >
            Lever la sanction
          </button>

          <!-- Transférer -->
          <button
            v-if="auth.canManageMembers"
            @click="openTransferModal"
            class="rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink-dark/70 transition hover:border-gold hover:text-ink-dark cursor-pointer"
          >
            Transférer
          </button>

          <!-- Archiver -->
          <button
            v-if="auth.canManageMembers"
            @click="confirmArchive = true"
            class="rounded-md border border-rust/30 px-4 py-2 text-sm font-medium text-rust/80 transition hover:bg-rust/5 cursor-pointer"
          >
            Archiver
          </button>
        </div>
      </div>

      <!-- Detail Card -->
      <dl class="mb-5 grid grid-cols-1 gap-5 rounded-lg border border-rule bg-white p-6 sm:grid-cols-2">
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Code Membre</dt>
          <dd class="mt-1 font-mono text-sm text-ink-dark">{{ member.member_code || '—' }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Titre ecclésiastique</dt>
          <dd class="mt-1 text-sm text-ink-dark">{{ member.ecclesiastical_title || '—' }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Genre</dt>
          <dd class="mt-1 text-sm text-ink-dark">{{ formatGender(member.gender) }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Baptisé</dt>
          <dd class="mt-1 text-sm text-ink-dark">{{ formatBaptized(member.baptized) }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Téléphone</dt>
          <dd class="mt-1 text-sm text-ink-dark">{{ member.phone || '—' }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Email</dt>
          <dd class="mt-1 text-sm text-ink-dark">{{ member.email || '—' }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Date de naissance</dt>
          <dd class="mt-1 text-sm text-ink-dark">{{ formatDate(member.birth_date) }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Église</dt>
          <dd class="mt-1 text-sm text-ink-dark">{{ member.church?.name || '—' }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Inscrit le</dt>
          <dd class="mt-1 text-sm text-ink-dark">{{ formatDate(member.created_at) }}</dd>
        </div>
      </dl>

      <!-- Sanctions History (if member has sanctions loaded) -->
      <div v-if="member.sanctions && member.sanctions.length > 0" class="rounded-lg border border-rule bg-white p-6">
        <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-dark/60">Historique des sanctions</h2>
        <div class="space-y-3">
          <div
            v-for="sanction in member.sanctions"
            :key="sanction.id"
            class="rounded-md border border-rule p-4"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1">
                <p class="font-medium text-ink-dark">{{ sanction.reason }}</p>
                <p v-if="sanction.description" class="mt-1 text-sm text-ink-dark/60">{{ sanction.description }}</p>
              </div>
              <StatusBadge :status="sanction.is_active ? 'sanctioned' : 'active'" />
            </div>
            <div class="mt-2 flex flex-wrap gap-4 text-xs text-ink-dark/50">
              <span>Début : {{ formatDateTime(sanction.started_at) }}</span>
              <span>Fin : {{ sanction.ends_at ? formatDateTime(sanction.ends_at) : 'Indéterminée' }}</span>
              <span v-if="sanction.lifted_at">Levée : {{ formatDateTime(sanction.lifted_at) }}</span>
            </div>
            <p v-if="sanction.lifted_reason" class="mt-1 text-xs text-ink-dark/50">
              Motif de levée : {{ sanction.lifted_reason }}
            </p>
          </div>
        </div>
      </div>

      <!-- ===== Modals ===== -->

      <!-- Sanction Modal -->
      <div v-if="showSanctionModal" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4" @click.self="closeSanctionModal">
        <div class="w-full max-w-md rounded-lg bg-white p-6">
          <h3 class="font-display text-lg text-ink-dark">Sanctionner ce membre</h3>
          <p class="mt-1 text-sm text-ink-dark/55">Renseignez les détails de la sanction disciplinaire.</p>
          <div class="mt-4 space-y-4">
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Raison *</label>
              <input v-model="sanctionForm.reason" type="text" :disabled="sanctionSubmitting"
                class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 bg-white text-ink-dark"
                :class="sanctionErrors.reason ? 'border-rust focus:border-rust focus:ring-rust' : 'border-rule focus:border-gold focus:ring-gold'"
                placeholder="ex. Manquement disciplinaire" />
              <p v-if="sanctionErrors.reason" class="mt-1 text-xs text-rust">{{ sanctionErrors.reason }}</p>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Description</label>
              <textarea v-model="sanctionForm.description" rows="3" :disabled="sanctionSubmitting"
                class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                placeholder="Détails de la sanction…"></textarea>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Date de fin (optionnel)</label>
              <input v-model="sanctionForm.ends_at" type="date" :min="minDate" :disabled="sanctionSubmitting"
                class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
              <p v-if="sanctionErrors.ends_at" class="mt-1 text-xs text-rust">{{ sanctionErrors.ends_at }}</p>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button @click="closeSanctionModal" :disabled="sanctionSubmitting" class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark">Annuler</button>
            <button @click="submitSanction" :disabled="sanctionSubmitting" class="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60">
              {{ sanctionSubmitting ? 'Sanction…' : 'Sanctionner' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Lift Sanction Modal -->
      <div v-if="showLiftModal" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4" @click.self="closeLiftModal">
        <div class="w-full max-w-md rounded-lg bg-white p-6">
          <h3 class="font-display text-lg text-ink-dark">Lever la sanction</h3>
          <p class="mt-1 text-sm text-ink-dark/55">Indiquez le motif de la levée de sanction.</p>
          <div class="mt-4">
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Motif de levée *</label>
            <input v-model="liftForm.lifted_reason" type="text" :disabled="liftSubmitting"
              class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 bg-white text-ink-dark"
              :class="liftErrors.lifted_reason ? 'border-rust focus:border-rust focus:ring-rust' : 'border-rule focus:border-gold focus:ring-gold'"
              placeholder="ex. Réconciliation, fin de période…" />
            <p v-if="liftErrors.lifted_reason" class="mt-1 text-xs text-rust">{{ liftErrors.lifted_reason }}</p>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button @click="closeLiftModal" :disabled="liftSubmitting" class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark">Annuler</button>
            <button @click="submitLift" :disabled="liftSubmitting" class="rounded-md bg-sage px-4 py-2 text-sm font-medium text-white transition hover:bg-sage/90 disabled:opacity-60">
              {{ liftSubmitting ? 'Lever…' : 'Lever la sanction' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Transfer Modal -->
      <div v-if="showTransferModal" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4" @click.self="closeTransferModal">
        <div class="w-full max-w-md rounded-lg bg-white p-6">
          <h3 class="font-display text-lg text-ink-dark">Transférer le membre</h3>
          <p class="mt-1 text-sm text-ink-dark/55">Sélectionnez la nouvelle église d'affectation.</p>
          <div class="mt-4">
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Nouvelle église *</label>
            <select v-model="transferForm.new_church_id" :disabled="transferSubmitting || loadingChurches"
              class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 bg-white text-ink-dark"
              :class="transferErrors.new_church_id ? 'border-rust focus:border-rust focus:ring-rust' : 'border-rule focus:border-gold focus:ring-gold'">
              <option value="">{{ loadingChurches ? 'Chargement…' : '— Sélectionner —' }}</option>
              <option v-for="c in churches" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <p v-if="transferErrors.new_church_id" class="mt-1 text-xs text-rust">{{ transferErrors.new_church_id }}</p>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button @click="closeTransferModal" :disabled="transferSubmitting" class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark">Annuler</button>
            <button @click="submitTransfer" :disabled="transferSubmitting" class="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink-dark transition hover:bg-gold-light disabled:opacity-60">
              {{ transferSubmitting ? 'Transfert…' : 'Transférer' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Confirm Archive Modal -->
      <div v-if="confirmArchive" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4" @click.self="confirmArchive = false">
        <div class="w-full max-w-sm rounded-lg bg-white p-6">
          <h3 class="font-display text-lg text-ink-dark">Archiver ce membre ?</h3>
          <p class="mt-2 text-sm text-ink-dark/60">
            Le membre ne sera plus visible dans la liste, mais ses données resteront conservées.
          </p>
          <div class="mt-6 flex justify-end gap-3">
            <button @click="confirmArchive = false" :disabled="archiving" class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark">Annuler</button>
            <button @click="onArchive" :disabled="archiving" class="rounded-md bg-rust px-4 py-2 text-sm font-medium text-white transition hover:bg-rust/90 disabled:opacity-60">
              {{ archiving ? 'Archivage…' : 'Archiver' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
