<script setup>
import { ref, onMounted, computed } from 'vue'
import { PortalAPI } from '../../services/api'

const churches = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')

function unwrap(payload) {
  // Laravel ResourceCollection (paginated): { data: [...], links, meta }
  // Laravel ResourceCollection (plain):    { data: [...] }
  // Plain array fallback
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function fullName(member) {
  if (!member) return '—'
  return `${member.first_name || ''} ${member.last_name || ''}`.trim()
}

// Build image URL from backend storage path
function churchImgUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const apiBase = import.meta.env.VITE_API_BASE_URL || ''
  const origin = apiBase.replace('/api', '')
  if (path.startsWith('/storage/')) return `${origin}${path}`
  if (path.startsWith('/')) return `${origin}${path}`
  return `${origin}/storage/${path}`
}

const filtered = computed(() => {
  if (!search.value) return churches.value
  const q = search.value.toLowerCase()
  return churches.value.filter(c =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.address || '').toLowerCase().includes(q) ||
    fullName(c.pastor).toLowerCase().includes(q)
  )
})

async function loadChurches() {
  loading.value = true
  error.value = ''
  try {
    const res = await PortalAPI.getChurches()
    churches.value = unwrap(res.data)
  } catch (e) {
    console.error('[PortalChurches] Failed to load churches:', {
      status: e.response?.status,
      url: e.config?.url,
      data: e.response?.data,
      message: e.message,
    })
    const status = e.response?.status
    if (status === 404) {
      error.value = "Aucune église trouvée."
    } else if (status === 500) {
      error.value = "Erreur serveur. Veuillez réessayer plus tard."
    } else if (e.response?.data?.message) {
      error.value = e.response.data.message
    } else if (!e.response) {
      error.value = "Impossible de contacter le serveur. Vérifiez votre connexion."
    } else {
      error.value = "Impossible de charger la liste des églises."
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadChurches)
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <!-- Breadcrumb -->
    <p class="text-sm text-ink-dark/40">
      <RouterLink to="/" class="hover:text-gold">Accueil</RouterLink>
      <span class="mx-2">/</span>
      <span class="text-ink-dark/60">Églises</span>
    </p>

    <div class="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 class="font-display text-4xl text-ink-dark">Nos Églises</h1>
        <p class="mt-2 text-ink-dark/50">Découvrez les églises de la mission MECEIPH.</p>
      </div>

      <!-- Search -->
      <div class="sm:w-64">
        <input
          v-model="search"
          type="text"
          placeholder="Rechercher une église..."
          class="w-full rounded-md border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink-dark placeholder:text-ink-dark/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-ink/20 border-t-gold"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="mt-8 rounded-lg border border-rust/30 bg-rust/5 p-6 text-center">
      <p class="text-rust">{{ error }}</p>
      <button
        @click="loadChurches"
        class="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-parchment transition hover:bg-ink/80"
      >
        Réessayer
      </button>
    </div>

    <!-- Empty -->
    <div v-else-if="filtered.length === 0" class="mt-8 rounded-lg border border-ink/10 bg-white p-12 text-center">
      <p class="text-ink-dark/50">Aucune église trouvée.</p>
    </div>

    <!-- Grid -->
    <div v-else class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="church in filtered"
        :key="church.id"
        :to="{ name: 'portal-church-detail', params: { id: church.id } }"
        class="church-card group overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm"
      >
        <!-- Image -->
        <div class="aspect-video overflow-hidden bg-ink/5">
          <img
            v-if="church.church_image"
            :src="churchImgUrl(church.church_image)"
            :alt="church.name"
            class="h-full w-full object-cover"
          />
          <div v-else class="flex h-full items-center justify-center">
            <svg viewBox="0 0 24 24" class="h-12 w-12 text-ink/15" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </div>

        <!-- Info -->
        <div class="p-5">
          <h2 class="font-display text-lg text-ink-dark">{{ church.name }}</h2>

          <div class="mt-3 flex items-center gap-2">
            <span
              class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="church.status === 'active' || church.status === 'actif'
                ? 'bg-sage/15 text-sage' : 'bg-ink/10 text-ink-dark/60'"
            >
              {{ church.status || 'Actif' }}
            </span>
          </div>

          <div class="mt-4 space-y-2 text-sm">
            <div v-if="church.pastor?.first_name" class="flex items-start gap-2">
              <svg viewBox="0 0 24 24" class="mt-0.5 h-4 w-4 shrink-0 text-ink-dark/30" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3Z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <p class="text-ink-dark/70">Pasteur : {{ fullName(church.pastor) }}</p>
            </div>
            <div v-if="church.address" class="flex items-start gap-2">
              <svg viewBox="0 0 24 24" class="mt-0.5 h-4 w-4 shrink-0 text-ink-dark/30" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <p class="text-ink-dark/70">{{ church.address }}</p>
            </div>
            <div v-if="church.phone" class="flex items-start gap-2">
              <svg viewBox="0 0 24 24" class="mt-0.5 h-4 w-4 shrink-0 text-ink-dark/30" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M4 4h4l2 6-3 2a12 12 0 006 6l2-3 6 2v4a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <p class="text-ink-dark/70">{{ church.phone }}</p>
            </div>
          </div>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
