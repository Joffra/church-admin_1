<script setup>
import { ref, computed, onMounted } from 'vue'
import { DailyVerseAPI } from '../services/api'

// ---- State ----
const verse = ref(null)          // { reference, text, reflection, theme, user_mood, topics }
const showMoodModal = ref(false)  // popup asking mood/theme
const showDetails = ref(false)    // expand verse card to show reflection
const loading = ref(false)
const error = ref('')

// Mood form
const moodText = ref('')
const selectedTheme = ref(null)

// Rate limiting for "change verse"
const MAX_CHANGES_PER_DAY = 3

const themes = [
  'Joie', 'Amour', 'Paix', 'Espérance', 'Gratitude',
  'Foi', 'Courage', 'Réconfort', 'Pardon', 'Sagesse',
  'Peur', 'Tristesse', 'Doute', 'Colère',
]

// ---- localStorage helpers ----
const STORAGE_KEY = 'meceiph_daily_verse'
const CHANGE_COUNT_KEY = 'meceiph_daily_verse_changes'

function getTodayKey() {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local tz
}

function getStoredVerse() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data.date !== getTodayKey()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

function saveVerse(verseData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...verseData,
    date: getTodayKey(),
  }))
}

function getChangeCountToday() {
  try {
    const raw = localStorage.getItem(CHANGE_COUNT_KEY)
    if (!raw) return 0
    const data = JSON.parse(raw)
    if (data.date !== getTodayKey()) {
      localStorage.removeItem(CHANGE_COUNT_KEY)
      return 0
    }
    return data.count || 0
  } catch {
    return 0
  }
}

function incrementChangeCount() {
  const count = getChangeCountToday() + 1
  localStorage.setItem(CHANGE_COUNT_KEY, JSON.stringify({
    date: getTodayKey(),
    count,
  }))
}

const remainingChanges = computed(() => MAX_CHANGES_PER_DAY - getChangeCountToday())

// ---- API ----
async function fetchVerse(mood, topics) {
  loading.value = true
  error.value = ''
  try {
    const payload = {}
    if (mood) payload.mood = mood
    if (topics && topics.length) payload.topics = topics

    const { data } = await DailyVerseAPI.getVerse(payload)
    const verseData = data.data ?? data

    verse.value = verseData
    saveVerse(verseData)
    return verseData
  } catch (e) {
    error.value = "Une erreur s'est produite. Veuillez réessayer."
    return null
  } finally {
    loading.value = false
  }
}

// ---- Actions ----
function openMoodModal() {
  moodText.value = ''
  selectedTheme.value = null
  error.value = ''
  showMoodModal.value = true
}

function selectTheme(theme) {
  selectedTheme.value = selectedTheme.value === theme ? null : theme
}

async function submitMood() {
  const mood = moodText.value.trim() || null
  const topics = selectedTheme.value ? [selectedTheme.value] : []

  showMoodModal.value = false
  await fetchVerse(mood, topics)
}

async function skipMood() {
  showMoodModal.value = false
  await fetchVerse(null, [])
}

async function changeVerse() {
  if (remainingChanges.value <= 0) return
  incrementChangeCount()
  // Reuse the same mood modal for changing verse
  openMoodModal()
}

// ---- Lifecycle ----
onMounted(() => {
  const stored = getStoredVerse()
  if (stored) {
    verse.value = stored
  } else {
    // Show the mood modal on first visit of the day
    openMoodModal()
  }
})
</script>

