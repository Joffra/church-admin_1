<script setup>
defineProps({
  status: { type: String, default: 'active' },
})

const map = {
  active: { label: 'Actif', dot: 'bg-sage', text: 'text-sage', bg: 'bg-sage/10' },
  actif: { label: 'Actif', dot: 'bg-sage', text: 'text-sage', bg: 'bg-sage/10' },
  inactive: { label: 'Fermé', dot: 'bg-rust', text: 'text-rust', bg: 'bg-rust/10' },
  closed: { label: 'Fermé', dot: 'bg-rust', text: 'text-rust', bg: 'bg-rust/10' },
  fermé: { label: 'Fermé', dot: 'bg-rust', text: 'text-rust', bg: 'bg-rust/10' },
}

function styleFor(s) {
  const key = (s || '').toLowerCase()
  return map[key] || { label: s || 'Inconnu', dot: 'bg-ink/30', text: 'text-ink/50', bg: 'bg-ink/5' }
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
    :class="[styleFor(status).bg, styleFor(status).text]"
  >
    <span class="h-1.5 w-1.5 rounded-full" :class="styleFor(status).dot"></span>
    {{ styleFor(status).label }}
  </span>
</template>
