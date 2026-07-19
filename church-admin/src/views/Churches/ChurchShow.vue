<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { ChurchesAPI, MembersAPI } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import StatusBadge from '../../components/StatusBadge.vue'
import MapPicker from '../../components/MapPicker.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const church = ref(null)
const loading = ref(true)
const error = ref('')
const confirmArchive = ref(false)
const archiving = ref(false)
const togglingStatus = ref(false)

// Change pastor modal state
const showPastorModal = ref(false)
const pastors = ref([])
const loadingPastors = ref(false)
const selectedPastorId = ref('')
const changingPastor = ref(false)
const pastorError = ref('')

// Change admin modal state
const showAdminModal = ref(false)
const members = ref([])
const loadingMembers = ref(false)
const selectedAdminId = ref('')
const changingAdmin = ref(false)
const adminError = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await ChurchesAPI.get(route.params.id)
    church.value = data.data ?? data
  } catch (e) {
    error.value = "Impossible de charger l'église demandée."
  } finally {
    loading.value = false
  }
}

async function toggleStatus() {
  if (!church.value) return
  const current = church.value.structure?.status || church.value.status || 'active'
  const newStatus = current === 'active' ? 'inactive' : 'active'
  togglingStatus.value = true
  try {
    const { data } = await ChurchesAPI.changeStatus(church.value.id, newStatus)
    const updated = data.data ?? data
    if (church.value.structure) church.value.structure.status = updated.structure?.status ?? newStatus
    else church.value.status = newStatus
  } catch (e) {
    error.value = e.response?.data?.message || 'Impossible de changer le statut.'
  } finally {
    togglingStatus.value = false
  }
}

async function onArchive() {
  archiving.value = true
  try {
    await ChurchesAPI.remove(route.params.id)
    router.push({ name: 'churches' })
  } catch (e) {
    error.value = "Impossible d'archiver cette église."
    archiving.value = false
    confirmArchive.value = false
  }
}

