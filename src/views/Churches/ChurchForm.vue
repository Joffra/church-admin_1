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

const form = ref({
  name: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  status: 'active',
})

async function loadChurch() {
  loading.value = true
  try {
    const { data } = await ChurchesAPI.get(route.params.id)
    const church = data.data ?? data
    form.value = {
      name: church.name || '',
      address: church.address || '',
      city: church.city || '',
      phone: church.phone || '',
      email: church.email || '',
      status: church.status || 'active',
    }
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
  try {
    if (isEdit.value) {
      await ChurchesAPI.update(route.params.id, form.value)
    } else {
      await ChurchesAPI.create(form.value)
    }
    router.push({ name: 'churches' })
  } catch (e) {
    if (e.response?.status === 422) {
      fieldErrors.value = e.response.data.errors || {}
      error.value = 'Veuillez corriger les champs en surbrillance.'
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
      <h1 class="mt-1 font-display text-3xl text-ink">
        {{ isEdit ? "Modifier l'église" : 'Ajouter une église' }}
      </h1>
      <p class="mt-1 text-sm text-ink/55">
        {{ isEdit ? "Mettez à jour les informations de base de l'église." : 'Renseignez les informations de base de la nouvelle église.' }}
      </p>
    </div>

    <div v-if="loading" class="py-10 text-center text-ink/40">Chargement…</div>

    <form v-else class="space-y-5 rounded-lg border border-rule bg-white p-6" @submit.prevent="onSubmit">
      <p v-if="error" class="rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
        {{ error }}
      </p>

      <div>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">Nom de l'église *</label>
        <input
          v-model="form.name"
          type="text"
          required
          class="w-full rounded-md border px-3.5 py-2.5 outline-none transition focus:ring-1"
          :class="fieldErrors.name ? 'border-rust focus:border-rust focus:ring-rust' : 'border-rule focus:border-gold focus:ring-gold'"
          placeholder="ex. Église de la Grâce"
        />
        <p v-if="fieldErrors.name" class="mt-1 text-xs text-rust">{{ fieldErrors.name[0] }}</p>
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">Adresse</label>
          <input
            v-model="form.address"
            type="text"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
            placeholder="Rue, numéro"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">Ville</label>
          <input
            v-model="form.city"
            type="text"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
            placeholder="ex. Port-au-Prince"
          />
        </div>
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">Téléphone</label>
          <input
            v-model="form.phone"
            type="text"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
            placeholder="+509…"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">Email</label>
          <input
            v-model="form.email"
            type="email"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
            placeholder="contact@eglise.org"
          />
        </div>
      </div>

      <div>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">Statut</label>
        <div class="flex rounded-md border border-rule p-1">
          <button
            type="button"
            @click="form.status = 'active'"
            class="flex-1 rounded-md py-2 text-sm font-medium transition"
            :class="form.status === 'active' ? 'bg-sage text-white' : 'text-ink/50 hover:text-ink'"
          >
            Actif
          </button>
          <button
            type="button"
            @click="form.status = 'closed'"
            class="flex-1 rounded-md py-2 text-sm font-medium transition"
            :class="form.status === 'closed' ? 'bg-rust text-white' : 'text-ink/50 hover:text-ink'"
          >
            Fermé
          </button>
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t border-rule pt-5">
        <button
          type="button"
          @click="router.push({ name: 'churches' })"
          class="rounded-md px-4 py-2.5 text-sm font-medium text-ink/60 hover:text-ink"
        >
          Annuler
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-light disabled:opacity-60"
        >
          {{ saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : "Créer l'église" }}
        </button>
      </div>
    </form>
  </div>
</template>
