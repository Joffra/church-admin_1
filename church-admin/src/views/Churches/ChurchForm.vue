<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChurchesAPI, MembersAPI, EcclesiasticalTitlesAPI } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import MapPicker from '../../components/MapPicker.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const fieldErrors = ref({})
const imagePreview = ref(null)
const imageFile = ref(null)

// Pastors and members for personnel selections (create mode only)
const pastors = ref([])
const members = ref([])
const titles = ref([])
const loadingPastors = ref(false)
const loadingMembers = ref(false)
const loadingTitles = ref(false)

// Mode toggles for create mode
const pastorMode = ref('existing') // 'existing' | 'new'
const adminMode = ref('existing')   // 'existing' | 'new' | 'pastor'

const form = ref({
  // Church fields
  name: '',
  address: '',
  phone: '',
  email: '',
  gps_coordinates: '',
  // Pastor (select existing)
  pastor_member_id: '',
  // New pastor fields
  new_pastor_first_name: '',
  new_pastor_last_name: '',
  new_pastor_gender: '',
  new_pastor_email: '',
  new_pastor_birth_date: '',
  new_pastor_baptized: false,
  new_pastor_ecclesiastical_title_id: '',
  // Admin
  pastor_is_admin: false,
  admin_member_id: '',
  // New admin fields
  new_admin_first_name: '',
  new_admin_last_name: '',
  new_admin_gender: '',
  new_admin_email: '',
  new_admin_birth_date: '',
  new_admin_baptized: false,
  new_admin_ecclesiastical_title_id: '',
})

function onImageChange(e) {
  const file = e.target.files[0]
  if (!file) return
  imageFile.value = file
  // Revoke previous blob URL to prevent memory leaks
  if (imagePreview.value && imagePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.value)
  }
  imagePreview.value = URL.createObjectURL(file)
}

