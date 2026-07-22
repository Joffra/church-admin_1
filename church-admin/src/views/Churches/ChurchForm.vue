<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChurchesAPI, MembersAPI, PastorsAPI, EcclesiasticalTitlesAPI } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import MapPicker from '../../components/MapPicker.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const fieldErrors = ref({})
const imagePreview = ref(null)
const imageFile = ref(null)

const pastors = ref([])
const members = ref([])
const ecclesiasticalTitles = ref([])

const form = ref({
  name: '',
  address: '',
  phone: '',
  email: '',
  gps_coordinates: '',

  // Pastor selection fields
  pastorMode: 'existing', // 'existing' | 'new'
  pastor_member_id: '',
  new_pastor_first_name: '',
  new_pastor_last_name: '',
  new_pastor_gender: 'M',
  new_pastor_email: '',
  new_pastor_birth_date: '',
  new_pastor_baptized: false,
  new_pastor_ecclesiastical_title_id: '',

  pastor_is_admin: false,

  // Admin selection fields
  adminMode: 'existing', // 'existing' | 'new'
  admin_member_id: '',
  new_admin_first_name: '',
  new_admin_last_name: '',
  new_admin_gender: 'M',
  new_admin_email: '',
  new_admin_birth_date: '',
  new_admin_baptized: false,
  new_admin_ecclesiastical_title_id: '',
})

