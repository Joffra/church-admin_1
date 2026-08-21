<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: '—' },
  loading: { type: Boolean, default: false },
  hint: { type: String, default: '' },
  accent: { type: String, default: 'gold' }, // gold | sage | rust
})

const accentMap = {
  gold: 'text-gold',
  sage: 'text-sage',
  rust: 'text-rust',
}
</script>

<template>
  <div class="relative overflow-hidden rounded-lg border border-rule bg-white px-5 py-5">
    <div class="absolute right-3 top-3 text-[10px] uppercase tracking-[0.16em] text-ink/30">
      №
    </div>
    <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">{{ label }}</p>
    <p class="mt-2 font-display text-3xl" :class="accentMap[accent]">
      <span v-if="loading" class="inline-block h-8 w-14 animate-pulse rounded bg-parchment-dark"></span>
      <span v-else>{{ value }}</span>
    </p>
    <p v-if="hint" class="mt-1 text-xs text-ink/40">{{ hint }}</p>
  </div>
</template>
