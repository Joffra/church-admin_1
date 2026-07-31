<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { PortalAPI } from '../../services/api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon paths (broken in Vite)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// @ts-ignore - Leaflet internal icon config
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const mission = ref(null)
const loading = ref(true)
const error = ref('')

// ---- Map state ----
const showMap = ref(false)
const mapEl = ref(null)
let mapInstance = null

function parseCoords(str) {
  if (!str) return null
  const parts = str.split(',').map(s => parseFloat(s.trim()))
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts
  return null
}

function toggleMap() {
  showMap.value = !showMap.value
  if (showMap.value) {
    nextTick(initMap)
  } else if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
}

function initMap() {
  if (mapInstance) { mapInstance.remove(); mapInstance = null }

  const churchesWithCoords = (mission.value?.churches || [])
    .map(c => ({ ...c, coords: parseCoords(c.gps_coordinates) }))
    .filter(c => c.coords)

  const allCoords = churchesWithCoords.map(c => c.coords)
  let center = [18.9712, -72.2852] // Haiti default
  let zoom = 8
  if (allCoords.length === 1) {
    center = allCoords[0]
    zoom = 14
  } else if (allCoords.length > 1) {
    // Fit bounds to include all churches
    const lats = allCoords.map(c => c[0])
    const lngs = allCoords.map(c => c[1])
    center = [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2]
    zoom = 9
  }

  mapInstance = L.map(mapEl.value).setView(center, zoom)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(mapInstance)

  churchesWithCoords.forEach(c => {
    const marker = L.marker(c.coords).addTo(mapInstance)
    const popupHtml = `<div style="min-width:180px">
      <strong>${c.name || 'Église'}</strong><br/>
      ${c.address ? '<span style="font-size:11px;color:#666">' + c.address + '</span><br/>' : ''}
      ${c.pastor?.first_name ? '<span style="font-size:11px">Pasteur: ' + (c.pastor.first_name + ' ' + (c.pastor.last_name || '')).trim() + '</span>' : ''}
    </div>`
    marker.bindPopup(popupHtml)
  })

  // If multiple churches, fit bounds
  if (allCoords.length > 1) {
    mapInstance.fitBounds(L.latLngBounds(allCoords).pad(0.1))
  }
}

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

// Build a full image URL from a backend storage path.
// Handles: full URLs (http://...), Storage::url() paths (/storage/...),
// and raw paths (churches/image.jpg).
function profileImgUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  // If it's already a /storage/ path, prepend the backend origin
  const apiBase = import.meta.env.VITE_API_BASE_URL || ''
  const origin = apiBase.replace('/api', '')
  if (path.startsWith('/storage/')) return `${origin}${path}`
  if (path.startsWith('/')) return `${origin}${path}`
  return `${origin}/storage/${path}`
}

const statusLabel = computed(() => {
  const s = mission.value?.status
  if (s === 'active' || s === 'actif') return { label: 'Actif', class: 'bg-sage/15 text-sage' }
  return { label: s || '—', class: 'bg-ink/10 text-ink-dark/60' }
})

