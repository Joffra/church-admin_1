<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { MembersAPI, ChurchesAPI } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import StatusBadge from '../../components/StatusBadge.vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const router = useRouter()
const auth = useAuthStore()

// State
const member = ref(null)
const loading = ref(true)
const error = ref('')
const successMessage = ref('')

// Churches for Transfer Dropdown
const churches = ref([])
const loadingChurches = ref(false)

// Modals visibility
const showSanctionModal = ref(false)
const showLiftSanctionModal = ref(false)
const showTransferModal = ref(false)
const showArchiveModal = ref(false)

// Form states
const sanctionForm = ref({
  reason: '',
  description: '',
  ends_at: ''
})

const liftSanctionForm = ref({
  lifted_reason: ''
})

const transferForm = ref({
  new_church_id: ''
})

const submitting = ref(false)
const modalError = ref('')

// Load Member Data
async function loadMember() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await MembersAPI.get(props.id)
    member.value = data.data ?? data
  } catch (e) {
    console.error(e)
    error.value = "Impossible de charger les informations du membre demandé."
  } finally {
    loading.value = false
  }
}

// Load Churches List for Transfer modal
async function loadChurches() {
  if (churches.value.length > 0) return
  loadingChurches.value = true
  try {
    const { data } = await ChurchesAPI.list()
    churches.value = data.data ?? data
  } catch (e) {
    console.error("Erreur de chargement des églises:", e)
  } finally {
    loadingChurches.value = false
  }
}

// Action: Apply Sanction
async function handleSanction() {
  if (!sanctionForm.value.reason.trim()) {
    modalError.value = "Le motif est requis."
    return
  }
  submitting.value = true
  modalError.value = ''
  try {
    const payload = {
      reason: sanctionForm.value.reason.trim(),
    }
    if (sanctionForm.value.description.trim()) {
      payload.description = sanctionForm.value.description.trim()
    }
    if (sanctionForm.value.ends_at) {
      payload.ends_at = sanctionForm.value.ends_at
    }

    await MembersAPI.sanction(props.id, payload)
    
    showSanctionModal.value = false
    sanctionForm.value = { reason: '', description: '', ends_at: '' }
    
    successMessage.value = "Le membre a été sanctionné avec succès."
    await loadMember()
    setTimeout(() => { successMessage.value = '' }, 5000)
  } catch (e) {
    modalError.value = e.response?.data?.message || "Une erreur s'est produite lors de la sanction."
  } finally {
    submitting.value = false
  }
}

// Action: Lift Sanction
async function handleLiftSanction() {
  if (!liftSanctionForm.value.lifted_reason.trim()) {
    modalError.value = "Le motif de la levée est requis."
    return
  }
  submitting.value = true
  modalError.value = ''
  try {
    await MembersAPI.liftSanction(props.id, liftSanctionForm.value.lifted_reason.trim())
    
    showLiftSanctionModal.value = false
    liftSanctionForm.value = { lifted_reason: '' }
    
    successMessage.value = "La sanction a été levée avec succès."
    await loadMember()
    setTimeout(() => { successMessage.value = '' }, 5000)
  } catch (e) {
    modalError.value = e.response?.data?.message || "Une erreur s'est produite lors de la levée de la sanction."
  } finally {
    submitting.value = false
  }
}

// Action: Transfer Member
async function handleTransfer() {
  if (!transferForm.value.new_church_id) {
    modalError.value = "Veuillez sélectionner une église de destination."
    return
  }
  submitting.value = true
  modalError.value = ''
  try {
    await MembersAPI.transfer(props.id, transferForm.value.new_church_id)
    
    showTransferModal.value = false
    transferForm.value = { new_church_id: '' }
    
    successMessage.value = "Le membre a été transféré avec succès."
    await loadMember()
    setTimeout(() => { successMessage.value = '' }, 5000)
  } catch (e) {
    modalError.value = e.response?.data?.message || "Une erreur s'est produite lors du transfert."
  } finally {
    submitting.value = false
  }
}

