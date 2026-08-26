<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { PortalAPI } from '../../services/api'

const route = useRoute()
const church = ref(null)
const loading = ref(true)
const error = ref('')
const imageError = ref(false)

function fullName(member) {
  if (!member) return '—'
  return `${member.first_name || ''} ${member.last_name || ''}`.trim()
}

function churchImgUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const apiBase = import.meta.env.VITE_API_BASE_URL || ''
  const origin = apiBase.replace('/api', '')
  if (path.startsWith('/storage/')) return `${origin}${path}`
  if (path.startsWith('/')) return `${origin}${path}`
  return `${origin}/storage/${path}`
}

// Show only public-safe info — no member counts, no admin details, no GPS coords
const publicInfo = computed(() => {
  if (!church.value) return null
  return {
    name: church.value.name,
    image: church.value.church_image,
    address: church.value.address,
    phone: church.value.phone,
    email: church.value.email,
    status: church.value.status,
    pastor: church.value.pastor ? {
      name: fullName(church.value.pastor),
      title: church.value.pastor?.ecclesiastical_title?.name || 'Pasteur',
    } : null,
    description: church.value.description || church.value.mission_statement,
    founded_date: church.value.founded_date,
  }
})

async function loadChurch() {
  loading.value = true
  error.value = ''
  try {
    // Try dedicated endpoint first, fall back to filtering from list
    try {
      const res = await PortalAPI.getChurch(route.params.id)
      const payload = res.data?.data ?? res.data
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        church.value = payload
        return
      }
    } catch { /* fall back to list */ }
    
    // Fallback: fetch all and filter (still safe — public resource strips sensitive fields)
    const res = await PortalAPI.getChurches()
    const payload = res.data?.data ?? res.data
    const all = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : [])
    church.value = all.find(c => String(c.id) === String(route.params.id)) || null
    if (!church.value) {
      error.value = "Cette église est introuvable."
    }
  } catch (e) {
    const status = e.response?.status
    if (status === 404) {
      error.value = "Cette église est introuvable."
    } else if (!e.response) {
      error.value = "Impossible de contacter le serveur."
    } else {
      error.value = "Impossible de charger les informations de cette église."
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadChurch)
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <!-- Breadcrumb -->
    <p class="text-sm text-ink-dark/40">
      <RouterLink to="/" class="hover:text-gold">Accueil</RouterLink>
      <span class="mx-2">/</span>
      <RouterLink to="/eglises" class="hover:text-gold">Églises</RouterLink>
      <span class="mx-2">/</span>
      <span class="text-ink-dark/60">{{ publicInfo?.name || '…' }}</span>
    </p>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-ink/20 border-t-gold"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="mt-8 rounded-lg border border-rust/30 bg-rust/5 p-6 text-center">
      <p class="text-rust">{{ error }}</p>
      <RouterLink to="/eglises" class="mt-4 inline-block rounded-lg bg-ink px-4 py-2 text-sm font-medium text-parchment transition hover:bg-ink/80">
        ← Retour aux églises
      </RouterLink>
    </div>

    <!-- Church detail -->
    <article v-else-if="publicInfo" class="mt-6">
      <!-- Hero image -->
      <div class="relative overflow-hidden rounded-xl bg-ink/5" style="aspect-ratio: 21/9">
        <img
          v-if="publicInfo.image && !imageError"
          :src="churchImgUrl(publicInfo.image)"
          :alt="publicInfo.name"
          class="h-full w-full object-cover"
          @error="imageError = true"
        />
        <div v-else class="flex h-full items-center justify-center">
          <svg viewBox="0 0 24 24" class="h-16 w-16 text-ink/15" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <!-- Name overlay -->
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink-dark/80 to-transparent p-6">
          <h1 class="font-display text-3xl text-parchment">{{ publicInfo.name }}</h1>
          <span
            class="mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="publicInfo.status === 'active' || publicInfo.status === 'actif'
              ? 'bg-sage/20 text-sage' : 'bg-white/20 text-parchment/70'"
          >
            {{ publicInfo.status || 'Actif' }}
          </span>
        </div>
      </div>

      <!-- Info grid -->
      <div class="mt-8 grid gap-6 sm:grid-cols-2">
        <!-- Pastor -->
        <div v-if="publicInfo.pastor" class="rounded-lg border border-ink/10 bg-white p-6">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold">
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3Z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-ink-dark/40">{{ publicInfo.pastor.title }}</p>
              <p class="font-display text-lg text-ink-dark">{{ publicInfo.pastor.name }}</p>
            </div>
          </div>
        </div>

        <!-- Address -->
        <div v-if="publicInfo.address" class="rounded-lg border border-ink/10 bg-white p-6">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink-dark/60">
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-ink-dark/40">Adresse</p>
              <p class="text-sm text-ink-dark/80">{{ publicInfo.address }}</p>
            </div>
          </div>
        </div>

        <!-- Phone -->
        <div v-if="publicInfo.phone" class="rounded-lg border border-ink/10 bg-white p-6">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink-dark/60">
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M4 4h4l2 6-3 2a12 12 0 006 6l2-3 6 2v4a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-ink-dark/40">Téléphone</p>
              <p class="text-sm text-ink-dark/80">{{ publicInfo.phone }}</p>
            </div>
          </div>
        </div>

        <!-- Email -->
        <div v-if="publicInfo.email" class="rounded-lg border border-ink/10 bg-white p-6">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink-dark/60">
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M4 4h16v12H4zM4 16l4-4 4 4 4-4 4 4M4 20l6-6 6 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-ink-dark/40">Email</p>
              <p class="text-sm text-ink-dark/80">{{ publicInfo.email }}</p>
            </div>
          </div>
        </div>

        <!-- Founded date -->
        <div v-if="publicInfo.founded_date" class="rounded-lg border border-ink/10 bg-white p-6">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink-dark/60">
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 9h18M8 3v4M16 3v4" stroke-linecap="round" />
              </svg>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-ink-dark/40">Fondée en</p>
              <p class="text-sm text-ink-dark/80">{{ new Date(publicInfo.founded_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div v-if="publicInfo.description" class="mt-8 rounded-lg border border-ink/10 bg-white p-8">
        <h2 class="font-display text-xl text-ink-dark">À propos de cette église</h2>
        <p class="mt-4 text-sm leading-relaxed text-ink-dark/70">{{ publicInfo.description }}</p>
      </div>

      <!-- Back button -->
      <div class="mt-8">
        <RouterLink
          to="/eglises"
          class="inline-flex items-center gap-2 rounded-md border border-ink/15 px-4 py-2 text-sm text-ink-dark/70 transition hover:border-gold/40 hover:text-gold"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Retour aux églises
        </RouterLink>
      </div>
    </article>
  </div>
</template>
