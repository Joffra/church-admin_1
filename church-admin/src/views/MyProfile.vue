<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import { AuthAPI, MembersAPI } from '../services/api'

const auth = useAuthStore()
const toast = useToastStore()

const user = computed(() => auth.user)

// ---- Edit mode ----
const editing = ref(false)
const loading = ref(false)
const fetching = ref(false)
const errors = ref({})

// ---- Editable form fields ----
const form = ref({
  email: '',
  phone: '',
  address: '',
})

// ---- Read-only display values (from fetched member data) ----
const memberData = ref(null)

function roleLabel(role) {
  if (role === 'mission_admin') return 'Admin Mission'
  if (role === 'church_admin') return 'Admin Église'
  if (role === 'user') return 'Utilisateur'
  return role || 'Membre'
}

// Fetch the member record to get current email/phone
async function fetchMemberData() {
  const memberId = auth.userMemberId
  if (!memberId) return

  fetching.value = true
  try {
    const { data } = await MembersAPI.get(memberId)
    memberData.value = data
    // Pre-fill form with current values
    form.value = {
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
    }
  } catch (e) {
    // Backend might not return member data for simple users — that's OK
    console.warn('Could not fetch member data:', e.message)
  } finally {
    fetching.value = false
  }
}

function startEdit() {
  editing.value = true
  errors.value = {}
}

function cancelEdit() {
  editing.value = false
  errors.value = {}
  // Reset form to current values
  if (memberData.value) {
    form.value = {
      email: memberData.value.email || '',
      phone: memberData.value.phone || '',
      address: memberData.value.address || '',
    }
  }
}

