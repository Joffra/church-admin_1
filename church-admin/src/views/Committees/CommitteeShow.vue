<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { CommitteesAPI, MembersAPI, TitlesAPI, ChurchesAPI } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const committee = ref(null)
const loading = ref(true)
const error = ref('')
const successMessage = ref('')

// Add member modal
const showAddModal = ref(false)
const members = ref([])
const availableTitles = ref([])
const loadingMembers = ref(false)
const loadingTitles = ref(false)
const addForm = ref({ member_id: '', title_id: '' })
const addError = ref('')
const adding = ref(false)

// Remove member — now captures title_id for the backend
const removeTarget = ref(null)
const removing = ref(false)

// Edit committee
const showEditModal = ref(false)
const editForm = ref({ name: '', description: '' })
const editError = ref('')
const editing = ref(false)

// Change pastor modal
const showPastorModal = ref(false)
const pastors = ref([])
const loadingPastors = ref(false)
const selectedPastorId = ref('')
const changingPastor = ref(false)
const pastorError = ref('')

function structureLabel(type) {
  if (type === 'mission') return 'Mission'
  if (type === 'church') return 'Église'
  if (type === 'group') return 'Groupe'
  return type || '—'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

function isPasteurResponsable(member) {
  return member?.assignment?.title?.name === 'Pasteur Responsable'
}

const sortedMembers = computed(() => {
  if (!committee.value?.members) return []
  return [...committee.value.members].sort((a, b) => {
    const la = a.assignment?.title?.level ?? 999
    const lb = b.assignment?.title?.level ?? 999
    return la - lb
  })
})

async function loadCommittee() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await CommitteesAPI.get(route.params.id)
    committee.value = data.data ?? data
  } catch (e) {
    error.value = e.response?.data?.message || 'Impossible de charger ce comité.'
  } finally {
    loading.value = false
  }
}

