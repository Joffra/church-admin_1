<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MembersAPI, EcclesiasticalTitlesAPI } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const props = defineProps({ id: String })
const isEdit = computed(() => !!props.id)

const loading = ref(false)
const submitting = ref(false)
const success = ref('')
const error = ref('')
const fieldErrors = ref({})

const titles = ref([])

const form = ref({
  first_name: '',
  last_name: '',
  gender: '',
  phone: '',
  email: '',
  ecclesiastical_title_id: '',
  birth_date: '',
  baptized: false,
  profile_picture: null,
})

const picturePreview = ref('')

function onPictureChange(e) {
  const file = e.target.files[0]
  if (!file) return
  form.value.profile_picture = file
  picturePreview.value = URL.createObjectURL(file)
}

function buildFormData() {
  const fd = new FormData()
  fd.append('church_id', auth.userChurchId || '')
  fd.append('first_name', form.value.first_name)
  fd.append('last_name', form.value.last_name)
  fd.append('gender', form.value.gender)
  fd.append('phone', form.value.phone || '')
  fd.append('email', form.value.email || '')
  fd.append('ecclesiastical_title_id', form.value.ecclesiastical_title_id)
  fd.append('birth_date', form.value.birth_date || '')
  fd.append('baptized', form.value.baptized ? '1' : '0')
  if (form.value.profile_picture instanceof File) {
    fd.append('profile_picture', form.value.profile_picture)
  }
  if (isEdit.value) {
    fd.append('_method', 'PUT')
  }
  return fd
}

async function onSubmit() {
  submitting.value = true
  success.value = ''
  error.value = ''
  fieldErrors.value = {}

  try {
    const fd = buildFormData()
    if (isEdit.value) {
      await MembersAPI.updateForm(props.id, fd)
      success.value = 'Membre modifié avec succès.'
    } else {
      await MembersAPI.createForm(fd)
      success.value = 'Membre ajouté avec succès.'
    }
    setTimeout(() => router.push({ name: 'members' }), 1200)
  } catch (e) {
    if (e.response?.status === 422 && e.response.data?.errors) {
      fieldErrors.value = e.response.data.errors
      error.value = e.response.data.message || 'Veuillez corriger les champs en erreur.'
    } else if (e.response?.data?.message) {
      error.value = e.response.data.message
    } else {
      error.value = "Impossible d'enregistrer le membre. Vérifiez votre connexion."
    }
  } finally {
    submitting.value = false
  }
}

async function loadMember() {
  if (!props.id) return
  loading.value = true
  try {
    const { data } = await MembersAPI.get(props.id)
    const m = data.data ?? data
    form.value.first_name = m.first_name || ''
    form.value.last_name = m.last_name || ''
    form.value.gender = m.gender || ''
    form.value.phone = m.phone || ''
    form.value.email = m.email || ''
    form.value.ecclesiastical_title_id = m.ecclesiastical_title_id || ''
    form.value.birth_date = m.birth_date || ''
    form.value.baptized = !!m.baptized
    if (m.profile_picture) picturePreview.value = m.profile_picture
  } catch (e) {
    error.value = 'Impossible de charger les informations du membre.'
  } finally {
    loading.value = false
  }
}