async function loadMission() {
  loading.value = true
  error.value = ''
  try {
    const res = await PortalAPI.getMission()
    // Laravel JsonResource wraps single resources in {data: {...}}
    const payload = res.data?.data ?? res.data
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Unexpected response format')
    }
    mission.value = payload
  } catch (e) {
    console.error('[PortalMission] Failed to load mission:', {
      status: e.response?.status,
      url: e.config?.url,
      data: e.response?.data,
      message: e.message,
    })
    const status = e.response?.status
    if (status === 404) {
      error.value = "Les informations de la mission ne sont pas encore disponibles."
    } else if (status === 500) {
      error.value = "Erreur serveur. Veuillez réessayer plus tard."
    } else if (e.response?.data?.message) {
      error.value = e.response.data.message
    } else if (!e.response) {
      error.value = "Impossible de contacter le serveur. Vérifiez votre connexion."
    } else {
      error.value = "Impossible de charger les informations de la mission."
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadMission)

onUnmounted(() => {
  if (mapInstance) { mapInstance.remove(); mapInstance = null }
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
      <button
        @click="loadMission"
        class="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-parchment transition hover:bg-ink/80"
      >
        Réessayer
      </button>
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

        <!-- Map showing all churches -->
        <transition name="map-fade">
          <div v-if="showMap" class="mt-6 overflow-hidden rounded-xl border border-ink/10 shadow-md">
            <div ref="mapEl" class="h-96 w-full"></div>
          </div>
        </transition>

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
            <!-- Admin details -->
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

      <!-- ===== Comité central ===== -->
      <section v-if="mission.mission_committee?.members?.length">
        <h2 class="font-display text-2xl text-ink-dark">Comité Central</h2>
        <p class="mt-1 text-sm text-ink-dark/50">{{ mission.mission_committee.name }}</p>

        <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="member in mission.mission_committee.members"
            :key="member.id"
            class="rounded-xl border border-ink/10 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div class="flex items-center gap-3">
              <div class="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-ink/5">
                <img v-if="member.profile_picture" :src="profileImgUrl(member.profile_picture)" :alt="fullName(member)" class="h-full w-full object-cover" />
                <div v-else class="flex h-full w-full items-center justify-center font-display text-sm text-ink-dark/50">
                  {{ initials(member) }}
                </div>
              </div>
              <div class="min-w-0">
                <p class="font-medium text-ink-dark text-sm">{{ fullName(member) }}</p>
                <p v-if="member.assignment?.title?.name" class="text-xs text-gold">{{ member.assignment.title.name }}</p>
                <p v-if="member.ecclesiastical_title" class="text-xs text-ink-dark/40">{{ member.ecclesiastical_title }}</p>
              </div>
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

          <div class="grid gap-6 p-6 sm:grid-cols-2">
            <!-- Left: info -->
            <div>
              <p class="font-display text-lg text-ink-dark">{{ mission.central_church.name }}</p>
              <div class="mt-3 space-y-1.5 text-sm">
                <p class="text-ink-dark/70">{{ mission.central_church.address || '—' }}</p>
                <div class="flex gap-4">
                  <p v-if="mission.central_church.phone" class="mt-1 text-sm text-ink-dark/70">📞 {{ mission.central_church.phone }}</p>
                  <p v-if="mission.central_church.email" class="mt-0.5 text-sm text-ink-dark/70">✉ {{ mission.central_church.email }}</p>
                  <p v-if="!mission.central_church.phone && !mission.central_church.email" class="mt-1 text-sm text-ink-dark/40">—</p>
                </div>
                <div class="mt-2">
                  <span
                    class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                    :class="mission.central_church.status === 'active' || mission.central_church.status === 'actif'
                      ? 'bg-sage/15 text-sage' : 'bg-ink/10 text-ink-dark/60'"
                  >
                    {{ mission.central_church.status === 'active' ? 'Active' : mission.central_church.status }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Right: pastor & admin -->
            <div class="mt-5 grid gap-4 border-t border-rule pt-5 sm:mt-0 sm:border-t-0 sm:border-l sm:pl-6">
              <!-- Pastor -->
              <div v-if="mission.central_church.pastor?.id" class="flex items-center gap-3">
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
              <!-- Admin -->
              <div v-if="mission.central_church.admin?.id" class="flex items-center gap-3">
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
          <button
            @click="toggleMap"
            class="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-gold hover:underline"
          >
            {{ showMap ? 'Masquer la carte' : 'Voir la carte' }}
            <svg viewBox="0 0 24 24" class="h-4 w-4 transition-transform" :class="showMap ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
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

<style scoped>
.map-fade-enter-active,
.map-fade-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.map-fade-enter-from,
.map-fade-leave-to {
  opacity: 0;
  max-height: 0;
}
.map-fade-enter-to,
.map-fade-leave-from {
  max-height: 500px;
}
</style>
