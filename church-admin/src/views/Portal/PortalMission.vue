<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { PortalAPI } from '../../services/api'

const mission = ref(null)
const loading = ref(true)
const error = ref('')

// ---- Helpers ----
function fullName(m) {
  if (!m) return '—'
  return `${m.first_name || ''} ${m.last_name || ''}`.trim()
}

function initials(m) {
  if (!m) return '?'
  return `${m.first_name?.[0] || ''}${m.last_name?.[0] || ''}`.toUpperCase()
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function profileImgUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || ''}/storage/${path}`
}

const statusLabel = computed(() => {
  const s = mission.value?.status
  if (s === 'active' || s === 'actif') return { label: 'Actif', class: 'bg-sage/15 text-sage' }
  return { label: s || '—', class: 'bg-ink/10 text-ink-dark/60' }
})

onMounted(async () => {
  try {
    const res = await PortalAPI.getMission()
    // Laravel JsonResource wraps in {data: {...}} — unwrap one level
    mission.value = res.data?.data ?? res.data
  } catch (e) {
    const status = e.response?.status
    const msg = e.response?.data?.message
    if (status === 404) {
      error.value = "Les informations de la mission ne sont pas encore disponibles."
    } else if (status === 500) {
      error.value = "Erreur serveur. Veuillez réessayer plus tard."
    } else if (msg) {
      error.value = msg
    } else {
      error.value = "Impossible de charger les informations de la mission."
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <!-- Breadcrumb -->
    <p class="text-sm text-ink-dark/40">
      <RouterLink to="/" class="hover:text-gold">Accueil</RouterLink>
      <span class="mx-2">/</span>
      <span class="text-ink-dark/60">Notre Mission</span>
    </p>

    <!-- Loading -->
    <div v-if="loading" class="mt-12 flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-ink/20 border-t-gold"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="mt-12 rounded-lg border border-rust/30 bg-rust/5 p-6 text-center">
      <p class="text-rust">{{ error }}</p>
    </div>

    <!-- ===== Mission content ===== -->
    <div v-else-if="mission" class="mt-6 space-y-10">
      <!-- Hero -->
      <section class="relative overflow-hidden rounded-2xl bg-ink">
        <div class="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent"></div>
        <div class="relative px-6 py-12 sm:px-10 sm:py-16">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gold">À propos de nous</p>
          <h1 class="mt-3 max-w-3xl font-display text-3xl leading-tight text-parchment sm:text-4xl">
            {{ mission.name || 'MECEIPH' }}
          </h1>

          <!-- Quick stats row -->
          <div class="mt-8 flex flex-wrap gap-6">
            <div v-if="mission.date_created" class="flex items-center gap-2">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <svg class="h-5 w-5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M3 10h18M8 2v4M16 2v4" stroke-linecap="round" />
                </svg>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-wide text-parchment/40">Fondée en</p>
                <p class="text-sm font-medium text-parchment">{{ formatDate(mission.date_created) }}</p>
              </div>
            </div>

            <div v-if="mission.age != null" class="flex items-center gap-2">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <svg class="h-5 w-5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" stroke-linecap="round" />
                </svg>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-wide text-parchment/40">Âge</p>
                <p class="text-sm font-medium text-parchment">{{ mission.age }} ans</p>
              </div>
            </div>

            <div v-if="mission.churches?.length" class="flex items-center gap-2">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <svg class="h-5 w-5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-wide text-parchment/40">Églises</p>
                <p class="text-sm font-medium text-parchment">{{ mission.churches.length }}</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <svg class="h-5 w-5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-wide text-parchment/40">Statut</p>
                <p class="text-sm font-medium text-parchment">{{ statusLabel.label }}</p>
              </div>
            </div>
          </div>

          <!-- Contact -->
          <div v-if="mission.email || mission.phone" class="mt-6 flex flex-wrap gap-4 text-sm">
            <a v-if="mission.email" :href="`mailto:${mission.email}`" class="text-parchment/60 hover:text-gold transition">
              ✉ {{ mission.email }}
            </a>
            <span v-if="mission.phone" class="text-parchment/60">📞 {{ mission.phone }}</span>
          </div>
        </div>
      </section>

      <!-- ===== Direction / Leadership ===== -->
      <section>
        <h2 class="font-display text-2xl text-ink-dark">Direction de la Mission</h2>
        <p class="mt-1 text-sm text-ink-dark/50">Les responsables qui assurent le leadership spirituel et administratif.</p>

        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <!-- Bishop -->
          <div v-if="mission.bishop" class="rounded-xl border border-ink/10 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div class="flex items-center gap-4">
              <!-- Profile picture or initials -->
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-ink/5">
                <img v-if="mission.bishop.profile_picture" :src="profileImgUrl(mission.bishop.profile_picture)" :alt="fullName(mission.bishop)" class="h-full w-full object-cover" />
                <div v-else class="flex h-full w-full items-center justify-center font-display text-xl text-ink-dark/50">
                  {{ initials(mission.bishop) }}
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-gold">Évêque / Pasteur Responsable</p>
                <p class="mt-0.5 font-medium text-ink-dark">{{ fullName(mission.bishop) }}</p>
                <p v-if="mission.bishop.ecclesiastical_title" class="text-sm text-ink-dark/50">{{ mission.bishop.ecclesiastical_title }}</p>
              </div>
            </div>
            <!-- Bishop details -->
            <div class="mt-4 space-y-1.5 border-t border-rule pt-3 text-sm">
              <p v-if="mission.bishop.email" class="flex items-center gap-2 text-ink-dark/60">
                <svg class="h-3.5 w-3.5 text-ink-dark/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v12H4zM4 16l4-4 4 4 4-4 4 4M4 20l6-6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {{ mission.bishop.email }}
              </p>
              <p v-if="mission.bishop.phone" class="flex items-center gap-2 text-ink-dark/60">
                <svg class="h-3.5 w-3.5 text-ink-dark/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 014.12 4.18 2 2 0 016.1 2h3a2 2 0 012 1.72c.13.96.37 1.9.7 2.81a2 2 0 01-.45 2.11L10.1 9.9a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0122 16.92z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {{ mission.bishop.phone }}
              </p>
              <p v-if="mission.bishop.church?.name" class="flex items-center gap-2 text-ink-dark/60">
                <svg class="h-3.5 w-3.5 text-ink-dark/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {{ mission.bishop.church.name }}
              </p>
            </div>
          </div>

          <!-- Mission Admin -->
          <div v-if="mission.mission_admin" class="rounded-xl border border-ink/10 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div class="flex items-center gap-4">
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-ink/5">
                <img v-if="mission.mission_admin.profile_picture" :src="profileImgUrl(mission.mission_admin.profile_picture)" :alt="fullName(mission.mission_admin)" class="h-full w-full object-cover" />
                <div v-else class="flex h-full w-full items-center justify-center font-display text-xl text-ink-dark/50">
                  {{ initials(mission.mission_admin) }}
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-gold">Administrateur de la Mission</p>
                <p class="mt-0.5 font-medium text-ink-dark">{{ fullName(mission.mission_admin) }}</p>
                <p v-if="mission.mission_admin.ecclesiastical_title" class="text-sm text-ink-dark/50">{{ mission.mission_admin.ecclesiastical_title }}</p>
              </div>
            </div>
            <div class="mt-4 space-y-1.5 border-t border-rule pt-3 text-sm">
              <p v-if="mission.mission_admin.email" class="flex items-center gap-2 text-ink-dark/60">
                <svg class="h-3.5 w-3.5 text-ink-dark/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v12H4zM4 16l4-4 4 4 4-4 4 4M4 20l6-6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {{ mission.mission_admin.email }}
              </p>
              <p v-if="mission.mission_admin.phone" class="flex items-center gap-2 text-ink-dark/60">
                <svg class="h-3.5 w-3.5 text-ink-dark/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 014.12 4.18 2 2 0 016.1 2h3a2 2 0 012 1.72c.13.96.37 1.9.7 2.81a2 2 0 01-.45 2.11L10.1 9.9a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0122 16.92z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {{ mission.mission_admin.phone }}
              </p>
              <p v-if="mission.mission_admin.church?.name" class="flex items-center gap-2 text-ink-dark/60">
                <svg class="h-3.5 w-3.5 text-ink-dark/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {{ mission.mission_admin.church.name }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Comité de la mission ===== -->
      <section v-if="mission.mission_committee?.members?.length">
        <h2 class="font-display text-2xl text-ink-dark">Comité de la Mission</h2>
        <p class="mt-1 text-sm text-ink-dark/50">{{ mission.mission_committee.name }}</p>

        <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="member in mission.mission_committee.members"
            :key="member.id"
            class="flex items-start gap-3 rounded-xl border border-ink/10 bg-white p-4 shadow-sm transition hover:border-gold/30 hover:shadow-md"
          >
            <div class="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-ink/5">
              <img v-if="member.profile_picture" :src="profileImgUrl(member.profile_picture)" :alt="fullName(member)" class="h-full w-full object-cover" />
              <div v-else class="flex h-full w-full items-center justify-center font-display text-base text-ink-dark/50">
                {{ initials(member) }}
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-ink-dark text-sm">{{ fullName(member) }}</p>
              <p class="text-xs text-gold font-medium">{{ member.assignment?.title?.name || '—' }}</p>
              <p v-if="member.ecclesiastical_title" class="text-xs text-ink-dark/40">{{ member.ecclesiastical_title }}</p>
              <p v-if="member.assignment?.assigned_at" class="mt-0.5 text-[10px] text-ink-dark/30">
                Depuis {{ formatDate(member.assignment.assigned_at) }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Église centrale (HQ) ===== -->
      <section v-if="mission.central_church">
        <h2 class="font-display text-2xl text-ink-dark">Église Centrale (Siège)</h2>
        <p class="mt-1 text-sm text-ink-dark/50">Le siège principal de la mission.</p>

        <div class="mt-6 rounded-xl border border-ink/10 bg-white shadow-sm overflow-hidden">
          <!-- Church image banner -->
          <div v-if="mission.central_church.church_image" class="h-40 w-full bg-ink/5">
            <img :src="profileImgUrl(mission.central_church.church_image)" :alt="mission.central_church.name" class="h-full w-full object-cover" />
          </div>
          <div v-else class="h-24 w-full bg-gradient-to-r from-ink to-ink/80 flex items-center px-6">
            <p class="font-display text-lg text-parchment/80">{{ mission.central_church.name }}</p>
          </div>

          <div class="p-6">
            <div class="grid gap-5 sm:grid-cols-3">
              <!-- Address -->
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wide text-ink-dark/40">Adresse</p>
                <p class="mt-1 text-sm text-ink-dark/70">{{ mission.central_church.address || '—' }}</p>
              </div>
              <!-- Contact -->
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wide text-ink-dark/40">Contact</p>
                <p v-if="mission.central_church.phone" class="mt-1 text-sm text-ink-dark/70">📞 {{ mission.central_church.phone }}</p>
                <p v-if="mission.central_church.email" class="mt-0.5 text-sm text-ink-dark/70">✉ {{ mission.central_church.email }}</p>
                <p v-if="!mission.central_church.phone && !mission.central_church.email" class="mt-1 text-sm text-ink-dark/40">—</p>
              </div>
              <!-- Status -->
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wide text-ink-dark/40">Statut</p>
                <p class="mt-1">
                  <span class="inline-flex rounded-full bg-sage/15 px-2.5 py-0.5 text-xs font-medium text-sage">
                    {{ mission.central_church.status === 'active' ? 'Active' : mission.central_church.status }}
                  </span>
                </p>
              </div>
            </div>

            <!-- Pastor & Admin -->
            <div class="mt-5 grid gap-4 border-t border-rule pt-5 sm:grid-cols-2">
              <div v-if="mission.central_church.pastor" class="flex items-center gap-3">
                <div class="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-ink/5">
                  <img v-if="mission.central_church.pastor.profile_picture" :src="profileImgUrl(mission.central_church.pastor.profile_picture)" :alt="fullName(mission.central_church.pastor)" class="h-full w-full object-cover" />
                  <div v-else class="flex h-full w-full items-center justify-center font-display text-sm text-ink-dark/50">{{ initials(mission.central_church.pastor) }}</div>
                </div>
                <div>
                  <p class="text-[10px] uppercase tracking-wide text-ink-dark/40">Pasteur</p>
                  <p class="text-sm font-medium text-ink-dark">{{ fullName(mission.central_church.pastor) }}</p>
                  <p v-if="mission.central_church.pastor.ecclesiastical_title" class="text-xs text-ink-dark/40">{{ mission.central_church.pastor.ecclesiastical_title }}</p>
                </div>
              </div>
              <div v-if="mission.central_church.admin" class="flex items-center gap-3">
                <div class="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-ink/5">
                  <img v-if="mission.central_church.admin.profile_picture" :src="profileImgUrl(mission.central_church.admin.profile_picture)" :alt="fullName(mission.central_church.admin)" class="h-full w-full object-cover" />
                  <div v-else class="flex h-full w-full items-center justify-center font-display text-sm text-ink-dark/50">{{ initials(mission.central_church.admin) }}</div>
                </div>
                <div>
                  <p class="text-[10px] uppercase tracking-wide text-ink-dark/40">Administrateur</p>
                  <p class="text-sm font-medium text-ink-dark">{{ fullName(mission.central_church.admin) }}</p>
                  <p v-if="mission.central_church.admin.ecclesiastical_title" class="text-xs text-ink-dark/40">{{ mission.central_church.admin.ecclesiastical_title }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Églises rattachées ===== -->
      <section v-if="mission.churches?.length">
        <div class="flex items-end justify-between">
          <div>
            <h2 class="font-display text-2xl text-ink-dark">Églises de la Mission</h2>
            <p class="mt-1 text-sm text-ink-dark/50">{{ mission.churches.length }} église{{ mission.churches.length > 1 ? 's' : '' }} rattachée{{ mission.churches.length > 1 ? 's' : '' }} à la mission.</p>
          </div>
          <RouterLink to="/eglises" class="hidden sm:inline-flex text-sm font-medium text-gold hover:underline">
            Voir la carte →
          </RouterLink>
        </div>

        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div
            v-for="church in mission.churches"
            :key="church.id"
            class="rounded-xl border border-ink/10 bg-white shadow-sm overflow-hidden transition hover:shadow-md hover:border-gold/30"
          >
            <!-- Image banner -->
            <div v-if="church.church_image" class="h-32 w-full">
              <img :src="profileImgUrl(church.church_image)" :alt="church.name" class="h-full w-full object-cover" />
            </div>
            <div v-else class="h-20 w-full bg-gradient-to-r from-ink/80 to-ink/60 flex items-center px-5">
              <svg class="h-6 w-6 text-gold/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>

            <div class="p-5">
              <p class="font-display text-base text-ink-dark">{{ church.name }}</p>
              <p v-if="church.address" class="mt-1 text-xs text-ink-dark/50 flex items-center gap-1.5">
                <svg class="h-3 w-3 text-ink-dark/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ church.address }}
              </p>

              <!-- Pastor & Admin mini -->
              <div class="mt-4 flex flex-wrap gap-3 border-t border-rule pt-3">
                <div v-if="church.pastor?.id" class="flex items-center gap-2">
                  <div class="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-ink/5">
                    <img v-if="church.pastor.profile_picture" :src="profileImgUrl(church.pastor.profile_picture)" :alt="fullName(church.pastor)" class="h-full w-full object-cover" />
                    <div v-else class="flex h-full w-full items-center justify-center text-[10px] font-medium text-ink-dark/50">{{ initials(church.pastor) }}</div>
                  </div>
                  <div>
                    <p class="text-[9px] uppercase tracking-wide text-ink-dark/30">Pasteur</p>
                    <p class="text-xs font-medium text-ink-dark">{{ fullName(church.pastor) }}</p>
                  </div>
                </div>
                <div v-if="church.admin?.id" class="flex items-center gap-2">
                  <div class="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-ink/5">
                    <img v-if="church.admin.profile_picture" :src="profileImgUrl(church.admin.profile_picture)" :alt="fullName(church.admin)" class="h-full w-full object-cover" />
                    <div v-else class="flex h-full w-full items-center justify-center text-[10px] font-medium text-ink-dark/50">{{ initials(church.admin) }}</div>
                  </div>
                  <div>
                    <p class="text-[9px] uppercase tracking-wide text-ink-dark/30">Admin</p>
                    <p class="text-xs font-medium text-ink-dark">{{ fullName(church.admin) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
