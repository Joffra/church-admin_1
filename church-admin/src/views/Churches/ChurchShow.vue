<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { ChurchesAPI, PastorsAPI } from '../../services/api'
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

// Change pastor state
const showChangePastorModal = ref(false)
const selectedPastorId = ref('')
const availablePastors = ref([])
const submittingPastor = ref(false)
const pastorError = ref('')

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

async function openChangePastorModal() {
  pastorError.value = ''
  selectedPastorId.value = church.value?.pastor?.id || ''
  showChangePastorModal.value = true
  try {
    const { data } = await PastorsAPI.list()
    availablePastors.value = data.data ?? data ?? []
  } catch (e) {
    pastorError.value = "Impossible de charger les pasteurs disponibles."
  }
}

function closeChangePastorModal() {
  showChangePastorModal.value = false
  selectedPastorId.value = ''
  availablePastors.value = []
}

async function submitChangePastor() {
  if (!selectedPastorId.value) return
  submittingPastor.value = true
  pastorError.value = ''
  try {
    await ChurchesAPI.changePastor(church.value.id, selectedPastorId.value)
    showChangePastorModal.value = false
    await load() // reload church data
  } catch (e) {
    pastorError.value = e.response?.data?.message || "Impossible de modifier le pasteur responsable."
  } finally {
    submittingPastor.value = false
  }
}

function getField(church, field) {
  return church?.structure?.[field] || church?.[field] || '—'
}

function getStatus(church) {
  return church?.structure?.status || church?.status || 'active'
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
          <!-- Status clickable only for mission_admin -->
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
        <!-- Modifier + Archiver — mission_admin only -->
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
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Pasteur responsable</dt>
          <dd class="mt-1 text-sm text-ink-dark flex flex-col items-start gap-1">
            <span>{{ church.pastor ? `${church.pastor.first_name} ${church.pastor.last_name}` : 'Non assigné' }}</span>
            <button
              v-if="auth.canManageChurches"
              @click="openChangePastorModal"
              class="text-xs font-semibold text-gold hover:text-gold-light mt-0.5"
            >
              Changer le pasteur
            </button>
          </dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-dark/40">Administrateur</dt>
          <dd class="mt-1 text-sm text-ink-dark">
            {{ church.admin ? `${church.admin.first_name} ${church.admin.last_name}` : 'Non assigné' }}
          </dd>
        </div>
      </dl>

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
      v-if="showChangePastorModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="closeChangePastorModal"
    >
      <div class="w-full max-w-sm rounded-lg bg-white p-6">
        <h3 class="font-display text-lg text-ink-dark">Changer le pasteur</h3>
        <p class="mt-1 text-sm text-ink-dark/60">
          Sélectionnez le nouveau pasteur responsable de cette église.
        </p>
        
        <form @submit.prevent="submitChangePastor" class="mt-4 space-y-4">
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
              Nouveau pasteur *
            </label>
            <select
              v-model="selectedPastorId"
              required
              :disabled="submittingPastor"
              class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60 text-ink-dark"
            >
              <option value="" disabled>-- Choisir un pasteur --</option>
              <option v-for="p in availablePastors" :key="p.id" :value="p.id">
                {{ p.first_name }} {{ p.last_name }} {{ p.member_code ? `(${p.member_code})` : '' }}
              </option>
            </select>
          </div>

          <p v-if="pastorError" class="text-xs text-rust">{{ pastorError }}</p>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              @click="closeChangePastorModal"
              class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark"
            >
              Annuler
            </button>
            <button
              type="submit"
              :disabled="submittingPastor"
              class="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink-dark transition hover:bg-gold-light disabled:opacity-60"
            >
              {{ submittingPastor ? 'Changement…' : 'Valider' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