// Action: Archive (Remove) Member
async function handleArchive() {
  submitting.value = true
  modalError.value = ''
  try {
    await MembersAPI.remove(props.id)
    showArchiveModal.value = false
    router.push('/members')
  } catch (e) {
    modalError.value = e.response?.data?.message || "Une erreur s'est produite lors de l'archivage."
  } finally {
    submitting.value = false
  }
}

// Open modal utilities
function openSanction() {
  modalError.value = ''
  showSanctionModal.value = true
}

function openLiftSanction() {
  modalError.value = ''
  showLiftSanctionModal.value = true
}

async function openTransfer() {
  modalError.value = ''
  showTransferModal.value = true
  await loadChurches()
}

function openArchive() {
  modalError.value = ''
  showArchiveModal.value = true
}

// Formatting utilities
function formatGender(g) {
  if (!g) return '—'
  const val = g.toLowerCase()
  if (val === 'm' || val === 'homme' || val === 'male') return 'Homme'
  if (val === 'f' || val === 'femme' || val === 'female') return 'Femme'
  return g
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '—'
  try {
    return new Date(dateTimeStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateTimeStr
  }
}

function getChurchName(church) {
  return church?.structure?.name || church?.name || '—'
}

onMounted(loadMember)
</script>

<template>
  <div class="max-w-3xl">
    <!-- Back to members link -->
    <RouterLink
      to="/members"
      class="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-dark/50 hover:text-ink-dark transition-colors"
    >
      ← Retour aux membres
    </RouterLink>

    <!-- Loading state -->
    <div v-if="loading" class="py-12 text-center text-ink-dark/40">
      <svg class="mx-auto h-8 w-8 animate-spin text-gold" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p class="mt-2 text-sm">Chargement des détails du membre…</p>
    </div>

    <!-- Error message -->
    <p
      v-else-if="error"
      class="rounded-md border border-rust/40 bg-rust/10 px-4 py-3 text-sm text-rust"
    >
      {{ error }}
    </p>

    <div v-else-if="member" class="space-y-6">
      <!-- Success toast -->
      <div
        v-if="successMessage"
        class="flex items-center gap-2 rounded-md border border-sage/40 bg-sage/10 px-4 py-3 text-sm text-sage"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>{{ successMessage }}</span>
      </div>

      <!-- Member Header Profile Card -->
      <div class="rounded-lg border border-rule bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-4">
            <!-- Profile photo / Avatar placeholder -->
            <div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gold/20 text-2xl font-semibold text-gold border border-rule overflow-hidden">
              <img
                v-if="member.profile_picture"
                :src="member.profile_picture"
                :alt="`${member.first_name} ${member.last_name}`"
                class="h-full w-full object-cover"
              />
              <span v-else>
                {{ (member.first_name?.[0] || member.last_name?.[0] || 'M').toUpperCase() }}
              </span>
            </div>
            
            <div>
              <p class="text-xs uppercase tracking-[0.16em] text-gold font-semibold">Fiche de Membre</p>
              <h1 class="mt-1 font-display text-2xl font-bold text-ink-dark">
                {{ member.first_name }} {{ member.last_name }}
              </h1>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span class="font-mono text-xs text-ink-dark/50">
                  Code: {{ member.member_code }}
                </span>
                <span class="text-ink-dark/30">•</span>
                <StatusBadge :status="member.status" />
              </div>
            </div>
          </div>

          <!-- Action Buttons Group -->
          <div class="flex flex-wrap gap-2 sm:self-start">
            <!-- Edit -->
            <RouterLink
              v-if="auth.canManageMembers"
              :to="{ name: 'member-edit', params: { id: member.id } }"
              class="rounded-md border border-rule bg-white px-3.5 py-2 text-xs font-medium text-ink-dark/70 transition hover:border-gold hover:text-ink-dark"
            >
              Modifier
            </RouterLink>

            <!-- Sanction/Lift Sanction -->
            <button
              v-if="auth.canSanctionMembers && member.status !== 'sanctioned'"
              @click="openSanction"
              class="rounded-md border border-rust/30 bg-rust/5 px-3.5 py-2 text-xs font-medium text-rust transition hover:bg-rust/10"
            >
              Sanctionner
            </button>
            <button
              v-else-if="auth.canSanctionMembers && member.status === 'sanctioned'"
              @click="openLiftSanction"
              class="rounded-md border border-sage/30 bg-sage/5 px-3.5 py-2 text-xs font-medium text-sage transition hover:bg-sage/10"
            >
              Lever la sanction
            </button>

            <!-- Transfer -->
            <button
              v-if="auth.canTransferMembers"
              @click="openTransfer"
              class="rounded-md border border-rule bg-white px-3.5 py-2 text-xs font-medium text-ink-dark/70 transition hover:border-gold hover:text-ink-dark"
            >
              Transférer
            </button>

            <!-- Archive -->
            <button
              v-if="auth.canManageMembers"
              @click="openArchive"
              class="rounded-md border border-rust/30 px-3.5 py-2 text-xs font-medium text-rust/80 transition hover:bg-rust/5"
            >
              Archiver
            </button>
          </div>
        </div>
      </div>

      <!-- Member Details Grid -->
      <div class="rounded-lg border border-rule bg-white p-6 shadow-sm">
        <h2 class="mb-5 font-display text-lg font-semibold text-ink-dark border-b border-rule pb-2">
          Informations personnelles & ecclésiastiques
        </h2>

        <dl class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <!-- Code membre -->
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-dark/45 font-medium">Code de membre</dt>
            <dd class="mt-1 text-sm font-semibold text-ink-dark font-mono">{{ member.member_code || '—' }}</dd>
          </div>

          <!-- Titre Ecclésiastique -->
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-dark/45 font-medium">Titre ecclésiastique</dt>
            <dd class="mt-1 text-sm text-ink-dark font-medium">{{ member.ecclesiastical_title || '—' }}</dd>
          </div>

          <!-- Prénom -->
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-dark/45 font-medium">Prénom</dt>
            <dd class="mt-1 text-sm text-ink-dark">{{ member.first_name || '—' }}</dd>
          </div>

          <!-- Nom -->
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-dark/45 font-medium">Nom de famille</dt>
            <dd class="mt-1 text-sm text-ink-dark">{{ member.last_name || '—' }}</dd>
          </div>

          <!-- Genre -->
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-dark/45 font-medium">Sexe</dt>
            <dd class="mt-1 text-sm text-ink-dark">{{ formatGender(member.gender) }}</dd>
          </div>

          <!-- Date de naissance -->
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-dark/45 font-medium">Date de naissance</dt>
            <dd class="mt-1 text-sm text-ink-dark">{{ formatDate(member.birth_date) }}</dd>
          </div>

          <!-- Église d'affectation -->
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-dark/45 font-medium">Église d'affectation</dt>
            <dd class="mt-1 text-sm text-ink-dark font-semibold">{{ getChurchName(member.church) }}</dd>
          </div>

          <!-- Téléphone -->
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-dark/45 font-medium">Téléphone</dt>
            <dd class="mt-1 text-sm text-ink-dark">
              <a v-if="member.phone" :href="`tel:${member.phone}`" class="hover:underline text-gold">{{ member.phone }}</a>
              <span v-else>—</span>
            </dd>
          </div>

          <!-- Email -->
          <div class="sm:col-span-2">
            <dt class="text-xs uppercase tracking-wide text-ink-dark/45 font-medium">Adresse Email</dt>
            <dd class="mt-1 text-sm text-ink-dark">
              <a v-if="member.email" :href="`mailto:${member.email}`" class="hover:underline text-gold">{{ member.email }}</a>
              <span v-else>—</span>
            </dd>
          </div>

          <!-- Date de création -->
          <div class="sm:col-span-2 border-t border-rule pt-4 mt-2">
            <dt class="text-xs uppercase tracking-wide text-ink-dark/45 font-medium">Enregistré le</dt>
            <dd class="mt-1 text-xs text-ink-dark/60">{{ formatDateTime(member.created_at) }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- MODAL: SANCTION -->
    <div
      v-if="showSanctionModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="showSanctionModal = false"
    >
      <div class="w-full max-w-md rounded-lg bg-white border border-rule shadow-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-rule flex justify-between items-center bg-parchment/30">
          <h3 class="font-display text-lg font-bold text-ink-dark">Sanctionner le membre</h3>
          <button @click="showSanctionModal = false" class="text-ink-dark/40 hover:text-ink-dark transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleSanction" class="p-6 space-y-4">
          <p v-if="modalError" class="rounded-md border border-rust/40 bg-rust/10 px-4 py-2.5 text-xs text-rust">
            {{ modalError }}
          </p>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
              Motif de la sanction *
            </label>
            <input
              v-model="sanctionForm.reason"
              type="text"
              required
              :disabled="submitting"
              placeholder="ex. Manquement grave aux statuts"
              class="w-full rounded-md border border-rule px-3.5 py-2 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
              Description / Notes supplémentaires
            </label>
            <textarea
              v-model="sanctionForm.description"
              :disabled="submitting"
              rows="3"
              placeholder="Détails additionnels concernant la sanction (optionnel)..."
              class="w-full rounded-md border border-rule px-3.5 py-2 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60 resize-none"
            ></textarea>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
              Date de fin de sanction
            </label>
            <input
              v-model="sanctionForm.ends_at"
              type="date"
              :disabled="submitting"
              class="w-full rounded-md border border-rule px-3.5 py-2 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
            />
          </div>

          <div class="flex justify-end gap-3 border-t border-rule pt-4 mt-6">
            <button
              type="button"
              @click="showSanctionModal = false"
              :disabled="submitting"
              class="rounded-md px-4 py-2 text-xs font-medium text-ink-dark/60 hover:text-ink-dark transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="rounded-md bg-rust px-4 py-2 text-xs font-semibold text-white transition hover:bg-rust/90 disabled:opacity-60 flex items-center gap-1.5"
            >
              <svg v-if="submitting" class="h-3 w-3 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ submitting ? 'Application…' : 'Appliquer la sanction' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: LIFT SANCTION -->
    <div
      v-if="showLiftSanctionModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="showLiftSanctionModal = false"
    >
      <div class="w-full max-w-md rounded-lg bg-white border border-rule shadow-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-rule flex justify-between items-center bg-parchment/30">
          <h3 class="font-display text-lg font-bold text-ink-dark">Lever la sanction</h3>
          <button @click="showLiftSanctionModal = false" class="text-ink-dark/40 hover:text-ink-dark transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleLiftSanction" class="p-6 space-y-4">
          <p v-if="modalError" class="rounded-md border border-rust/40 bg-rust/10 px-4 py-2.5 text-xs text-rust">
            {{ modalError }}
          </p>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
              Motif de levée de la sanction *
            </label>
            <input
              v-model="liftSanctionForm.lifted_reason"
              type="text"
              required
              :disabled="submitting"
              placeholder="ex. Période de sanction terminée ou réhabilitation acceptée"
              class="w-full rounded-md border border-rule px-3.5 py-2 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
            />
          </div>

          <div class="flex justify-end gap-3 border-t border-rule pt-4 mt-6">
            <button
              type="button"
              @click="showLiftSanctionModal = false"
              :disabled="submitting"
              class="rounded-md px-4 py-2 text-xs font-medium text-ink-dark/60 hover:text-ink-dark transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="rounded-md bg-sage px-4 py-2 text-xs font-semibold text-white transition hover:bg-sage/90 disabled:opacity-60 flex items-center gap-1.5"
            >
              <svg v-if="submitting" class="h-3 w-3 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ submitting ? 'Levée…' : 'Lever la sanction' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: TRANSFER -->
    <div
      v-if="showTransferModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="showTransferModal = false"
    >
      <div class="w-full max-w-md rounded-lg bg-white border border-rule shadow-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-rule flex justify-between items-center bg-parchment/30">
          <h3 class="font-display text-lg font-bold text-ink-dark">Transférer le membre</h3>
          <button @click="showTransferModal = false" class="text-ink-dark/40 hover:text-ink-dark transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleTransfer" class="p-6 space-y-4">
          <p v-if="modalError" class="rounded-md border border-rust/40 bg-rust/10 px-4 py-2.5 text-xs text-rust">
            {{ modalError }}
          </p>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
              Sélectionner la nouvelle église d'affectation *
            </label>
            <select
              v-model="transferForm.new_church_id"
              required
              :disabled="submitting || loadingChurches"
              class="w-full rounded-md border border-rule bg-white px-3.5 py-2 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
            >
              <option value="" disabled>Sélectionnez une église</option>
              <option v-for="c in churches" :key="c.id" :value="c.id">
                {{ getChurchName(c) }}
              </option>
            </select>
            <p v-if="loadingChurches" class="mt-1.5 text-xs text-ink-dark/40 flex items-center gap-1.5">
              <svg class="h-3 w-3 animate-spin text-gold" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Chargement de la liste des églises…
            </p>
          </div>

          <div class="flex justify-end gap-3 border-t border-rule pt-4 mt-6">
            <button
              type="button"
              @click="showTransferModal = false"
              :disabled="submitting"
              class="rounded-md px-4 py-2 text-xs font-medium text-ink-dark/60 hover:text-ink-dark transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              :disabled="submitting || loadingChurches"
              class="rounded-md bg-gold px-4 py-2 text-xs font-semibold text-ink-dark transition hover:bg-gold-light disabled:opacity-60 flex items-center gap-1.5"
            >
              <svg v-if="submitting" class="h-3 w-3 animate-spin text-ink-dark" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ submitting ? 'Transfert…' : 'Confirmer le transfert' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: CONFIRM ARCHIVE -->
    <div
      v-if="showArchiveModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="showArchiveModal = false"
    >
      <div class="w-full max-w-md rounded-lg bg-white border border-rule shadow-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-rule flex justify-between items-center bg-rust/5">
          <h3 class="font-display text-lg font-bold text-rust">Archiver le membre</h3>
          <button @click="showArchiveModal = false" class="text-ink-dark/40 hover:text-ink-dark transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-4">
          <p v-if="modalError" class="rounded-md border border-rust/40 bg-rust/10 px-4 py-2.5 text-xs text-rust">
            {{ modalError }}
          </p>

          <p class="text-sm text-ink-dark/70">
            Êtes-vous sûr de vouloir archiver le membre <strong class="text-ink-dark">{{ member.first_name }} {{ member.last_name }}</strong> ?
          </p>
          <p class="text-xs text-ink-dark/50 bg-parchment/50 p-3 rounded border border-rule">
            Le membre ne sera plus visible dans la liste des membres actifs, mais ses données resteront conservées à des fins d'historique dans le registre.
          </p>

          <div class="flex justify-end gap-3 border-t border-rule pt-4 mt-6">
            <button
              type="button"
              @click="showArchiveModal = false"
              :disabled="submitting"
              class="rounded-md px-4 py-2 text-xs font-medium text-ink-dark/60 hover:text-ink-dark transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              @click="handleArchive"
              :disabled="submitting"
              class="rounded-md bg-rust px-4 py-2 text-xs font-semibold text-white transition hover:bg-rust/90 disabled:opacity-60 flex items-center gap-1.5"
            >
              <svg v-if="submitting" class="h-3 w-3 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ submitting ? 'Archivage…' : 'Confirmer l\'archivage' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