function onImageChange(e) {
  const file = e.target.files[0]
  if (!file) return
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
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
      phone: s.phone || church.phone || '',
      email: s.email || church.email || '',
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
  
  // Basic church fields
  payload.append('name', form.value.name || '')
  payload.append('address', form.value.address || '')
  if (form.value.phone) payload.append('phone', form.value.phone)
  if (form.value.email) payload.append('email', form.value.email)
  if (form.value.gps_coordinates) payload.append('gps_coordinates', form.value.gps_coordinates)
  
  if (imageFile.value) payload.append('church_image', imageFile.value)

  if (isEdit.value) {
    // Laravel method spoofing — always POST for multipart, _method tells Laravel it's PUT
    payload.append('_method', 'PUT')
  } else {
    // CREATE mode only
    // 1. Pastor fields
    if (form.value.pastorMode === 'existing') {
      if (form.value.pastor_member_id) {
        payload.append('pastor_member_id', form.value.pastor_member_id)
      }
    } else {
      payload.append('new_pastor_first_name', form.value.new_pastor_first_name || '')
      payload.append('new_pastor_last_name', form.value.new_pastor_last_name || '')
      payload.append('new_pastor_gender', form.value.new_pastor_gender || 'M')
      if (form.value.new_pastor_email) payload.append('new_pastor_email', form.value.new_pastor_email)
      if (form.value.new_pastor_birth_date) payload.append('new_pastor_birth_date', form.value.new_pastor_birth_date)
      payload.append('new_pastor_baptized', form.value.new_pastor_baptized ? '1' : '0')
      if (form.value.new_pastor_ecclesiastical_title_id) {
        payload.append('new_pastor_ecclesiastical_title_id', form.value.new_pastor_ecclesiastical_title_id)
      }
    }

    // 2. Pastor is admin checkbox
    if (form.value.pastor_is_admin) {
      payload.append('pastor_is_admin', '1')
    } else {
      payload.append('pastor_is_admin', '0')
      // 3. Admin fields (only if pastor is not admin)
      if (form.value.adminMode === 'existing') {
        if (form.value.admin_member_id) {
          payload.append('admin_member_id', form.value.admin_member_id)
        }
      } else {
        payload.append('new_admin_first_name', form.value.new_admin_first_name || '')
        payload.append('new_admin_last_name', form.value.new_admin_last_name || '')
        payload.append('new_admin_gender', form.value.new_admin_gender || 'M')
        if (form.value.new_admin_email) payload.append('new_admin_email', form.value.new_admin_email)
        if (form.value.new_admin_birth_date) payload.append('new_admin_birth_date', form.value.new_admin_birth_date)
        payload.append('new_admin_baptized', form.value.new_admin_baptized ? '1' : '0')
        if (form.value.new_admin_ecclesiastical_title_id) {
          payload.append('new_admin_ecclesiastical_title_id', form.value.new_admin_ecclesiastical_title_id)
        }
      }
    }
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

onMounted(async () => {
  if (isEdit.value) {
    await loadChurch()
  } else {
    loading.value = true
    try {
      const [pastorsRes, membersRes, titlesRes] = await Promise.all([
        PastorsAPI.list(),
        MembersAPI.list({ per_page: 100 }),
        EcclesiasticalTitlesAPI.list(),
      ])
      // Pastors — not paginated (returns array)
      pastors.value = pastorsRes.data?.data ?? pastorsRes.data ?? []
      // Members — now paginated
      members.value = membersRes.data?.data ?? membersRes.data ?? []
      // Ecclesiastical titles
      ecclesiasticalTitles.value = titlesRes.data?.data ?? titlesRes.data ?? []
    } catch (e) {
      error.value = "Impossible de charger les listes nécessaires."
    } finally {
      loading.value = false
    }
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
          class="w-full rounded-md border px-3.5 py-2.5 outline-none transition focus:ring-1 disabled:opacity-60 bg-white text-ink-dark"
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
          class="w-full rounded-md border px-3.5 py-2.5 outline-none transition focus:ring-1 disabled:opacity-60 bg-white text-ink-dark"
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
            class="w-full rounded-md border border-rule px-3.5 py-2.5 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60 bg-white text-ink-dark"
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
            class="w-full rounded-md border border-rule px-3.5 py-2.5 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60 bg-white text-ink-dark"
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
          class="mb-2 w-full rounded-md border border-rule px-3.5 py-2.5 font-mono text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60 bg-white text-ink-dark"
          placeholder="18.9712, -72.2852"
        />
        <p v-if="fieldErrors.gps_coordinates" class="mt-1 text-xs text-rust">{{ fieldErrors.gps_coordinates[0] }}</p>
        <MapPicker v-model="form.gps_coordinates" :disabled="saving" />
      </div>

      <!-- Church Image -->
      <div>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
          Image de l'église
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          :disabled="saving"
          @change="onImageChange"
          class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm text-ink-dark/70 file:mr-3 file:rounded file:border-0 file:bg-gold/15 file:px-3 file:py-1 file:text-xs file:font-medium file:text-ink-dark"
        />
        <p v-if="fieldErrors.church_image" class="mt-1 text-xs text-rust">{{ fieldErrors.church_image[0] }}</p>
        <div v-if="imagePreview" class="mt-2">
          <img :src="imagePreview" alt="Aperçu" class="h-32 w-auto rounded-md border border-rule object-cover" />
        </div>
      </div>

      <!-- ===== Pastor & Admin sections (CREATE mode only) ===== -->
      <template v-if="!isEdit">
        <div class="border-t border-rule pt-5">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-dark/60">Pasteur responsable</h2>

          <!-- Pastor mode toggle -->
          <div class="mb-4 flex gap-4">
            <label class="flex items-center gap-2 text-sm text-ink-dark/70">
              <input type="radio" v-model="form.pastorMode" value="existing" :disabled="saving" />
              Choisir un pasteur existant
            </label>
            <label class="flex items-center gap-2 text-sm text-ink-dark/70">
              <input type="radio" v-model="form.pastorMode" value="new" :disabled="saving" />
              Créer un nouveau pasteur
            </label>
          </div>

          <!-- Existing pastor dropdown -->
          <div v-if="form.pastorMode === 'existing'">
            <select
              v-model="form.pastor_member_id"
              :disabled="saving"
              class="w-full rounded-md border border-rule bg-white px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
            >
              <option value="">— Sélectionner un pasteur —</option>
              <option v-for="p in pastors" :key="p.id" :value="p.id">
                {{ p.first_name }} {{ p.last_name }} ({{ p.member_code }})
              </option>
            </select>
          </div>

          <!-- New pastor fields -->
          <div v-else class="space-y-4 rounded-md border border-rule bg-parchment-dark/20 p-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Prénom *</label>
                <input v-model="form.new_pastor_first_name" type="text" :disabled="saving"
                  class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
                <p v-if="fieldErrors.new_pastor_first_name" class="mt-1 text-xs text-rust">{{ fieldErrors.new_pastor_first_name[0] }}</p>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Nom *</label>
                <input v-model="form.new_pastor_last_name" type="text" :disabled="saving"
                  class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
                <p v-if="fieldErrors.new_pastor_last_name" class="mt-1 text-xs text-rust">{{ fieldErrors.new_pastor_last_name[0] }}</p>
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Genre *</label>
                <select v-model="form.new_pastor_gender" :disabled="saving"
                  class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold">
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Titre ecclésiastique *</label>
                <select v-model="form.new_pastor_ecclesiastical_title_id" :disabled="saving"
                  class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold">
                  <option value="">— Sélectionner —</option>
                  <option v-for="t in ecclesiasticalTitles" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
                <p v-if="fieldErrors.new_pastor_ecclesiastical_title_id" class="mt-1 text-xs text-rust">{{ fieldErrors.new_pastor_ecclesiastical_title_id[0] }}</p>
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Email *</label>
                <input v-model="form.new_pastor_email" type="email" :disabled="saving"
                  class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
                <p v-if="fieldErrors.new_pastor_email" class="mt-1 text-xs text-rust">{{ fieldErrors.new_pastor_email[0] }}</p>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Date de naissance * (18+)</label>
                <input v-model="form.new_pastor_birth_date" type="date" :disabled="saving"
                  class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
                <p v-if="fieldErrors.new_pastor_birth_date" class="mt-1 text-xs text-rust">{{ fieldErrors.new_pastor_birth_date[0] }}</p>
              </div>
            </div>
            <div>
              <label class="flex items-center gap-2 text-sm text-ink-dark/70">
                <input type="checkbox" v-model="form.new_pastor_baptized" :disabled="saving" />
                Baptisé(e)
              </label>
            </div>
          </div>

          <!-- Pastor is admin checkbox -->
          <div class="mt-4">
            <label class="flex items-center gap-2 text-sm text-ink-dark/70">
              <input type="checkbox" v-model="form.pastor_is_admin" :disabled="saving" />
              Le pasteur est aussi l'administrateur de l'église
            </label>
          </div>
        </div>

        <!-- Admin section (hidden if pastor_is_admin) -->
        <template v-if="!form.pastor_is_admin">
          <div class="border-t border-rule pt-5">
            <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-dark/60">Administrateur de l'église</h2>

            <!-- Admin mode toggle -->
            <div class="mb-4 flex gap-4">
              <label class="flex items-center gap-2 text-sm text-ink-dark/70">
                <input type="radio" v-model="form.adminMode" value="existing" :disabled="saving" />
                Choisir un membre existant
              </label>
              <label class="flex items-center gap-2 text-sm text-ink-dark/70">
                <input type="radio" v-model="form.adminMode" value="new" :disabled="saving" />
                Créer un nouvel administrateur
              </label>
            </div>

            <!-- Existing member dropdown -->
            <div v-if="form.adminMode === 'existing'">
              <select
                v-model="form.admin_member_id"
                :disabled="saving"
                class="w-full rounded-md border border-rule bg-white px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
              >
                <option value="">— Sélectionner un membre —</option>
                <option v-for="m in members" :key="m.id" :value="m.id">
                  {{ m.first_name }} {{ m.last_name }} ({{ m.member_code }})
                </option>
              </select>
            </div>

            <!-- New admin fields -->
            <div v-else class="space-y-4 rounded-md border border-rule bg-parchment-dark/20 p-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Prénom *</label>
                  <input v-model="form.new_admin_first_name" type="text" :disabled="saving"
                    class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
                  <p v-if="fieldErrors.new_admin_first_name" class="mt-1 text-xs text-rust">{{ fieldErrors.new_admin_first_name[0] }}</p>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Nom *</label>
                  <input v-model="form.new_admin_last_name" type="text" :disabled="saving"
                    class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
                  <p v-if="fieldErrors.new_admin_last_name" class="mt-1 text-xs text-rust">{{ fieldErrors.new_admin_last_name[0] }}</p>
                </div>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Genre *</label>
                  <select v-model="form.new_admin_gender" :disabled="saving"
                    class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold">
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Titre ecclésiastique *</label>
                  <select v-model="form.new_admin_ecclesiastical_title_id" :disabled="saving"
                    class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold">
                    <option value="">— Sélectionner —</option>
                    <option v-for="t in ecclesiasticalTitles" :key="t.id" :value="t.id">{{ t.name }}</option>
                  </select>
                  <p v-if="fieldErrors.new_admin_ecclesiastical_title_id" class="mt-1 text-xs text-rust">{{ fieldErrors.new_admin_ecclesiastical_title_id[0] }}</p>
                </div>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Email *</label>
                  <input v-model="form.new_admin_email" type="email" :disabled="saving"
                    class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
                  <p v-if="fieldErrors.new_admin_email" class="mt-1 text-xs text-rust">{{ fieldErrors.new_admin_email[0] }}</p>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">Date de naissance * (16+)</label>
                  <input v-model="form.new_admin_birth_date" type="date" :disabled="saving"
                    class="w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
                  <p v-if="fieldErrors.new_admin_birth_date" class="mt-1 text-xs text-rust">{{ fieldErrors.new_admin_birth_date[0] }}</p>
                </div>
              </div>
              <div>
                <label class="flex items-center gap-2 text-sm text-ink-dark/70">
                  <input type="checkbox" v-model="form.new_admin_baptized" :disabled="saving" />
                  Baptisé(e)
                </label>
              </div>
            </div>
          </div>
        </template>
      </template>

      <!-- Actions -->
      <div class="flex justify-end gap-3 border-t border-rule pt-5">
        <button
          type="button"
          @click="router.push({ name: 'churches' })"
          class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark"
          :disabled="saving"
        >
          Annuler
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="rounded-md bg-gold px-6 py-2 text-sm font-semibold text-ink-dark transition hover:bg-gold-light disabled:opacity-60"
        >
          {{ saving ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Créer l\'église') }}
        </button>
      </div>
    </form>
  </div>
</template>