async function saveProfile() {
  loading.value = true
  errors.value = {}

  try {
    const { data } = await AuthAPI.updateProfile({
      email: form.value.email,
      phone: form.value.phone,
      address: form.value.address,
    })

    // Update local member data with response
    if (data?.member) {
      memberData.value = { ...memberData.value, ...data.member }
    } else {
      memberData.value = { ...memberData.value, ...data }
    }
    editing.value = false
    toast.success('Profil mis à jour avec succès')
  } catch (e) {
    if (e.response?.status === 422 && e.response.data?.errors) {
      errors.value = e.response.data.errors
    } else if (e.response?.data?.message) {
      toast.error(e.response.data.message)
    } else if (e.code === 'ERR_NETWORK' || e.response?.status === 404 || e.response?.status === 405) {
      toast.error('Endpoint /user/profile non disponible. Le backend doit implémenter PUT /user/profile.')
    } else {
      toast.error('Impossible de mettre à jour le profil. Réessayez plus tard.')
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMemberData()
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-8 border-b border-rule pb-6">
      <h1 class="font-display text-3xl text-ink">Mon profil</h1>
      <p class="mt-1 text-sm text-ink/55">Vos informations personnelles.</p>
    </div>

    <div class="max-w-lg rounded-lg border border-rule bg-white p-8">
      <!-- Avatar + name + edit button -->
      <div class="mb-6 flex items-center gap-4">
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-gold/20 text-xl font-semibold text-gold">
          {{ (user?.first_name?.[0] || user?.member_code?.[0] || 'M').toUpperCase() }}
        </div>
        <div class="flex-1">
          <p class="text-lg font-semibold text-ink">
            {{ user?.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : user?.member_code }}
          </p>
          <span class="inline-block rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold">
            {{ roleLabel(user?.role) }}
          </span>
        </div>
        <button
          v-if="!editing"
          @click="startEdit"
          class="portal-btn flex items-center gap-1.5 rounded-md border border-rule px-3 py-1.5 text-xs font-medium text-ink/60 transition hover:border-gold hover:text-gold"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Modifier
        </button>
      </div>

      <!-- Read-only identity fields (always visible) -->
      <dl class="grid grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Code membre</dt>
          <dd class="mt-1 font-mono text-sm text-ink">{{ user?.member_code || '—' }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Rôle</dt>
          <dd class="mt-1 text-sm text-ink">{{ roleLabel(user?.role) }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Prénom</dt>
          <dd class="mt-1 text-sm text-ink">{{ user?.first_name || '—' }}</dd>
        </div>
        <div>
          <dt class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Nom</dt>
          <dd class="mt-1 text-sm text-ink">{{ user?.last_name || '—' }}</dd>
        </div>
      </dl>

      <!-- Divider -->
      <div class="my-6 border-t border-rule"></div>

      <!-- ====== EDIT MODE ====== -->
      <div v-if="editing">
        <h3 class="mb-4 text-sm font-semibold text-ink">Modifier mes coordonnées</h3>

        <form class="space-y-4" @submit.prevent="saveProfile">
          <!-- Email -->
          <div>
            <label for="email" class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
              Email
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              :disabled="loading"
              placeholder="exemple@email.com"
              class="w-full rounded-md border border-rule bg-parchment px-3.5 py-2.5 text-sm text-ink outline-none transition
                     placeholder:text-ink/30 focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:opacity-60"
            />
            <p v-if="errors.email" class="mt-1 text-xs text-rust">{{ errors.email[0] }}</p>
          </div>

          <!-- Phone -->
          <div>
            <label for="phone" class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
              Téléphone
            </label>
            <input
              id="phone"
              v-model="form.phone"
              type="tel"
              autocomplete="tel"
              :disabled="loading"
              placeholder="+509 3xxx xxxx"
              class="w-full rounded-md border border-rule bg-parchment px-3.5 py-2.5 text-sm text-ink outline-none transition
                     placeholder:text-ink/30 focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:opacity-60"
            />
            <p v-if="errors.phone" class="mt-1 text-xs text-rust">{{ errors.phone[0] }}</p>
          </div>

          <!-- Address -->
          <div>
            <label for="address" class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
              Adresse
            </label>
            <textarea
              id="address"
              v-model="form.address"
              rows="2"
              :disabled="loading"
              placeholder="Rue, ville, commune…"
              class="w-full resize-none rounded-md border border-rule bg-parchment px-3.5 py-2.5 text-sm text-ink outline-none transition
                     placeholder:text-ink/30 focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:opacity-60"
            ></textarea>
            <p v-if="errors.address" class="mt-1 text-xs text-rust">{{ errors.address[0] }}</p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 pt-2">
            <button
              type="submit"
              :disabled="loading"
              class="portal-btn rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-parchment transition disabled:opacity-60"
            >
              <span v-if="loading" class="flex items-center gap-2">
                <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Enregistrement…
              </span>
              <span v-else>Enregistrer</span>
            </button>
            <button
              type="button"
              @click="cancelEdit"
              :disabled="loading"
              class="rounded-md border border-rule px-5 py-2.5 text-sm font-medium text-ink/60 transition hover:bg-parchment disabled:opacity-60"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>

      <!-- ====== READ MODE ====== -->
      <div v-else>
        <h3 class="mb-4 text-sm font-semibold text-ink">Coordonnées</h3>

        <div v-if="fetching" class="flex items-center gap-2 py-2 text-sm text-ink/40">
          <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Chargement…
        </div>

        <dl v-else class="space-y-4">
          <div>
            <dt class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Email</dt>
            <dd class="mt-1 text-sm text-ink">{{ memberData?.email || '—' }}</dd>
          </div>
          <div>
            <dt class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Téléphone</dt>
            <dd class="mt-1 text-sm text-ink">{{ memberData?.phone || '—' }}</dd>
          </div>
          <div>
            <dt class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Adresse</dt>
            <dd class="mt-1 text-sm text-ink">{{ memberData?.address || '—' }}</dd>
          </div>
        </dl>

        <div class="mt-5 border-t border-rule pt-4">
          <p class="text-xs text-ink/40">
            Le code membre, le nom et le rôle ne peuvent pas être modifiés. Contactez un administrateur pour ces changements.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
