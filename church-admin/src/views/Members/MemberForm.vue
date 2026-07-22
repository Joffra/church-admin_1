<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MembersAPI, EcclesiasticalTitlesAPI } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

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

const titles = ref([])

const form = ref({
  first_name: '',
  last_name: '',
  gender: '',
  phone: '',
  email: '',
  ecclesiastical_title_id: '',
  birth_date: '',
  baptized: null,
})

function onImageChange(e) {
  const file = e.target.files[0]
  if (!file) return
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

async function loadTitles() {
  try {
    const { data } = await EcclesiasticalTitlesAPI.list()
    titles.value = data.data ?? data
  } catch (e) {
    console.error('Erreur lors du chargement des titres ecclésiastiques', e)
  }
}

async function loadMember() {
  loading.value = true
  try {
    const { data } = await MembersAPI.get(route.params.id)
    const member = data.data ?? data
    
    form.value = {
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      gender: member.gender || '',
      phone: member.phone || '',
      email: member.email || '',
      ecclesiastical_title_id: member.ecclesiastical_title_id || '',
      birth_date: member.birth_date ? member.birth_date.slice(0, 10) : '',
      baptized: member.baptized !== undefined ? !!member.baptized : null,
    }
    
    if (member.profile_picture) {
      imagePreview.value = member.profile_picture
    }
  } catch (e) {
    error.value = "Impossible de charger les informations du membre."
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  saving.value = true
  error.value = ''
  fieldErrors.value = {}

  const payload = new FormData()
  Object.entries(form.value).forEach(([k, v]) => {
    if (k === 'baptized') {
      payload.append(k, v ? '1' : '0')
    } else if (v !== null && v !== undefined && v !== '') {
      payload.append(k, v)
    }
  })
  
  if (imageFile.value) {
    payload.append('profile_picture', imageFile.value)
  }
  
  // Auto-filled church_id from auth user
  const churchId = auth.churchId || auth.user?.church_id || ''
  payload.append('church_id', churchId)

  try {
    if (isEdit.value) {
      // Laravel method spoofing - always POST with _method=PUT for multipart uploads
      payload.append('_method', 'PUT')
      await MembersAPI.updateForm(route.params.id, payload)
    } else {
      await MembersAPI.createForm(payload)
    }
    router.push({ name: 'members' })
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
  await loadTitles()
  if (isEdit.value) {
    await loadMember()
  }
})
</script>

<template>
  <div class="max-w-2xl">
    <div class="mb-8 border-b border-rule pb-6">
      <p class="text-xs uppercase tracking-[0.16em] text-gold">Registre</p>
      <h1 class="mt-1 font-display text-3xl text-ink-dark">
        {{ isEdit ? "Modifier le membre" : 'Ajouter un membre' }}
      </h1>
      <p class="mt-1 text-sm text-ink-dark/55">
        {{ isEdit ? "Mettez à jour les informations du membre." : 'Renseignez les informations du nouveau membre.' }}
      </p>
    </div>

    <div v-if="loading" class="py-10 text-center text-ink-dark/40">Chargement…</div>

    <form v-else class="space-y-5 rounded-lg border border-rule bg-white p-6" @submit.prevent="onSubmit">
      <p v-if="error" class="rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
        {{ error }}
      </p>

      <!-- Profile picture -->
      <div>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
          Photo de profil
          <span class="ml-1 normal-case text-ink-dark/35">(optionnel — jpeg, png, max 2 Mo)</span>
        </label>
        <div class="flex items-center gap-4">
          <div v-if="imagePreview" class="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-rule bg-parchment-dark">
            <img :src="imagePreview" alt="Aperçu" class="h-full w-full object-cover" />
          </div>
          <div v-else class="h-16 w-16 shrink-0 flex items-center justify-center rounded-md border border-dashed border-rule bg-parchment-dark text-ink-dark/30">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            :disabled="saving"
            @change="onImageChange"
            class="block text-sm text-ink-dark/60 file:mr-3 file:rounded-md file:border-0 file:bg-parchment-dark file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-dark hover:file:bg-rule disabled:opacity-60 cursor-pointer"
          />
        </div>
        <p v-if="fieldErrors.profile_picture" class="mt-1 text-xs text-rust">{{ fieldErrors.profile_picture[0] }}</p>
      </div>

      <!-- First name & Last name -->
      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Prénom *
          </label>
          <input
            v-model="form.first_name"
            type="text"
            required
            :disabled="saving"
            class="w-full rounded-md border px-3.5 py-2.5 outline-none transition focus:ring-1 disabled:opacity-60"
            :class="fieldErrors.first_name ? 'border-rust focus:border-rust focus:ring-rust' : 'border-rule focus:border-gold focus:ring-gold'"
            placeholder="ex. Jean"
          />
          <p v-if="fieldErrors.first_name" class="mt-1 text-xs text-rust">{{ fieldErrors.first_name[0] }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Nom *
          </label>
          <input
            v-model="form.last_name"
            type="text"
            required
            :disabled="saving"
            class="w-full rounded-md border px-3.5 py-2.5 outline-none transition focus:ring-1 disabled:opacity-60"
            :class="fieldErrors.last_name ? 'border-rust focus:border-rust focus:ring-rust' : 'border-rule focus:border-gold focus:ring-gold'"
            placeholder="ex. Baptiste"
          />
          <p v-if="fieldErrors.last_name" class="mt-1 text-xs text-rust">{{ fieldErrors.last_name[0] }}</p>
        </div>
      </div>

      <!-- Gender & Ecclesiastical Title -->
      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Genre *
          </label>
          <select
            v-model="form.gender"
            required
            :disabled="saving"
            class="w-full rounded-md border bg-white px-3.5 py-2.5 outline-none transition focus:ring-1 disabled:opacity-60"
            :class="fieldErrors.gender ? 'border-rust focus:border-rust focus:ring-rust' : 'border-rule focus:border-gold focus:ring-gold'"
          >
            <option value="" disabled>Sélectionner le genre</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
          <p v-if="fieldErrors.gender" class="mt-1 text-xs text-rust">{{ fieldErrors.gender[0] }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Titre ecclésiastique *
          </label>
          <select
            v-model="form.ecclesiastical_title_id"
            required
            :disabled="saving"
            class="w-full rounded-md border bg-white px-3.5 py-2.5 outline-none transition focus:ring-1 disabled:opacity-60"
            :class="fieldErrors.ecclesiastical_title_id ? 'border-rust focus:border-rust focus:ring-rust' : 'border-rule focus:border-gold focus:ring-gold'"
          >
            <option value="" disabled>Sélectionner un titre</option>
            <option v-for="t in titles" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
          <p v-if="fieldErrors.ecclesiastical_title_id" class="mt-1 text-xs text-rust">{{ fieldErrors.ecclesiastical_title_id[0] }}</p>
        </div>
      </div>

      <!-- Phone & Email -->
      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Téléphone
          </label>
          <input
            v-model="form.phone"
            type="tel"
            :disabled="saving"
            class="w-full rounded-md border px-3.5 py-2.5 outline-none transition focus:ring-1 disabled:opacity-60"
            :class="fieldErrors.phone ? 'border-rust focus:border-rust focus:ring-rust' : 'border-rule focus:border-gold focus:ring-gold'"
            placeholder="ex. 48242568"
          />
          <p v-if="fieldErrors.phone" class="mt-1 text-xs text-rust">{{ fieldErrors.phone[0] }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Adresse Email
          </label>
          <input
            v-model="form.email"
            type="email"
            :disabled="saving"
            class="w-full rounded-md border px-3.5 py-2.5 outline-none transition focus:ring-1 disabled:opacity-60"
            :class="fieldErrors.email ? 'border-rust focus:border-rust focus:ring-rust' : 'border-rule focus:border-gold focus:ring-gold'"
            placeholder="ex. jean.baptiste@example.com"
          />
          <p v-if="fieldErrors.email" class="mt-1 text-xs text-rust">{{ fieldErrors.email[0] }}</p>
        </div>
      </div>

      <!-- Birth Date & Baptized -->
      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Date de naissance *
          </label>
          <input
            v-model="form.birth_date"
            type="date"
            required
            :disabled="saving"
            class="w-full rounded-md border px-3.5 py-2.5 outline-none transition focus:ring-1 disabled:opacity-60"
            :class="fieldErrors.birth_date ? 'border-rust focus:border-rust focus:ring-rust' : 'border-rule focus:border-gold focus:ring-gold'"
          />
          <p v-if="fieldErrors.birth_date" class="mt-1 text-xs text-rust">{{ fieldErrors.birth_date[0] }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
            Baptisé(e) *
          </label>
          <div class="flex items-center gap-6 h-[46px]">
            <label class="inline-flex items-center cursor-pointer">
              <input
                v-model="form.baptized"
                type="radio"
                :value="true"
                required
                :disabled="saving"
                class="h-4 w-4 border-rule text-gold focus:ring-gold"
              />
              <span class="ml-2 text-sm text-ink-dark">Oui</span>
            </label>
            <label class="inline-flex items-center cursor-pointer">
              <input
                v-model="form.baptized"
                type="radio"
                :value="false"
                required
                :disabled="saving"
                class="h-4 w-4 border-rule text-gold focus:ring-gold"
              />
              <span class="ml-2 text-sm text-ink-dark">Non</span>
            </label>
          </div>
          <p v-if="fieldErrors.baptized" class="mt-1 text-xs text-rust">{{ fieldErrors.baptized[0] }}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-3 border-t border-rule pt-5">
        <button
          type="button"
          @click="router.push({ name: 'members' })"
          class="rounded-md px-4 py-2.5 text-sm font-medium text-ink-dark/60 hover:text-ink-dark"
        >
          Annuler
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-ink-dark transition hover:bg-gold-light disabled:opacity-60"
        >
          {{ saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : "Créer le membre" }}
        </button>
      </div>
    </form>
  </div>
</template>
