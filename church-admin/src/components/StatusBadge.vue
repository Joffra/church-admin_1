<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: 'active' },
})

const map = {
  active: { label: 'Actif', dot: 'bg-sage', text: 'text-sage', bg: 'bg-sage/10' },
  actif: { label: 'Actif', dot: 'bg-sage', text: 'text-sage', bg: 'bg-sage/10' },
  inactive: { label: 'Fermé', dot: 'bg-rust', text: 'text-rust', bg: 'bg-rust/10' },
  closed: { label: 'Fermé', dot: 'bg-rust', text: 'text-rust', bg: 'bg-rust/10' },
  fermé: { label: 'Fermé', dot: 'bg-rust', text: 'text-rust', bg: 'bg-rust/10' },
  sanctioned: { label: 'Sanctionné', dot: 'bg-rust', text: 'text-rust', bg: 'bg-rust/10' },
}

// Computed avoids 3x function calls per render cycle
const style = computed(() => {
  const key = (props.status || '').toLowerCase()
  return map[key] || { label: props.status || 'Inconnu', dot: 'bg-ink/30', text: 'text-ink/50', bg: 'bg-ink/5' }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
    :class="[style.bg, style.text]"
  >
    <span class="h-1.5 w-1.5 rounded-full" :class="style.dot"></span>
    {{ style.label }}
  </span>
</template>