// Preload members list in the background (used by add modal later)
const preloadedMembers = ref([])
onMounted(async () => {
  loadCommittee()
  try {
    const { data } = await MembersAPI.list()
    preloadedMembers.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch { /* silent — will reload in modal if needed */ }
})

async function openAddModal() {
  showAddModal.value = true
  addForm.value = { member_id: '', title_id: '' }
  addError.value = ''
  loadingMembers.value = true
  loadingTitles.value = true

  try {
    const [membersRes, titlesRes] = await Promise.all([
      MembersAPI.list(),
      TitlesAPI.availableFor(route.params.id),
    ])
    const allMembers = Array.isArray(membersRes.data) ? membersRes.data : (membersRes.data.data ?? [])
    const existingIds = new Set((committee.value?.members || []).map(m => m.id))
    members.value = allMembers.filter(m => !existingIds.has(m.id))

    availableTitles.value = Array.isArray(titlesRes.data) ? titlesRes.data : (titlesRes.data.data ?? [])
  } catch (e) {
    addError.value = 'Impossible de charger les données nécessaires.'
  } finally {
    loadingMembers.value = false
    loadingTitles.value = false
  }
}

async function handleAddMember() {
  if (!addForm.value.member_id || !addForm.value.title_id) {
    addError.value = 'Veuillez sélectionner un membre et un titre.'
    return
  }

  adding.value = true
  addError.value = ''
  try {
    await CommitteesAPI.addMember(route.params.id, {
      committee_id: route.params.id,
      member_id: addForm.value.member_id,
      title_id: addForm.value.title_id,
    })
    showAddModal.value = false
    successMessage.value = 'Membre affecté au comité avec succès.'
    toast.success('Membre ajouté au comité avec succès')
    await loadCommittee()
  } catch (e) {
    if (e.response?.status === 422) {
      addError.value = e.response.data?.message || 'Données invalides.'
    } else {
      addError.value = e.response?.data?.message || "Une erreur s'est produite."
    }
  } finally {
    adding.value = false
  }
}

// FIXED: Now passes both member_id AND title_id to the backend
async function handleRemoveMember() {
  if (!removeTarget.value) return
  removing.value = true
  try {
    await CommitteesAPI.removeMember(route.params.id, {
      member_id: removeTarget.value.id,
      title_id: removeTarget.value.assignment?.title?.id,
    })
    removeTarget.value = null
    successMessage.value = 'Membre retiré du comité.'
    toast.success('Membre retiré du comité avec succès')
    await loadCommittee()
  } catch (e) {
    error.value = e.response?.data?.message || "Une erreur s'est produite lors du retrait."
  } finally {
    removing.value = false
  }
}

// FIXED: Sets removeTarget with title info from the member's assignment
function setRemoveTarget(member) {
  removeTarget.value = {
    id: member.id,
    first_name: member.first_name,
    last_name: member.last_name,
    title_id: member.assignment?.title?.id,
    title_name: member.assignment?.title?.name,
  }
}

function openEditModal() {
  editForm.value = {
    name: committee.value?.name || '',
    description: committee.value?.description || '',
  }
  editError.value = ''
  showEditModal.value = true
}

async function handleEdit() {
  editing.value = true
  editError.value = ''
  try {
    await CommitteesAPI.update(route.params.id, editForm.value)
    showEditModal.value = false
    successMessage.value = 'Comité mis à jour avec succès.'
    toast.success('Comité mis à jour avec succès')
    await loadCommittee()
  } catch (e) {
    if (e.response?.status === 422) {
      editError.value = e.response.data?.message || 'Veuillez corriger les champs.'
    } else {
      editError.value = e.response?.data?.message || "Une erreur s'est produite."
    }
  } finally {
    editing.value = false
  }
}

// ---- Change pastor (reuses existing endpoint) ----
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

async function handleChangePastor() {
  if (!selectedPastorId.value) {
    pastorError.value = 'Veuillez sélectionner un pasteur.'
    return
  }
  const churchId = committee.value?.structure?.structurable_id
  if (!churchId) {
    pastorError.value = 'Impossible d\'identifier l\'église associée à ce comité.'
    return
  }
  changingPastor.value = true
  pastorError.value = ''
  try {
    await ChurchesAPI.changePastor(churchId, selectedPastorId.value)
    showPastorModal.value = false
    successMessage.value = 'Pasteur responsable changé avec succès.'
    toast.success('Pasteur responsable changé avec succès')
    await loadCommittee()
  } catch (e) {
    pastorError.value = e.response?.data?.message || 'Impossible de changer le pasteur responsable.'
  } finally {
    changingPastor.value = false
  }
}


</script>

<template>
  <div>
    <!-- Back link -->
    <RouterLink to="/committees" class="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-dark/50 hover:text-ink-dark">
      ← Retour aux comités
    </RouterLink>

    <!-- Loading -->
    <div v-if="loading" class="py-10 text-center text-ink-dark/40">Chargement du comité…</div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
      {{ error }}
    </div>

    <!-- Content -->
    <div v-else-if="committee">
      <!-- Header -->
      <div class="mb-6 border-b border-rule pb-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.16em] text-gold">
              {{ structureLabel(committee.structure?.structurable_type) }}
            </p>
            <h1 class="mt-1 font-display text-3xl text-ink-dark">{{ committee.name }}</h1>
            <p class="mt-1 text-sm text-ink-dark/55">
              {{ committee.structure?.name || '—' }}
              <span v-if="committee.description" class="mx-2">·</span>
              <span v-if="committee.description">{{ committee.description }}</span>
            </p>
          </div>
          <div v-if="auth.canManageCommittees" class="flex gap-2">
            <button
              @click="openEditModal"
              class="rounded-md border border-rule bg-white px-3 py-2 text-xs font-medium text-ink-dark/70 transition hover:border-gold hover:text-ink-dark"
            >
              Modifier
            </button>
            <button
              @click="openAddModal"
              class="rounded-md bg-gold px-3 py-2 text-xs font-semibold text-ink-dark transition hover:bg-gold/90"
            >
              + Affecter un membre
            </button>
          </div>
        </div>
      </div>

      <!-- Success message -->
      <div v-if="successMessage" class="mb-6 rounded-md border border-sage/30 bg-sage/5 px-4 py-3 text-sm text-sage">
        {{ successMessage }}
        <button @click="successMessage = ''" class="text-sage/70 hover:text-sage text-xs font-bold ml-2">✕</button>
      </div>

      <!-- Members table -->
      <div class="overflow-x-auto rounded-lg border border-rule bg-white">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-rule bg-parchment-dark/40 text-[11px] uppercase tracking-wide text-ink-dark/45">
              <th class="px-5 py-3 font-semibold">Membre</th>
              <th class="px-5 py-3 font-semibold">Code</th>
              <th class="px-5 py-3 font-semibold">Titre ecclésiastique</th>
              <th class="px-5 py-3 font-semibold">Poste au comité</th>
              <th class="px-5 py-3 font-semibold">Affecté le</th>
              <th v-if="auth.canManageCommittees" class="px-5 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!sortedMembers.length">
              <td :colspan="auth.canManageCommittees ? 6 : 5" class="px-5 py-10 text-center text-ink-dark/40">
                Aucun membre affecté à ce comité.
              </td>
            </tr>
            <tr
              v-else
              v-for="m in sortedMembers"
              :key="m.id"
              class="border-b border-rule last:border-0 hover:bg-parchment/60"
            >
              <td class="px-5 py-3.5 font-medium text-ink-dark">
                {{ m.first_name }} {{ m.last_name }}
              </td>
              <td class="px-5 py-3.5 font-mono text-xs text-ink-dark/55">{{ m.member_code || '—' }}</td>
              <td class="px-5 py-3.5 text-ink-dark/60">
                {{ m.ecclesiastical_title || '—' }}
              </td>
              <td class="px-5 py-3.5">
                <span class="inline-flex items-center rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-ink-dark/70">
                  {{ m.assignment?.title?.name || m.pivot?.title?.name || '—' }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-ink-dark/60">{{ formatDate(m.assignment?.assigned_at || m.pivot?.assigned_at) }}</td>
              <td v-if="auth.canManageCommittees" class="px-5 py-3.5 text-right">
                <!-- Pasteur Responsable: "Changer" button -->
                <button
                  v-if="isPasteurResponsable(m)"
                  @click="openPastorModal"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-dark/70 transition hover:bg-gold/10 hover:text-ink-dark"
                >
                  Changer
                </button>
                <!-- All others: "Retirer" button — FIXED: passes full member object -->
                <button
                  v-else
                  @click="setRemoveTarget(m)"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-rust/70 transition hover:bg-rust/10 hover:text-rust"
                >
                  Retirer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Member Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/40 backdrop-blur-sm"
      @click.self="showAddModal = false"
    >
      <div class="w-full max-w-md rounded-lg border border-rule bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-display text-lg font-bold text-ink-dark">Affecter un membre</h3>
          <button @click="showAddModal = false" class="text-ink-dark/40 hover:text-ink-dark transition-colors">✕</button>
        </div>

        <p v-if="addError" class="mb-3 rounded-md border border-rust/30 bg-rust/5 px-3 py-2 text-xs text-rust">{{ addError }}</p>

        <div v-if="loadingMembers || loadingTitles" class="py-6 text-center text-sm text-ink-dark/40">Chargement…</div>
        <div v-else class="space-y-4">
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Membre *</label>
            <select
              v-model="addForm.member_id"
              class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
            >
              <option value="" disabled>Sélectionner un membre…</option>
              <option v-for="m in members" :key="m.id" :value="m.id">
                {{ m.first_name }} {{ m.last_name }} — {{ m.member_code }}
              </option>
            </select>
            <p v-if="!members.length" class="mt-1 text-xs text-ink-dark/40">Tous les membres sont déjà affectés à ce comité.</p>
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Poste (titre) *</label>
            <select
              v-model="addForm.title_id"
              class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
            >
              <option value="" disabled>Sélectionner un poste…</option>
              <option v-for="t in availableTitles" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3 border-t border-rule pt-4">
          <button @click="showAddModal = false" class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark">Annuler</button>
          <button
            :disabled="adding || !addForm.member_id || !addForm.title_id"
            @click="handleAddMember"
            class="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink-dark transition hover:bg-gold/90 disabled:opacity-50"
          >
            {{ adding ? 'Affectation…' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Remove Member Modal — FIXED: shows title info -->
    <div
      v-if="removeTarget"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/40 backdrop-blur-sm"
      @click.self="removeTarget = null"
    >
      <div class="w-full max-w-sm rounded-lg border border-rule bg-white p-6 shadow-xl">
        <h3 class="font-display text-lg font-bold text-ink-dark">Retirer ce membre ?</h3>
        <p class="mt-2 text-sm text-ink-dark/60">
          Êtes-vous sûr de vouloir retirer
          <strong>{{ removeTarget.first_name }} {{ removeTarget.last_name }}</strong>
          du poste « {{ removeTarget.title_name || '—' }} »
          du comité « {{ committee?.name }} » ?
        </p>
        <div class="mt-6 flex justify-end gap-3 border-t border-rule pt-4">
          <button @click="removeTarget = null" class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark">Annuler</button>
          <button
            :disabled="removing"
            @click="handleRemoveMember"
            class="rounded-md bg-rust px-4 py-2 text-sm font-semibold text-white transition hover:bg-rust/90 disabled:opacity-50"
          >
            {{ removing ? 'Retrait…' : 'Retirer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Change Pastor Modal -->
    <div
      v-if="showPastorModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/40 backdrop-blur-sm"
      @click.self="showPastorModal = false"
    >
      <div class="w-full max-w-md rounded-lg border border-rule bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-display text-lg font-bold text-ink-dark">Changer le pasteur responsable</h3>
          <button @click="showPastorModal = false" class="text-ink-dark/40 hover:text-ink-dark transition-colors">✕</button>
        </div>

        <p v-if="pastorError" class="mb-3 rounded-md border border-rust/30 bg-rust/5 px-3 py-2 text-xs text-rust">{{ pastorError }}</p>

        <div v-if="loadingPastors" class="py-6 text-center text-sm text-ink-dark/40">Chargement des pasteurs disponibles…</div>
        <div v-else class="space-y-4">
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Nouveau pasteur responsable *</label>
            <select
              v-model="selectedPastorId"
              class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
            >
              <option value="" disabled>Sélectionner un pasteur…</option>
              <option v-for="p in pastors" :key="p.id" :value="p.id">
                {{ p.first_name }} {{ p.last_name }} — {{ p.member_code }}
              </option>
            </select>
            <p v-if="!pastors.length" class="mt-1 text-xs text-ink-dark/40">Aucun pasteur disponible.</p>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3 border-t border-rule pt-4">
          <button @click="showPastorModal = false" class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark">Annuler</button>
          <button
            :disabled="changingPastor || !selectedPastorId"
            @click="handleChangePastor"
            class="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink-dark transition hover:bg-gold/90 disabled:opacity-50"
          >
            {{ changingPastor ? 'Modification…' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Committee Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/40 backdrop-blur-sm"
      @click.self="showEditModal = false"
    >
      <div class="w-full max-w-md rounded-lg border border-rule bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-display text-lg font-bold text-ink-dark">Modifier le comité</h3>
          <button @click="showEditModal = false" class="text-ink-dark/40 hover:text-ink-dark transition-colors">✕</button>
        </div>

        <p v-if="editError" class="mb-3 rounded-md border border-rust/30 bg-rust/5 px-3 py-2 text-xs text-rust">{{ editError }}</p>

        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Nom *</label>
            <input
              v-model="editForm.name"
              type="text"
              required
              class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Description</label>
            <textarea
              v-model="editForm.description"
              rows="3"
              class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3 border-t border-rule pt-4">
          <button @click="showEditModal = false" class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark">Annuler</button>
          <button
            :disabled="editing || !editForm.name"
            @click="handleEdit"
            class="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink-dark transition hover:bg-gold/90 disabled:opacity-50"
          >
            {{ editing ? 'Modification…' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
