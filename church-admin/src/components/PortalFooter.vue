<script setup>
import { RouterLink } from 'vue-router'
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/logo.png'

const year = new Date().getFullYear()
const auth = useAuthStore()
const portalAccess = computed(() => {
  if (!auth.isAuthenticated) return { to: '/login', label: 'Connexion administrateur' }
  if (auth.isMissionAdmin) return { to: '/admin', label: 'Tableau de bord' }
  return { to: '/mon-eglise', label: 'Mon Église' }
})
</script>

<template>
  <footer class="bg-ink text-parchment/60">
    <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <div class="flex items-center gap-3">
            <img :src="logo" alt="MECEIPH" class="brand-logo h-8 w-8 object-contain" />
            <div>
              <p class="font-display text-sm text-parchment">MECEIPH</p>
              <p class="text-[10px] uppercase tracking-[0.16em] text-gold/80">Mission Évangélique</p>
            </div>
          </div>
          <p class="mt-4 text-xs leading-relaxed">
            Mission Église Croisade Évangélique Internationale de Pêcheurs d'Hommes.
          </p>
        </div>

        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-parchment/40">Navigation</p>
          <ul class="mt-3 space-y-2 text-sm">
            <li><RouterLink to="/" class="hover:text-gold transition-colors">Accueil</RouterLink></li>
            <li><RouterLink to="/mission" class="hover:text-gold transition-colors">Notre mission</RouterLink></li>
            <li><RouterLink to="/eglises" class="hover:text-gold transition-colors">Nos églises</RouterLink></li>
            <li><RouterLink to="/contact" class="hover:text-gold transition-colors">Nous contacter</RouterLink></li>
          </ul>
        </div>

        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-parchment/40">Espace réservé</p>
          <ul class="mt-3 space-y-2 text-sm">
            <li><RouterLink :to="portalAccess.to" class="footer-link hover:text-gold transition-colors">{{ portalAccess.label }}</RouterLink></li>
          </ul>
        </div>
      </div>

      <div class="mt-10 border-t border-white/10 pt-6 text-center text-xs text-parchment/40">
        © {{ year }} MECEIPH. Tous droits réservés.
      </div>
    </div>
  </footer>
</template>