async function loadPastors() {
  loadingPastors.value = true
  try {
    const { data } = await MembersAPI.availablePastors()
    pastors.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch {
    // silent
  } finally {
    loadingPastors.value = false
  }
}

async function loadMembers() {
  loadingMembers.value = true
  try {
    const { data } = await MembersAPI.availableAdmins()
    members.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch {
    // silent
  } finally {
    loadingMembers.value = false
  }
}

async function loadTitles() {
  loadingTitles.value = true
  try {
    const { data } = await EcclesiasticalTitlesAPI.list()
    titles.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch {
    // silent
  } finally {
    loadingTitles.value = false
  }
}

async function loadChurch() {
  loading.value = true
  try {
    const { data } = await ChurchesAPI.get(route.params.id)
    const church = data.data ?? data
    const s = church.structure ?? {}
    form.value = {
      ...form.value,
      name: s.name || church.name || '',
      address: church.address || '',
      phone: s.phone || '',
      email: s.email || '',
      gps_coordinates: church.gps_coordinates || '',
    }
    if (church.church_image) imagePreview.value = church.church_image
  } catch (e) {
    error.value = "Impossible de charger les informations de l'église."
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  saving.value = true
  error.value = ''
  fieldErrors.value = {}

  const payload = new FormData()

  // Church fields
  const churchFields = ['name', 'address', 'phone', 'email', 'gps_coordinates']
  churchFields.forEach((k) => {
    const v = form.value[k]
    if (v !== null && v !== undefined && v !== '') payload.append(k, v)
  })

  if (imageFile.value) payload.append('church_image', imageFile.value)

  // Personnel fields — only on create
  if (!isEdit.value) {
    // ---- Pastor ----
    if (pastorMode.value === 'existing' && form.value.pastor_member_id) {
      payload.append('pastor_member_id', form.value.pastor_member_id)
      // Backend requires these as 'required' (not required_without) — send placeholders
      payload.append('new_pastor_birth_date', '2000-01-01')
      payload.append('new_pastor_baptized', '1')
      payload.append('new_pastor_ecclesiastical_title_id', form.value.new_pastor_ecclesiastical_title_id || titles.value[0]?.id || '1')
    } else if (pastorMode.value === 'new') {
      payload.append('new_pastor_first_name', form.value.new_pastor_first_name)
      payload.append('new_pastor_last_name', form.value.new_pastor_last_name)
      payload.append('new_pastor_gender', form.value.new_pastor_gender)
      payload.append('new_pastor_email', form.value.new_pastor_email)
      payload.append('new_pastor_birth_date', form.value.new_pastor_birth_date)
      payload.append('new_pastor_baptized', form.value.new_pastor_baptized ? '1' : '0')
      payload.append('new_pastor_ecclesiastical_title_id', form.value.new_pastor_ecclesiastical_title_id)
    }

    // ---- Admin ----
    if (form.value.pastor_is_admin || adminMode.value === 'pastor') {
      payload.append('pastor_is_admin', '1')
    } else if (adminMode.value === 'existing' && form.value.admin_member_id) {
      payload.append('admin_member_id', form.value.admin_member_id)
      // Backend requires new_admin_ecclesiastical_title_id as 'required' — send placeholder
      payload.append('new_admin_ecclesiastical_title_id', form.value.new_admin_ecclesiastical_title_id || titles.value[0]?.id || '1')
    } else if (adminMode.value === 'new') {
      payload.append('new_admin_first_name', form.value.new_admin_first_name)
      payload.append('new_admin_last_name', form.value.new_admin_last_name)
      payload.append('new_admin_gender', form.value.new_admin_gender)
      payload.append('new_admin_email', form.value.new_admin_email)
      payload.append('new_admin_birth_date', form.value.new_admin_birth_date)
      payload.append('new_admin_baptized', form.value.new_admin_baptized ? '1' : '0')
      payload.append('new_admin_ecclesiastical_title_id', form.value.new_admin_ecclesiastical_title_id)
    }
  }

  // Method spoofing for update
  if (isEdit.value) {
    payload.append('_method', 'PUT')
  }

  try {
    if (isEdit.value) {
      await ChurchesAPI.updateForm(route.params.id, payload)
    } else {
      await ChurchesAPI.createForm(payload)
    }
    router.push({ name: 'churches' })
  } catch (e) {
    if (e.response?.status === 422) {
      fieldErrors.value = e.response.data.errors || {}
      const first = Object.values(fieldErrors.value)[0]
      error.value = first?.[0] || 'Veuillez corriger les champs en surbrillance.'
    } else {
      error.value = e.response?.data?.message || "Une erreur s'est produite. Veuillez réessayer."
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (isEdit.value) {
    loadChurch()
  } else {
    loadPastors()
    loadMembers()
    loadTitles()
  }
})
</script>

<template>
  <div class="max-w-2xl">
    <div class="mb-8 border-b border-rule pb-6">
      <p class="text-xs uppercase tracking-[0.16em] text-gold">Registre</p>
      <h1 class="mt-1 font-display text-3xl text-ink-dark">
        {{ isEdit ? "Modifier l'église" : 'Ajouter une église' }}
      </h1>
      <p class="mt-1 text-sm text-ink-dark/55">
        {{ isEdit ? "Mettez à jour les informations de l'église." : 'Renseignez les informations de la nouvelle église.' }}
      </p>
    </div>

    <div v-if="loading" class="py-10 text-center text-ink-dark/40">Chargement…</div>

    <form v-else class="space-y-5 rounded-lg border border-rule bg-white p-6" @submit.prevent="onSubmit">
      <p v-if="error" class="rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
        {{ error }}
      </p>

      <!-- Nom -->
      <div>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
          Nom de l'église *
        </label>
        <input
          v-model="form.name"
          type="text"
          required
          :disabled="saving"
          class="w-full rounded-md border px-3.5 py-2.5 outline-none transition focus:ring-1 disabled:opacity-60"
          :class="fieldErrors.name ? 'border-rust focus:border-rust focus:ring-rust' : 'border-rule focus:border-gold focus:ring-gold'"
          placeholder="ex. Église de la Grâce"
        />
        <p v-if="fieldErrors.name" class="mt-1 text-xs text-rust">{{ fieldErrors.name[0] }}</p>
      </div>

      <!-- Adresse -->
      <div>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
          Adresse *
        </label>
        <input
          v-model="form.address"
          type="text"
          required
          :disabled="saving"
          class="w-full rounded-md border px-3.5 py-2.5 outline-none transition focus:ring-1 disabled:opacity-60"
          :class="fieldErrors.address ? 'border-rust focus:border-rust focus:ring-rust' : 'border-rule focus:border-gold focus:ring-gold'"
          placeholder="ex. Rue Centrale, Port-au-Prince"
        />
        <p v-if="fieldErrors.address" class="mt-1 text-xs text-rust">{{ fieldErrors.address[0] }}</p>
      </div>

      <!-- Téléphone + Email -->
      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Téléphone</label>
          <input
            v-model="form.phone"
            type="text"
            :disabled="saving"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
            placeholder="+50948242568"
          />
          <p v-if="fieldErrors.phone" class="mt-1 text-xs text-rust">{{ fieldErrors.phone[0] }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Email</label>
          <input
            v-model="form.email"
            type="email"
            :disabled="saving"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
            placeholder="contact@eglise.org"
          />
          <p v-if="fieldErrors.email" class="mt-1 text-xs text-rust">{{ fieldErrors.email[0] }}</p>
        </div>
      </div>

      <!-- GPS Coordinates with MapPicker -->
      <div>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
          Coordonnées GPS
          <span class="ml-1 normal-case text-ink-dark/35">(cliquez sur la carte pour placer le marqueur)</span>
        </label>
        <input
          v-model="form.gps_coordinates"
          type="text"
          :disabled="saving"
          class="mb-2 w-full rounded-md border border-rule px-3.5 py-2.5 font-mono text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
          placeholder="18.9712, -72.2852"
        />
        <p v-if="fieldErrors.gps_coordinates" class="mb-2 text-xs text-rust">{{ fieldErrors.gps_coordinates[0] }}</p>
        <MapPicker v-model="form.gps_coordinates" />
      </div>

      <!-- Image -->
      <div>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
          Image de l'église
          <span class="ml-1 normal-case text-ink-dark/35">(optionnel — jpeg, png, max 2 Mo)</span>
        </label>
        <div class="flex items-center gap-4">
          <div v-if="imagePreview" class="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-rule">
            <img :src="imagePreview" alt="Aperçu" class="h-full w-full object-cover" />
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            :disabled="saving"
            @change="onImageChange"
            class="block text-sm text-ink-dark/60 file:mr-3 file:rounded-md file:border-0 file:bg-parchment-dark file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-dark hover:file:bg-rule disabled:opacity-60"
          />
        </div>
        <p v-if="fieldErrors.church_image" class="mt-1 text-xs text-rust">{{ fieldErrors.church_image[0] }}</p>
      </div>

      <!-- ===== Pastor & Admin selection — only on create ===== -->
      <div v-if="!isEdit && auth.canManageChurches" class="space-y-5 border-t border-rule pt-5">
        <h2 class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-dark/45">Personnel</h2>

        <!-- Pastor: Mode toggle -->
        <div>
          <div class="mb-3 flex gap-2">
            <button
              type="button"
              @click="pastorMode = 'existing'"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition"
              :class="pastorMode === 'existing' ? 'bg-gold text-ink-dark' : 'border border-rule text-ink-dark/60 hover:border-gold'"
            >
              Pasteur existant
            </button>
            <button
              type="button"
              @click="pastorMode = 'new'"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition"
              :class="pastorMode === 'new' ? 'bg-gold text-ink-dark' : 'border border-rule text-ink-dark/60 hover:border-gold'"
            >
              Nouveau pasteur
            </button>
          </div>

          <!-- Existing pastor -->
          <div v-if="pastorMode === 'existing'">
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
              Pasteur responsable *
            </label>
            <div v-if="loadingPastors" class="py-3 text-sm text-ink-dark/40">Chargement des pasteurs…</div>
            <select
              v-else
              v-model="form.pastor_member_id"
              required
              :disabled="saving"
              class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
            >
              <option value="" disabled>Sélectionner un pasteur…</option>
              <option v-for="p in pastors" :key="p.id" :value="p.id">
                {{ p.first_name }} {{ p.last_name }} — {{ p.member_code }}
              </option>
            </select>
            <p v-if="fieldErrors.pastor_member_id" class="mt-1 text-xs text-rust">{{ fieldErrors.pastor_member_id[0] }}</p>
            <p v-if="!pastors.length && !loadingPastors" class="mt-1 text-xs text-ink-dark/40">
              Aucun pasteur disponible. Créez un nouveau pasteur ou enregistrez d'abord un membre avec le titre « Pasteur ».
            </p>
          </div>

          <!-- New pastor -->
          <div v-else class="space-y-4 rounded-md border border-rule bg-parchment/30 p-4">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Prénom *</label>
                <input v-model="form.new_pastor_first_name" type="text" required :disabled="saving"
                  class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60" />
                <p v-if="fieldErrors.new_pastor_first_name" class="mt-1 text-xs text-rust">{{ fieldErrors.new_pastor_first_name[0] }}</p>
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Nom *</label>
                <input v-model="form.new_pastor_last_name" type="text" required :disabled="saving"
                  class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60" />
                <p v-if="fieldErrors.new_pastor_last_name" class="mt-1 text-xs text-rust">{{ fieldErrors.new_pastor_last_name[0] }}</p>
              </div>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Genre *</label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2 text-sm text-ink-dark/70 cursor-pointer">
                    <input type="radio" v-model="form.new_pastor_gender" value="M" :disabled="saving" class="text-gold focus:ring-gold" /> M
                  </label>
                  <label class="flex items-center gap-2 text-sm text-ink-dark/70 cursor-pointer">
                    <input type="radio" v-model="form.new_pastor_gender" value="F" :disabled="saving" class="text-gold focus:ring-gold" /> F
                  </label>
                </div>
                <p v-if="fieldErrors.new_pastor_gender" class="mt-1 text-xs text-rust">{{ fieldErrors.new_pastor_gender[0] }}</p>
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Titre ecclésiastique *</label>
                <select v-model="form.new_pastor_ecclesiastical_title_id" required :disabled="saving || loadingTitles"
                  class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60">
                  <option value="" disabled>Sélectionner…</option>
                  <option v-for="t in titles" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
                <p v-if="fieldErrors.new_pastor_ecclesiastical_title_id" class="mt-1 text-xs text-rust">{{ fieldErrors.new_pastor_ecclesiastical_title_id[0] }}</p>
              </div>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Email *</label>
                <input v-model="form.new_pastor_email" type="email" required :disabled="saving"
                  class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60" />
                <p v-if="fieldErrors.new_pastor_email" class="mt-1 text-xs text-rust">{{ fieldErrors.new_pastor_email[0] }}</p>
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Date de naissance *</label>
                <input v-model="form.new_pastor_birth_date" type="date" required :disabled="saving"
                  class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60" />
                <p v-if="fieldErrors.new_pastor_birth_date" class="mt-1 text-xs text-rust">{{ fieldErrors.new_pastor_birth_date[0] }}</p>
              </div>
            </div>
            <div>
              <label class="flex items-center gap-2 text-sm text-ink-dark/70 cursor-pointer">
                <input type="checkbox" v-model="form.new_pastor_baptized" :disabled="saving" class="h-4 w-4 rounded border-rule text-gold focus:ring-gold" />
                Baptisé(e)
              </label>
              <p v-if="fieldErrors.new_pastor_baptized" class="mt-1 text-xs text-rust">{{ fieldErrors.new_pastor_baptized[0] }}</p>
            </div>
          </div>
        </div>

        <!-- Admin: Pastor as admin checkbox + mode toggle -->
        <div class="space-y-3">
          <label class="flex items-center gap-2 text-sm text-ink-dark/70 cursor-pointer">
            <input
              type="checkbox"
              v-model="form.pastor_is_admin"
              :disabled="saving"
              class="h-4 w-4 rounded border-rule text-gold focus:ring-gold"
            />
            Le pasteur est aussi l'administrateur de l'église
          </label>

          <div v-if="!form.pastor_is_admin">
            <div class="mb-3 flex gap-2">
              <button
                type="button"
                @click="adminMode = 'existing'"
                class="rounded-md px-3 py-1.5 text-xs font-medium transition"
                :class="adminMode === 'existing' ? 'bg-gold text-ink-dark' : 'border border-rule text-ink-dark/60 hover:border-gold'"
              >
                Admin existant
              </button>
              <button
                type="button"
                @click="adminMode = 'new'"
                class="rounded-md px-3 py-1.5 text-xs font-medium transition"
                :class="adminMode === 'new' ? 'bg-gold text-ink-dark' : 'border border-rule text-ink-dark/60 hover:border-gold'"
              >
                Nouvel admin
              </button>
            </div>

            <!-- Existing admin -->
            <div v-if="adminMode === 'existing'">
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
                Administrateur d'église *
              </label>
              <div v-if="loadingMembers" class="py-3 text-sm text-ink-dark/40">Chargement des membres…</div>
              <select
                v-else
                v-model="form.admin_member_id"
                :disabled="saving"
                class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
              >
                <option value="" disabled>Sélectionner un membre…</option>
                <option v-for="m in members" :key="m.id" :value="m.id">
                  {{ m.first_name }} {{ m.last_name }} — {{ m.member_code }}
                </option>
              </select>
              <p v-if="fieldErrors.admin_member_id" class="mt-1 text-xs text-rust">{{ fieldErrors.admin_member_id[0] }}</p>
            </div>

            <!-- New admin -->
            <div v-else class="space-y-4 rounded-md border border-rule bg-parchment/30 p-4">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Prénom *</label>
                  <input v-model="form.new_admin_first_name" type="text" required :disabled="saving"
                    class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60" />
                  <p v-if="fieldErrors.new_admin_first_name" class="mt-1 text-xs text-rust">{{ fieldErrors.new_admin_first_name[0] }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Nom *</label>
                  <input v-model="form.new_admin_last_name" type="text" required :disabled="saving"
                    class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60" />
                  <p v-if="fieldErrors.new_admin_last_name" class="mt-1 text-xs text-rust">{{ fieldErrors.new_admin_last_name[0] }}</p>
                </div>
              </div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Genre *</label>
                  <div class="flex gap-4">
                    <label class="flex items-center gap-2 text-sm text-ink-dark/70 cursor-pointer">
                      <input type="radio" v-model="form.new_admin_gender" value="M" :disabled="saving" class="text-gold focus:ring-gold" /> M
                    </label>
                    <label class="flex items-center gap-2 text-sm text-ink-dark/70 cursor-pointer">
                      <input type="radio" v-model="form.new_admin_gender" value="F" :disabled="saving" class="text-gold focus:ring-gold" /> F
                    </label>
                  </div>
                  <p v-if="fieldErrors.new_admin_gender" class="mt-1 text-xs text-rust">{{ fieldErrors.new_admin_gender[0] }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Titre ecclésiastique *</label>
                  <select v-model="form.new_admin_ecclesiastical_title_id" required :disabled="saving || loadingTitles"
                    class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60">
                    <option value="" disabled>Sélectionner…</option>
                    <option v-for="t in titles" :key="t.id" :value="t.id">{{ t.name }}</option>
                  </select>
                  <p v-if="fieldErrors.new_admin_ecclesiastical_title_id" class="mt-1 text-xs text-rust">{{ fieldErrors.new_admin_ecclesiastical_title_id[0] }}</p>
                </div>
              </div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Email *</label>
                  <input v-model="form.new_admin_email" type="email" required :disabled="saving"
                    class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60" />
                  <p v-if="fieldErrors.new_admin_email" class="mt-1 text-xs text-rust">{{ fieldErrors.new_admin_email[0] }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Date de naissance *</label>
                  <input v-model="form.new_admin_birth_date" type="date" required :disabled="saving"
                    class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60" />
                  <p v-if="fieldErrors.new_admin_birth_date" class="mt-1 text-xs text-rust">{{ fieldErrors.new_admin_birth_date[0] }}</p>
                </div>
              </div>
              <div>
                <label class="flex items-center gap-2 text-sm text-ink-dark/70 cursor-pointer">
                  <input type="checkbox" v-model="form.new_admin_baptized" :disabled="saving" class="h-4 w-4 rounded border-rule text-gold focus:ring-gold" />
                  Baptisé(e)
                </label>
                <p v-if="fieldErrors.new_admin_baptized" class="mt-1 text-xs text-rust">{{ fieldErrors.new_admin_baptized[0] }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t border-rule pt-5">
        <button
          type="button"
          @click="router.push({ name: 'churches' })"
          class="rounded-md px-4 py-2.5 text-sm font-medium text-ink-dark/60 hover:text-ink-dark"
        >
          Annuler
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-ink-dark transition hover:bg-gold-light disabled:opacity-60"
        >
          {{ saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : "Créer l'église" }}
        </button>
      </div>
    </form>
  </div>
</template>
