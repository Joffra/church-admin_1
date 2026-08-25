<script setup>
import { ref, computed, onMounted } from 'vue'
import { DailyVerseAPI } from '../services/api'

// ---- State ----
const verse = ref(null)
const showMoodModal = ref(false)
const expanded = ref(false)
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
const SHOWN_KEY = 'meceiph_daily_verse_shown'

function getTodayKey() {
  return new Date().toLocaleDateString('en-CA')
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

// Track all verse references shown today (to avoid repeats)
function getShownReferences() {
  try {
    const raw = localStorage.getItem(SHOWN_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (data.date !== getTodayKey()) {
      localStorage.removeItem(SHOWN_KEY)
      return []
    }
    return data.references || []
  } catch {
    return []
  }
}

function addShownReference(reference) {
  if (!reference) return
  const refs = getShownReferences()
  if (!refs.includes(reference)) {
    refs.push(reference)
    localStorage.setItem(SHOWN_KEY, JSON.stringify({
      date: getTodayKey(),
      references: refs,
    }))
  }
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
// Backend handles verse variety via random seed + temperature 1.0.
// Frontend just sends clean mood/topics.
async function fetchVerse(mood, topics) {
  loading.value = true
  error.value = ''
  verse.value = null

  try {
    const payload = {}
    if (mood) payload.mood = mood
    if (topics && topics.length) payload.topics = topics

    const { data } = await DailyVerseAPI.getVerse(payload)
    const verseData = data.data ?? data

    // Display the clean mood/theme in the UI
    if (mood) {
      verseData.display_mood = mood
    } else if (topics && topics.length) {
      verseData.display_mood = topics.join(', ')
    } else {
      verseData.display_mood = null
    }

    verse.value = verseData
    saveVerse(verseData)
    addShownReference(verseData.reference)
    return verseData
  } catch (e) {
    error.value = e.response?.data?.message || "Une erreur s'est produite. Veuillez réessayer."
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
  openMoodModal()
}

// ---- Lifecycle ----
onMounted(() => {
  const stored = getStoredVerse()
  if (stored) {
    verse.value = stored
    // Make sure the stored reference is in the "shown" list
    addShownReference(stored.reference)
  } else {
    openMoodModal()
  }
})
</script>

<template>
  <div>
    <!-- Floating verse pill (collapsed — always visible) -->
    <transition name="verse-fade">
      <div
        v-if="verse && !loading && !expanded"
        class="fixed bottom-4 left-4 z-40"
      >
        <button
          @click="expanded = true"
          class="verse-btn group flex max-w-[260px] items-center gap-3 rounded-full border border-gold/30 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm transition hover:bg-white hover:border-gold/50 sm:max-w-[280px] sm:px-4 sm:py-2.5"
        >
          <!-- Book icon -->
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold transition group-hover:bg-gold group-hover:text-ink-dark">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <span class="min-w-0 text-left">
            <span class="block text-[10px] font-semibold uppercase tracking-wide text-gold/80">Verset du jour</span>
            <span class="block truncate text-xs font-medium text-ink-dark/70">{{ verse.reference }}</span>
          </span>
        </button>
      </div>
    </transition>

    <!-- Expanded verse card (floating overlay) -->
    <transition name="verse-expand">
      <div
        v-if="verse && expanded"
        class="fixed bottom-4 left-4 z-40 w-[18rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-gold/20 bg-white shadow-2xl overflow-hidden sm:w-[20rem] sm:bottom-6 sm:left-6 sm:max-w-[calc(100vw-3rem)]"
      >
        <!-- Header bar -->
        <div class="flex items-center justify-between bg-ink px-4 py-3">
          <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">Verset du jour</p>
          <button
            @click="expanded = false"
            class="rounded-md p-1 text-parchment/40 transition hover:bg-white/10 hover:text-parchment"
            aria-label="Réduire"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 14l-7-7-7 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <!-- Verse content -->
        <div class="p-5">
          <p class="font-display text-base leading-snug text-ink-dark">
            « {{ verse.text }} »
          </p>
          <p class="mt-1.5 text-xs font-medium text-gold">— {{ verse.reference }}</p>

          <!-- Theme & mood tags -->
          <div class="mt-3 flex flex-wrap gap-1.5">
            <span
              v-if="verse.theme"
              class="inline-flex items-center rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-ink-dark/70"
            >
              {{ verse.theme }}
            </span>
            <span
              v-if="verse.display_mood"
              class="inline-flex items-center rounded-full bg-ink/5 px-2 py-0.5 text-[10px] text-ink-dark/55"
            >
              {{ verse.display_mood }}
            </span>
          </div>

          <!-- Reflection -->
          <p class="mt-3 border-t border-rule pt-3 text-xs leading-relaxed text-ink-dark/60 italic">
            {{ verse.reflection }}
          </p>

          <!-- Change verse -->
          <div class="mt-3 border-t border-rule pt-2.5">
            <button
              v-if="remainingChanges > 0"
              @click="changeVerse"
              :disabled="loading"
              class="text-[11px] font-medium text-gold hover:underline transition disabled:opacity-50"
            >
              ⟳ Changer ({{ remainingChanges }} restant{{ remainingChanges > 1 ? 's' : '' }})
            </button>
            <p v-else class="text-[11px] text-ink-dark/35">
              Limite atteinte pour aujourd'hui
            </p>
          </div>
        </div>
      </div>
    </transition>

    <!-- Loading pill (floating) -->
    <transition name="verse-fade">
      <div
        v-if="loading"
        class="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-gold/30 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:bottom-6 sm:left-6 sm:px-4 sm:py-2.5"
      >
        <svg class="h-4 w-4 animate-spin text-gold" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-xs text-ink-dark/60">Verset…</span>
      </div>
    </transition>

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
                  : 'border border-rule bg-white text-ink-dark/70 hover:border-gold hover:text-ink-dark'"
              >
                {{ theme }}
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-2">
            <button
              @click="skipMood"
              :disabled="loading"
              class="flex-1 rounded-lg border border-rule bg-white px-4 py-2.5 text-sm font-medium text-ink-dark/60 transition hover:border-ink-dark/30 hover:text-ink-dark disabled:opacity-50"
            >
              Passer
            </button>
            <button
              @click="submitMood"
              :disabled="loading"
              class="flex-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-ink-dark transition hover:bg-gold-light disabled:opacity-50"
            >
              {{ loading ? 'Génération…' : 'Obtenir mon verset' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.verse-fade-enter-active,
.verse-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.verse-fade-enter-from,
.verse-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.verse-expand-enter-active,
.verse-expand-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.verse-expand-enter-from,
.verse-expand-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(8px);
}
</style>
