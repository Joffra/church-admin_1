<script setup>
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const user = auth.user

function formatGender(g) {
  if (!g) return '—'
  const val = g.toLowerCase()
  if (val === 'm' || val === 'homme' || val === 'male') return 'Homme'
  if (val === 'f' || val === 'femme' || val === 'female') return 'Femme'
  return g
}

function roleLabel(role) {
  if (role === 'mission_admin') return 'Admin Mission'
  if (role === 'church_admin') return 'Admin Église'
  if (role === 'user') return 'Utilisateur'
  return 'Membre'
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-8 border-b border-rule pb-6">
      <h1 class="font-display text-3xl text-ink">Mon profil</h1>
      <p class="mt-1 text-sm text-ink/55">Vos informations personnelles.</p>
    </div>

    <div class="max-w-lg rounded-lg border border-rule bg-white p-8">
      <!-- Avatar + name -->
      <div class="mb-6 flex items-center gap-4">
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-gold/20 text-xl font-semibold text-gold">
          {{ (user?.first_name?.[0] || user?.member_code?.[0] || 'M').toUpperCase() }}
        </div>
        <div>
          <p class="text-lg font-semibold text-ink">
            {{ user?.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : user?.member_code }}
          </p>
          <span class="inline-block rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold">
            {{ roleLabel(user?.role) }}
          </span>
        </div>
      </div>

      <!-- Fields -->
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

      <div class="mt-6 border-t border-rule pt-5">
        <p class="text-xs text-ink/40">
          Pour modifier vos informations personnelles, contactez un administrateur.
        </p>
      </div>
    </div>
  </div>
</template>
