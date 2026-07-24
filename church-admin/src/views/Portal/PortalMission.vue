<script setup>
import { ref, onMounted } from 'vue'
import { PortalAPI } from '../../services/api'

const mission = ref(null)
const loading = ref(true)
const error = ref('')

function fullName(member) {
  if (!member) return '—'
  return `${member.first_name || ''} ${member.last_name || ''}`.trim()
}

onMounted(async () => {
  try {
    const res = await PortalAPI.getMission()
    mission.value = res.data
  } catch (e) {
    error.value = e.response?.data?.message || "Impossible de charger les informations de la mission."
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <!-- Breadcrumb -->
    <p class="text-sm text-ink-dark/40">
      <RouterLink to="/portail" class="hover:text-gold">Accueil</RouterLink>
      <span class="mx-2">/</span>
      <span class="text-ink-dark/60">Mission</span>
    </p>

    <h1 class="mt-4 font-display text-4xl text-ink-dark">Notre Mission</h1>

    <!-- Loading -->
    <div v-if="loading" class="mt-12 flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-ink/20 border-t-gold"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="mt-12 rounded-lg border border-rust/30 bg-rust/5 p-6 text-center">
      <p class="text-rust">{{ error }}</p>
    </div>

    <!-- Mission content -->
    <div v-else-if="mission" class="mt-8 space-y-8">
      <!-- Mission header -->
      <div class="rounded-xl border border-ink/10 bg-white p-8 shadow-sm">
        <div class="grid gap-6 sm:grid-cols-2">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink-dark/40">Nom</p>
            <p class="mt-1 font-display text-2xl text-ink-dark">{{ mission.name || 'MECEIPH' }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink-dark/40">Statut</p>
            <p class="mt-1">
              <span class="inline-flex rounded-full px-3 py-1 text-sm font-medium"
                :class="mission.status === 'active' || mission.status === 'actif'
                  ? 'bg-sage/15 text-sage' : 'bg-ink/10 text-ink-dark/60'">
                {{ mission.status || 'Actif' }}
              </span>
            </p>
          </div>
          <div v-if="mission.email">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink-dark/40">Email</p>
            <p class="mt-1 text-ink-dark/80">{{ mission.email }}</p>
          </div>
          <div v-if="mission.phone">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink-dark/40">Téléphone</p>
            <p class="mt-1 text-ink-dark/80">{{ mission.phone }}</p>
          </div>
          <div v-if="mission.date_created">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink-dark/40">Date de fondation</p>
            <p class="mt-1 text-ink-dark/80">{{ new Date(mission.date_created).toLocaleDateString('fr-FR') }}</p>
          </div>
        </div>
      </div>

      <!-- Leadership -->
      <div class="grid gap-6 sm:grid-cols-2">
        <div class="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Évêque</p>
          <div class="mt-4 flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 font-display text-lg text-ink-dark">
              {{ (mission.bishop?.first_name?.[0] || '—').toUpperCase() }}
            </div>
            <div>
              <p class="font-medium text-ink-dark">{{ fullName(mission.bishop) }}</p>
              <p v-if="mission.bishop?.ecclesiastical_title" class="text-sm text-ink-dark/50">
                {{ mission.bishop.ecclesiastical_title }}
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Administrateur de la mission</p>
          <div class="mt-4 flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 font-display text-lg text-ink-dark">
              {{ (mission.mission_admin?.first_name?.[0] || '—').toUpperCase() }}
            </div>
            <div>
              <p class="font-medium text-ink-dark">{{ fullName(mission.mission_admin) }}</p>
              <p v-if="mission.mission_admin?.ecclesiastical_title" class="text-sm text-ink-dark/50">
                {{ mission.mission_admin.ecclesiastical_title }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Central church -->
      <div v-if="mission.central_church" class="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Église centrale</p>
        <div class="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p class="text-sm font-medium text-ink-dark">{{ mission.central_church.name }}</p>
            <p v-if="mission.central_church.address" class="mt-1 text-sm text-ink-dark/50">
              {{ mission.central_church.address }}
            </p>
          </div>
          <div v-if="mission.central_church.phone">
            <p class="text-xs text-ink-dark/40">Téléphone</p>
            <p class="mt-1 text-sm text-ink-dark/70">{{ mission.central_church.phone }}</p>
          </div>
          <div v-if="mission.central_church.email">
            <p class="text-xs text-ink-dark/40">Email</p>
            <p class="mt-1 text-sm text-ink-dark/70">{{ mission.central_church.email }}</p>
          </div>
        </div>
      </div>

      <!-- Churches count -->
      <div v-if="mission.churches?.length" class="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Églises rattachées</p>
        <p class="mt-2 font-display text-3xl text-ink-dark">{{ mission.churches.length }}</p>
        <p class="text-sm text-ink-dark/50">églises sous l'égide de la mission</p>
        <RouterLink
          to="/portail/eglises"
          class="mt-4 inline-flex text-sm font-medium text-gold hover:underline"
        >
          Voir toutes les églises →
        </RouterLink>
      </div>
    </div>
  </div>
</template>