async function loadTitles() {
  try {
    const { data } = await EcclesiasticalTitlesAPI.list()
    titles.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch {
    // silent — titles dropdown will just be empty
  }
}

onMounted(() => {
  loadTitles()
  if (isEdit.value) loadMember()
})
</script>

<template>
  <div class="max-w-2xl">
    <div class="mb-6 border-b border-rule pb-6">
      <p class="text-xs uppercase tracking-[0.16em] text-gold">Registre</p>
      <h1 class="mt-1 font-display text-3xl text-ink-dark">
        {{ isEdit ? 'Modifier le membre' : 'Ajouter un membre' }}
      </h1>
      <p class="mt-2 text-sm text-ink-dark/50">
        {{ isEdit ? 'Mettez à jour les informations du membre.' : 'Enregistrez un nouveau membre dans le registre.' }}
      </p>
    </div>

    <div v-if="success" class="mb-5 flex items-center gap-2 rounded-md border border-sage/40 bg-sage/10 px-4 py-3 text-sm text-sage">
      <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      {{ success }}
    </div>

    <div v-if="error" class="mb-5 rounded-md border border-rust/40 bg-rust/10 px-4 py-3 text-sm text-rust">
      {{ error }}
    </div>

    <form class="space-y-5 rounded-lg border border-rule bg-white p-6" @submit.prevent="onSubmit">
      <!-- Profile picture -->
      <div>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
          Photo de profil
        </label>
        <div class="flex items-center gap-4">
          <div class="h-16 w-16 overflow-hidden rounded-full border border-rule bg-parchment-dark/30">
            <img v-if="picturePreview" :src="picturePreview" alt="Aperçu" class="h-full w-full object-cover" />
            <div v-else class="flex h-full w-full items-center justify-center text-ink-dark/30">
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M4 16l4.5-4.5a3 3 0 014 0L20 19M14 7a2 2 0 11-4 0 5 5 0 01-4 0 2 2 0 010-4z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
          </div>
          <input type="file" accept="image/jpeg,image/png,image/jpg" @change="onPictureChange" class="text-sm text-ink-dark/60 file:mr-3 file:rounded-md file:border-0 file:bg-gold/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-dark hover:file:bg-gold/20" />
        </div>
        <p v-if="fieldErrors.profile_picture" class="mt-1 text-xs text-rust">{{ fieldErrors.profile_picture[0] }}</p>
      </div>

      <!-- First name + Last name -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label for="first_name" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Prénom
          </label>
          <input
            id="first_name"
            v-model="form.first_name"
            type="text"
            required
            :disabled="submitting"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
            placeholder="Jean"
          />
          <p v-if="fieldErrors.first_name" class="mt-1 text-xs text-rust">{{ fieldErrors.first_name[0] }}</p>
        </div>
        <div>
          <label for="last_name" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Nom de famille
          </label>
          <input
            id="last_name"
            v-model="form.last_name"
            type="text"
            required
            :disabled="submitting"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
            placeholder="Pierre"
          />
          <p v-if="fieldErrors.last_name" class="mt-1 text-xs text-rust">{{ fieldErrors.last_name[0] }}</p>
        </div>
      </div>

      <!-- Gender + Ecclesiastical title -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Genre
          </label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 text-sm text-ink-dark/70 cursor-pointer">
              <input type="radio" v-model="form.gender" value="M" :disabled="submitting" class="text-gold focus:ring-gold" />
              Masculin
            </label>
            <label class="flex items-center gap-2 text-sm text-ink-dark/70 cursor-pointer">
              <input type="radio" v-model="form.gender" value="F" :disabled="submitting" class="text-gold focus:ring-gold" />
              Féminin
            </label>
          </div>
          <p v-if="fieldErrors.gender" class="mt-1 text-xs text-rust">{{ fieldErrors.gender[0] }}</p>
        </div>
        <div>
          <label for="ecclesiastical_title_id" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Titre ecclésiastique
          </label>
          <select
            id="ecclesiastical_title_id"
            v-model="form.ecclesiastical_title_id"
            required
            :disabled="submitting"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
          >
            <option value="" disabled>Sélectionner…</option>
            <option v-for="t in titles" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
          <p v-if="fieldErrors.ecclesiastical_title_id" class="mt-1 text-xs text-rust">{{ fieldErrors.ecclesiastical_title_id[0] }}</p>
        </div>
      </div>

      <!-- Phone + Email -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label for="phone" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Téléphone
          </label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            :disabled="submitting"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
            placeholder="37090000"
          />
          <p v-if="fieldErrors.phone" class="mt-1 text-xs text-rust">{{ fieldErrors.phone[0] }}</p>
        </div>
        <div>
          <label for="email" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Email
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            :disabled="submitting"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
            placeholder="jean.pierre@email.com"
          />
          <p v-if="fieldErrors.email" class="mt-1 text-xs text-rust">{{ fieldErrors.email[0] }}</p>
        </div>
      </div>

      <!-- Birth date + Baptized -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label for="birth_date" class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Date de naissance
          </label>
          <input
            id="birth_date"
            v-model="form.birth_date"
            type="date"
            :required="!isEdit"
            :disabled="submitting"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
          />
          <p v-if="fieldErrors.birth_date" class="mt-1 text-xs text-rust">{{ fieldErrors.birth_date[0] }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Baptisé
          </label>
          <label class="flex items-center gap-2.5 pt-2 text-sm text-ink-dark/70 cursor-pointer">
            <input type="checkbox" v-model="form.baptized" :disabled="submitting" class="h-4 w-4 rounded border-rule text-gold focus:ring-gold" />
            Ce membre a été baptisé
          </label>
          <p v-if="fieldErrors.baptized" class="mt-1 text-xs text-rust">{{ fieldErrors.baptized[0] }}</p>
        </div>
      </div>

      <!-- Buttons -->
      <div class="flex justify-end gap-3 pt-2">
        <button
          type="button"
          @click="router.push({ name: 'members' })"
          class="rounded-md px-4 py-2.5 text-sm font-medium text-ink-dark/60 transition hover:text-ink-dark"
        >
          Annuler
        </button>
        <button
          type="submit"
          :disabled="submitting"
          class="flex items-center justify-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-ink-dark transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg v-if="submitting" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ submitting ? 'Enregistrement…' : (isEdit ? 'Modifier' : 'Ajouter') }}
        </button>
      </div>
    </form>
  </div>
</template>
