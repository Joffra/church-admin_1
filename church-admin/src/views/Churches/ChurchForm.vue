<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChurchesAPI } from '../../services/api'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const fieldErrors = ref({})
const imagePreview = ref(null)
const imageFile = ref(null)

const form = ref({
  name: '',
  address: '',
  phone: '',
  email: '',
  gps_coordinates: '',
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
  Object.entries(form.value).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') payload.append(k, v)
  })
  if (imageFile.value) payload.append('church_image', imageFile.value)
  // Laravel method spoofing — always POST for multipart, _method tells Laravel it's PUT
  payload.append('_method', 'PUT')

  try {
    if (isEdit.value) {
      await ChurchesAPI.updateForm(route.params.id, payload)
    } else {
      // For create, remove _method=PUT
      payload.delete('_method')
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
  if (isEdit.value) loadChurch()
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
