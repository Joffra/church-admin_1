<script setup>
import { RouterLink } from 'vue-router'
import heroImg from '../../assets/hero.png'
import DailyVerseWidget from '../../components/DailyVerseWidget.vue'

const cards = [
  {
    to: '/mission',
    title: 'Notre Mission',
    description: "Découvrez l'histoire, la vision et les dirigeants de MECEIPH.",
    icon: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3Z',
  },
  {
    to: '/eglises',
    title: 'Nos Églises',
    description: "Trouvez une église près de chez vous et ses informations de contact.",
    icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6',
  },
  {
    to: '/contact',
    title: 'Nous Contacter',
    description: "Une question ? Écrivez-nous via le formulaire de contact.",
    icon: 'M4 4h16v12H4zM4 16l4-4 4 4 4-4 4 4M4 20l6-6 6 6',
  },
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden bg-ink">
      <div class="absolute inset-0">
        <img :src="heroImg" alt="" class="h-full w-full object-cover opacity-20" />
      </div>
      <div class="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <div class="max-w-2xl">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Bienvenue</p>
          <h1 class="mt-4 font-display text-4xl text-parchment sm:text-5xl lg:text-6xl">
            Mission Église Croisade Évangélique<br />Internationale de Pêcheurs d'Hommes
          </h1>
          <p class="mt-6 text-lg leading-relaxed text-parchment/70">
            « Suivez-moi, et je ferai de vous des pêcheurs d'hommes. » — Matthieu 4:19
          </p>
          <div class="mt-10 flex flex-wrap gap-4">
            <RouterLink
              to="/mission"
              class="rounded-md bg-gold px-6 py-3 text-sm font-semibold text-ink-dark transition hover:bg-gold-light"
            >
              Découvrir la mission
            </RouterLink>
            <RouterLink
              to="/eglises"
              class="rounded-md border border-parchment/30 px-6 py-3 text-sm font-semibold text-parchment transition hover:bg-white/10"
            >
              Voir les églises
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Cards -->
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div class="grid gap-6 sm:grid-cols-3">
        <RouterLink
          v-for="card in cards"
          :key="card.to"
          :to="card.to"
          class="group rounded-xl border border-ink/10 bg-white p-8 shadow-sm transition hover:border-gold/40 hover:shadow-md"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-ink/5 text-ink transition group-hover:bg-gold/10 group-hover:text-gold">
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5">
              <path :d="card.icon" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <h2 class="mt-5 font-display text-xl text-ink-dark">{{ card.title }}</h2>
          <p class="mt-2 text-sm leading-relaxed text-ink-dark/55">{{ card.description }}</p>
          <p class="mt-4 text-sm font-medium text-gold opacity-0 transition group-hover:opacity-100">En savoir plus →</p>
        </RouterLink>
      </div>
    </section>

    <!-- Daily Verse (dynamic, AI-generated) -->
    <section class="bg-ink/5">
      <div class="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <DailyVerseWidget />

        <!-- Static mission verse below -->
        <div class="mt-12 text-center">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Notre vocation</p>
          <blockquote class="mt-6 font-display text-2xl leading-relaxed text-ink-dark sm:text-3xl">
            « Allez par tout le monde, et prêchez la bonne nouvelle à toute la création. »
          </blockquote>
          <p class="mt-4 text-sm text-ink-dark/50">Marc 16:15</p>
        </div>
      </div>
    </section>
  </div>
</template>
