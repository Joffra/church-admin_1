<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon paths broken by Vite bundling
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const props = defineProps({
  modelValue: { type: String, default: '' }, // "lat, lng" string
  readonly: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const mapEl = ref(null)
let map = null
let marker = null

// Parse "lat, lng" string → [lat, lng] or null
function parse(val) {
  if (!val) return null
  const parts = val.split(',').map((s) => parseFloat(s.trim()))
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts
  return null
}

// Haiti center as default view
const DEFAULT_CENTER = [18.9712, -72.2852]
const DEFAULT_ZOOM = 8

function placeMarker(latlng) {
  if (marker) {
    marker.setLatLng(latlng)
  } else {
    marker = L.marker(latlng, { draggable: !props.readonly }).addTo(map)
    if (!props.readonly) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        emit('update:modelValue', `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`)
      })
    }
  }
}

onMounted(() => {
  const coords = parse(props.modelValue)
  map = L.map(mapEl.value).setView(coords || DEFAULT_CENTER, coords ? 14 : DEFAULT_ZOOM)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map)

  if (coords) placeMarker(coords)

  if (!props.readonly) {
    map.on('click', (e) => {
      placeMarker(e.latlng)
      emit('update:modelValue', `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`)
    })
  }
})

watch(() => props.modelValue, (val) => {
  const coords = parse(val)
  if (coords && map) {
    placeMarker(coords)
    map.setView(coords, 14)
  }
})

onUnmounted(() => {
  if (map) { map.remove(); map = null }
})
</script>

<template>
  <div class="overflow-hidden rounded-md border border-rule">
    <div ref="mapEl" class="h-64 w-full"></div>
    <div v-if="!readonly" class="border-t border-rule bg-parchment px-3 py-2 text-xs text-ink-dark/50">
      Cliquez sur la carte pour placer le marqueur. Vous pouvez aussi le glisser pour ajuster.
    </div>
  </div>
</template>