<template>
  <div>
    <!-- Verse Card (subtle, non-imposing) -->
    <div
      v-if="verse && !loading"
      class="rounded-xl border border-gold/20 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden transition-all"
    >
      <!-- Compact view -->
      <button
        @click="showDetails = !showDetails"
        class="w-full text-left p-5 transition hover:bg-gold/5"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/80">
              Verset du jour
            </p>
            <p class="mt-2 font-display text-lg leading-snug text-ink-dark">
              « {{ verse.text }} »
            </p>
            <p class="mt-1.5 text-xs font-medium text-gold">— {{ verse.reference }}</p>
          </div>
          <svg
            class="mt-1 h-4 w-4 shrink-0 text-ink-dark/30 transition-transform"
            :class="showDetails ? 'rotate-180' : ''"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          >
            <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
      </button>

      <!-- Expanded details -->
      <transition name="expand">
        <div v-show="showDetails" class="border-t border-gold/10 px-5 pb-5 pt-4 bg-parchment/30">
          <!-- Theme & mood context -->
          <div class="mb-4 flex flex-wrap gap-2">
            <span
              v-if="verse.theme"
              class="inline-flex items-center rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-medium text-ink-dark/70"
            >
              {{ verse.theme }}
            </span>
            <span
              v-if="verse.user_mood"
              class="inline-flex items-center rounded-full bg-ink/5 px-2.5 py-1 text-[11px] text-ink-dark/55"
            >
              « {{ verse.user_mood }} »
            </span>
            <span
              v-if="verse.topics && verse.topics.length"
              v-for="t in verse.topics"
              :key="t"
              class="inline-flex items-center rounded-full bg-ink/5 px-2.5 py-1 text-[11px] text-ink-dark/55"
            >
              {{ t }}
            </span>
          </div>

          <!-- Reflection -->
          <p class="text-sm leading-relaxed text-ink-dark/70 italic">
            {{ verse.reflection }}
          </p>

          <!-- Change verse button -->
          <div class="mt-4 flex items-center justify-between border-t border-gold/10 pt-3">
            <button
              v-if="remainingChanges > 0"
              @click="changeVerse"
              :disabled="loading"
              class="text-xs font-medium text-gold hover:underline transition disabled:opacity-50"
            >
              ⟳ Changer de verset ({{ remainingChanges }} restant{{ remainingChanges > 1 ? 's' : '' }})
            </button>
            <p v-else class="text-xs text-ink-dark/35">
              Limite de versets atteinte pour aujourd'hui
            </p>
          </div>
        </div>
      </transition>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="rounded-xl border border-gold/20 bg-white/80 p-5 text-center">
      <div class="inline-flex items-center gap-2 text-sm text-ink-dark/50">
        <svg class="h-4 w-4 animate-spin text-gold" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Génération de votre verset…
      </div>
    </div>

    <!-- Error -->
    <div v-if="error && !loading" class="rounded-xl border border-rust/20 bg-rust/5 p-4 text-center">
      <p class="text-sm text-rust">{{ error }}</p>
      <button @click="openMoodModal" class="mt-2 text-xs font-medium text-gold hover:underline">
        Réessayer
      </button>
    </div>

    <!-- Mood Modal (first visit / change verse) -->
    <div
      v-if="showMoodModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 backdrop-blur-sm px-4"
      @click.self="showMoodModal = false"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <!-- Header -->
        <div class="bg-ink px-6 py-5 text-center">
          <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Verset du jour</p>
          <h3 class="mt-2 font-display text-xl text-parchment">Comment vous sentez-vous aujourd'hui ?</h3>
          <p class="mt-1.5 text-xs text-parchment/50">
            Personnalisez votre verset ou passez directement
          </p>
        </div>

        <div class="p-6 space-y-5">
          <p v-if="error" class="rounded-md border border-rust/30 bg-rust/5 px-3 py-2 text-xs text-rust">{{ error }}</p>

          <!-- Mood text input -->
          <div>
            <label class="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
              Décrivez votre état d'esprit <span class="text-ink-dark/30 normal-case">(optionnel)</span>
            </label>
            <textarea
              v-model="moodText"
              rows="2"
              placeholder="Ex: Je me sens stressé, je cherche du réconfort…"
              class="w-full rounded-lg border border-rule px-4 py-3 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold resize-none"
            />
          </div>

          <!-- Theme buttons -->
          <div>
            <label class="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-dark/50">
              Ou choisissez un thème <span class="text-ink-dark/30 normal-case">(optionnel)</span>
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="theme in themes"
                :key="theme"
                @click="selectTheme(theme)"
                class="rounded-full px-3.5 py-1.5 text-xs font-medium transition"
                :class="selectedTheme === theme
                  ? 'bg-gold text-ink-dark shadow-sm'
                  : 'bg-ink/5 text-ink-dark/60 hover:bg-ink/10'"
              >
                {{ theme }}
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-2 border-t border-rule pt-5 sm:flex-row sm:justify-between">
            <button
              @click="skipMood"
              :disabled="loading"
              class="order-2 sm:order-1 rounded-lg px-5 py-2.5 text-sm font-medium text-ink-dark/50 hover:text-ink-dark transition disabled:opacity-50"
            >
              Passer
            </button>
            <button
              @click="submitMood"
              :disabled="loading"
              class="order-1 sm:order-2 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-ink-dark transition hover:bg-gold-light disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <svg v-if="loading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ loading ? 'Génération…' : 'Obtenir mon verset' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
