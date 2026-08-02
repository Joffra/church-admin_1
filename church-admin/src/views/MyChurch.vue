<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ChurchesAPI, CommitteesAPI } from '../services/api'
import { useAuthStore } from '../stores/auth'
import StatusBadge from '../components/StatusBadge.vue'
import MapPicker from '../components/MapPicker.vue'

const auth = useAuthStore()
const church = ref(null)
const committee = ref(null)
const loading = ref(true)
const error = ref('')

// ---- Helpers ----
function getField(obj, key) {
  return obj?.structure?.[key] ?? obj?.[key] ?? '—'
}

const today = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})

const churchName = computed(() => church.value ? getField(church.value, 'name') : '—')
const churchStatus = computed(() => church.value?.structure?.status ?? church.value?.status ?? 'active')

// ---- Data loading ----
async function load() {
  loading.value = true
  error.value = ''
  const churchId = auth.userChurchId

  if (!churchId) {
    error.value = "Aucune église n'est associée à votre compte."
    loading.value = false
    return
  }

  try {
    const [churchRes, committeeRes] = await Promise.allSettled([
      ChurchesAPI.get(churchId),
      CommitteesAPI.showByStructure(churchId),
    ])

    if (churchRes.status === 'fulfilled') {
      church.value = churchRes.value.data?.data ?? churchRes.value.data
    } else {
      error.value = "Impossible de charger les informations de votre église."
    }

    if (committeeRes.status === 'fulfilled') {
      committee.value = committeeRes.value.data?.data ?? committeeRes.value.data
    }
    // committee 404 is acceptable — some churches may not have one yet
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
      <div>
        <p class="text-xs uppercase tracking-[0.16em] text-gold capitalize">{{ today }}</p>
        <h1 class="mt-1 font-display text-3xl text-ink">Mon Église</h1>
        <p class="mt-1 text-sm text-ink/55">
          Informations sur votre congrégation locale.
        </p>
      </div>
      <button
        @click="load"
        class="rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink/70 transition hover:border-gold hover:text-ink"
      >
        Actualiser
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-6 rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent"></div>
    </div>

    <!-- Content -->
    <div v-else-if="church" class="space-y-8">

      <!-- Church info card -->
      <div class="rounded-lg border border-rule bg-white p-6 shadow-sm">
        <!-- Image -->
        <div v-if="church.church_image" class="mb-5 overflow-hidden rounded-lg border border-rule">
          <img :src="church.church_image" :alt="churchName" class="h-52 w-full object-cover" />
        </div>

        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="font-display text-2xl text-ink">{{ churchName }}</h2>
            <p v-if="getField(church, 'address') !== '—'" class="mt-1 text-sm text-ink/55">
              {{ getField(church, 'address') }}
            </p>
          </div>
          <StatusBadge :status="churchStatus" />
        </div>

        <!-- Details grid -->
        <dl class="mt-6 grid grid-cols-1 gap-4 border-t border-rule pt-6 sm:grid-cols-2">
          <div>
            <dt class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/40">Adresse</dt>
            <dd class="mt-1 text-sm text-ink-dark">{{ getField(church, 'address') }}</dd>
          </div>
          <div>
            <dt class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/40">Membres</dt>
            <dd class="mt-1 text-sm text-ink-dark">{{ church.members?.length ?? '—' }}</dd>
          </div>
          <div v-if="church.pastor">
            <dt class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/40">Pasteur</dt>
            <dd class="mt-1 text-sm text-ink-dark">
              {{ church.pastor?.first_name }} {{ church.pastor?.last_name }}
            </dd>
          </div>
          <div v-if="church.admin_user">
            <dt class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/40">Admin Église</dt>
            <dd class="mt-1 text-sm text-ink-dark">
              {{ church.admin_user?.first_name }} {{ church.admin_user?.last_name }}
            </dd>
          </div>
        </dl>

        <!-- Map -->
        <div v-if="getField(church, 'gps_coordinates') !== '—'" class="mt-6">
          <MapPicker :model-value="getField(church, 'gps_coordinates')" :readonly="true" />
        </div>
      </div>

      <!-- Committee card -->
      <div class="rounded-lg border border-rule bg-white p-6 shadow-sm">
        <h3 class="mb-4 font-display text-xl text-ink">Comité de l'église</h3>

        <div v-if="!committee" class="py-6 text-center text-sm text-ink/40">
          Aucun comité enregistré pour cette église.
        </div>

        <template v-else>
          <div class="mb-4 flex items-center justify-between">
            <p class="text-sm text-ink/55">{{ committee.name || 'Comité local' }}</p>
            <RouterLink
              v-if="auth.canManageCommittees"
              :to="{ name: 'committee-show', params: { id: committee.id } }"
              class="rounded-md border border-rule px-3 py-1.5 text-xs text-ink/60 transition hover:border-gold hover:text-ink"
            >
              Gérer →
            </RouterLink>
          </div>

          <!-- Committee members table -->
          <div v-if="committee.members?.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-rule text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/40">
                  <th class="pb-2 pr-4">Nom</th>
                  <th class="pb-2 pr-4">Code</th>
                  <th class="pb-2">Titre</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-rule">
                <tr v-for="m in committee.members" :key="m.id" class="hover:bg-parchment/40">
                  <td class="py-2.5 pr-4 font-medium text-ink">
                    {{ m.first_name }} {{ m.last_name }}
                  </td>
                  <td class="py-2.5 pr-4 text-ink/55 font-mono text-xs">
                    {{ m.member_code || '—' }}
                  </td>
                  <td class="py-2.5 text-ink/55">
                    {{ m.pivot?.title?.name || '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-sm text-ink/40">Aucun membre dans ce comité.</p>
        </template>
      </div>

      <!-- Members quick view (only for admins) -->
      <div v-if="auth.canViewMembers && church.members?.length" class="rounded-lg border border-rule bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-display text-xl text-ink">Membres</h3>
          <RouterLink
            :to="{ name: 'members', query: { church_id: church.id } }"
            class="rounded-md border border-rule px-3 py-1.5 text-xs text-ink/60 transition hover:border-gold hover:text-ink"
          >
            Voir tout →
          </RouterLink>
        </div>
        <p class="text-sm text-ink/55">
          {{ church.members.length }} membre(s) enregistré(s) dans cette église.
        </p>
      </div>
    </div>
  </div>
</template>