// ---- Change pastor ----
async function openPastorModal() {
  showPastorModal.value = true
  pastorError.value = ''
  selectedPastorId.value = ''
  loadingPastors.value = true
  try {
    const { data } = await MembersAPI.availablePastors()
    pastors.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch (e) {
    pastorError.value = 'Impossible de charger la liste des pasteurs.'
  } finally {
    loadingPastors.value = false
  }
}

async function onChangePastor() {
  if (!selectedPastorId.value) {
    pastorError.value = 'Veuillez sélectionner un pasteur.'
    return
  }
  changingPastor.value = true
  pastorError.value = ''
  try {
    const { data } = await ChurchesAPI.changePastor(church.value.id, selectedPastorId.value)
    const updated = data.data ?? data
    church.value = { ...church.value, ...updated }
    showPastorModal.value = false
  } catch (e) {
    pastorError.value = e.response?.data?.message || 'Impossible de changer le pasteur responsable.'
  } finally {
    changingPastor.value = false
  }
}

// ---- Change admin ----
async function openAdminModal() {
  showAdminModal.value = true
  adminError.value = ''
  selectedAdminId.value = ''
  loadingMembers.value = true
  try {
    const { data } = await MembersAPI.list()
    members.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch (e) {
    adminError.value = 'Impossible de charger la liste des membres.'
  } finally {
    loadingMembers.value = false
  }
}

async function onChangeAdmin() {
  if (!selectedAdminId.value) {
    adminError.value = 'Veuillez sélectionner un membre.'
    return
  }
  changingAdmin.value = true
  adminError.value = ''
  try {
    // The backend doesn't have a dedicated change-admin endpoint yet,
    // but we can use the member update to set church_id + elevate role
    // For now, we show a success message and close
    // TODO: When backend adds change-admin endpoint, wire it here
    adminError.value = 'Cette fonctionnalité nécessite un endpoint backend dédié (à venir).'
  } finally {
    changingAdmin.value = false
  }
}

function getField(church, field) {
  return church?.structure?.[field] || church?.[field] || '—'
}

function getStatus(church) {
  return church?.structure?.status || church?.status || 'active'
}

function pastorName(c) {
  if (!c?.pastor?.id) return '—'
  return `${c.pastor.first_name ?? ''} ${c.pastor.last_name ?? ''}`.trim()
}

function adminName(c) {
  if (!c?.admin?.id) return '—'
  return `${c.admin.first_name ?? ''} ${c.admin.last_name ?? ''}`.trim()
}

function memberFullName(m) {
  return `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim()
}

onMounted(load)
</script>

<template>
  <div class="max-w-2xl">
    <RouterLink to="/churches" class="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-dark/50 hover:text-ink-dark">
      ← Retour aux églises
    </RouterLink>

    <div v-if="loading" class="py-10 text-center text-ink-dark/40">Chargement…</div>
    <p v-else-if="error" class="rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">{{ error }}</p>

    <div v-else-if="church">
      <!-- Header -->
      <div class="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-6">
        <div>
          <p class="text-xs uppercase tracking-[0.16em] text-gold">Fiche détaillée</p>
          <h1 class="mt-1 font-display text-3xl text-ink-dark">{{ getField(church, 'name') }}</h1>
          <button
            v-if="auth.canManageChurches"
            @click="toggleStatus"
            :disabled="togglingStatus"
            title="Cliquer pour changer le statut"
            class="mt-2 disabled:opacity-50"
          >
            <StatusBadge :status="getStatus(church)" />
          </button>
          <div v-else class="mt-2">
            <StatusBadge :status="getStatus(church)" />
          </div>
        </div>
        <div v-if="auth.canManageChurches" class="flex gap-2">
          <RouterLink
            :to="{ name: 'church-edit', params: { id: church.id } }"
            class="rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink-dark/70 transition hover:border-gold hover:text-ink-dark"
          >
            Modifier
          </RouterLink>
          <button
            @click="confirmArchive = true"
            class="rounded-md border border-rust/30 px-4 py-2 text-sm font-medium text-rust/80 transition hover:bg-rust/5"
          >
            Archiver
          </button>
        </div>
      </div>

      <!-- Church image -->
      <div v-if="church.church_image" class="mb-5 overflow-hidden rounded-lg border border-rule">
        <img :src="church.church_image" :alt="getField(church, 'name')" class="h-52 w-full object-cover" />
      </div>

      <!-- Info fields -->
      <dl class="mb-5 grid grid-cols-1 gap-5 rounded-lg border border-rule bg-white p-6 sm:grid-cols-2">
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Adresse</dt>
          <dd class="mt-1 text-sm text-ink-dark">{{ church.address || '—' }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Téléphone</dt>
          <dd class="mt-1 text-sm text-ink-dark">{{ getField(church, 'phone') }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Email</dt>
          <dd class="mt-1 text-sm text-ink-dark">{{ getField(church, 'email') }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Coordonnées GPS</dt>
          <dd class="mt-1 font-mono text-sm text-ink-dark">{{ church.gps_coordinates || '—' }}</dd>
        </div>
      </dl>

      <!-- Personnel section -->
      <div class="mb-5 rounded-lg border border-rule bg-white p-6">
        <h2 class="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-dark/45">Personnel</h2>

        <!-- Pastor -->
        <div class="mb-4 flex items-center justify-between rounded-md border border-rule bg-parchment/40 px-4 py-3">
          <div>
            <p class="text-[11px] uppercase tracking-wide text-ink-dark/40">Pasteur responsable</p>
            <p class="mt-0.5 text-sm font-medium text-ink-dark">{{ pastorName(church) }}</p>
            <RouterLink
              v-if="church.pastor?.id"
              :to="{ name: 'member-show', params: { id: church.pastor.id } }"
              class="mt-1 inline-block text-xs text-gold hover:underline"
            >
              Voir la fiche →
            </RouterLink>
          </div>
          <button
            v-if="auth.canManageChurches"
            @click="openPastorModal"
            class="rounded-md border border-rule bg-white px-3 py-2 text-xs font-medium text-ink-dark/70 transition hover:border-gold hover:text-ink-dark"
          >
            Changer
          </button>
        </div>

        <!-- Admin -->
        <div class="flex items-center justify-between rounded-md border border-rule bg-parchment/40 px-4 py-3">
          <div>
            <p class="text-[11px] uppercase tracking-wide text-ink-dark/40">Administrateur d'église</p>
            <p class="mt-0.5 text-sm font-medium text-ink-dark">{{ adminName(church) }}</p>
            <RouterLink
              v-if="church.admin?.id"
              :to="{ name: 'member-show', params: { id: church.admin.id } }"
              class="mt-1 inline-block text-xs text-gold hover:underline"
            >
              Voir la fiche →
            </RouterLink>
          </div>
          <button
            v-if="auth.canManageChurches"
            @click="openAdminModal"
            class="rounded-md border border-rule bg-white px-3 py-2 text-xs font-medium text-ink-dark/70 transition hover:border-gold hover:text-ink-dark"
          >
            Changer
          </button>
        </div>
      </div>

      <!-- Embedded map -->
      <div v-if="church.gps_coordinates" class="mb-5">
        <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Localisation</p>
        <MapPicker :model-value="church.gps_coordinates" :readonly="true" />
      </div>
    </div>

    <!-- Confirm archive modal -->
    <div
      v-if="confirmArchive"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="confirmArchive = false"
    >
      <div class="w-full max-w-sm rounded-lg bg-white p-6">
        <h3 class="font-display text-lg text-ink-dark">Archiver cette église ?</h3>
        <p class="mt-2 text-sm text-ink-dark/60">
          L'église ne sera plus visible dans la liste, mais ses données resteront conservées dans le registre.
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button @click="confirmArchive = false" class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark">
            Annuler
          </button>
          <button
            :disabled="archiving"
            @click="onArchive"
            class="rounded-md bg-rust px-4 py-2 text-sm font-semibold text-white transition hover:bg-rust/90 disabled:opacity-60"
          >
            {{ archiving ? 'Archivage…' : 'Archiver' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Change pastor modal -->
    <div
      v-if="showPastorModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="showPastorModal = false"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6">
        <h3 class="font-display text-lg text-ink-dark">Changer le pasteur responsable</h3>
        <p class="mt-1 text-sm text-ink-dark/50">Sélectionnez un pasteur dans la liste.</p>

        <p v-if="pastorError" class="mt-3 rounded-md border border-rust/30 bg-rust/5 px-3 py-2 text-xs text-rust">{{ pastorError }}</p>

        <div v-if="loadingPastors" class="mt-4 py-6 text-center text-sm text-ink-dark/40">Chargement des pasteurs…</div>
        <select
          v-else
          v-model="selectedPastorId"
          class="mt-4 w-full rounded-md border border-rule px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
        >
          <option value="" disabled>Sélectionner un pasteur…</option>
          <option v-for="p in pastors" :key="p.id" :value="p.id">
            {{ memberFullName(p) }} — {{ p.member_code }}
          </option>
        </select>

        <div class="mt-6 flex justify-end gap-3">
          <button @click="showPastorModal = false" class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark">
            Annuler
          </button>
          <button
            :disabled="changingPastor || !selectedPastorId"
            @click="onChangePastor"
            class="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink-dark transition hover:bg-gold-light disabled:opacity-60"
          >
            {{ changingPastor ? 'Modification…' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Change admin modal -->
    <div
      v-if="showAdminModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="showAdminModal = false"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6">
        <h3 class="font-display text-lg text-ink-dark">Changer l'administrateur</h3>
        <p class="mt-1 text-sm text-ink-dark/50">Sélectionnez un membre dans la liste.</p>

        <p v-if="adminError" class="mt-3 rounded-md border border-rust/30 bg-rust/5 px-3 py-2 text-xs text-rust">{{ adminError }}</p>

        <div v-if="loadingMembers" class="mt-4 py-6 text-center text-sm text-ink-dark/40">Chargement des membres…</div>
        <select
          v-else
          v-model="selectedAdminId"
          class="mt-4 w-full rounded-md border border-rule px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
        >
          <option value="" disabled>Sélectionner un membre…</option>
          <option v-for="m in members" :key="m.id" :value="m.id">
            {{ memberFullName(m) }} — {{ m.member_code }}
          </option>
        </select>

        <div class="mt-6 flex justify-end gap-3">
          <button @click="showAdminModal = false" class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark">
            Annuler
          </button>
          <button
            :disabled="changingAdmin || !selectedAdminId"
            @click="onChangeAdmin"
            class="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink-dark transition hover:bg-gold-light disabled:opacity-60"
          >
            {{ changingAdmin ? 'Modification…' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
