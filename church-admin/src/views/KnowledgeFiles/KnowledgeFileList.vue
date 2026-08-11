<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { KnowledgeFilesAPI } from '../../services/api'
import { useToastStore } from '../../stores/toast'

const toast = useToastStore()

const files = ref([])
const loading = ref(true)
const error = ref('')

// ---- Upload ----
const fileInput = ref(null)
const uploading = ref(false)
const dragOver = ref(false)
const ALLOWED_EXTENSIONS = ['pdf', 'txt']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 Mo — mirrors the backend's max:10240 (KB) rule

function extensionOf(filename) {
  return (filename.split('.').pop() || '').toLowerCase()
}

function validateFile(file) {
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) {
    return 'Seuls les fichiers .pdf et .txt sont acceptés.'
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'Le fichier ne doit pas dépasser 10 Mo.'
  }
  return ''
}

async function uploadFile(file) {
  const validationError = validateFile(file)
  if (validationError) {
    toast.error(validationError)
    return
  }
  uploading.value = true
  try {
    await KnowledgeFilesAPI.upload(file)
    toast.success('Document envoyé. La synchronisation avec la base de connaissance est en cours.')
    // The sync job runs in the background (chunking + embeddings), so the
    // freshly uploaded file won't have its chunks_count yet — reload after
    // a short delay to give the queue a chance to process it.
    await loadFiles()
    setTimeout(loadFiles, 4000)
  } catch (e) {
    if (e.response?.status === 422 && e.response.data?.errors?.file) {
      toast.error(e.response.data.errors.file[0])
    } else {
      toast.error(e.response?.data?.message || "Impossible d'envoyer le document.")
    }
  } finally {
    uploading.value = false
  }
}

function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (file) uploadFile(file)
  e.target.value = '' // allow re-selecting the same file
}

function onDrop(e) {
  dragOver.value = false
  const file = e.dataTransfer.files?.[0]
  if (file) uploadFile(file)
}

function openFilePicker() {
  fileInput.value?.click()
}

// ---- List ----
function unwrap(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

async function loadFiles() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await KnowledgeFilesAPI.list()
    files.value = unwrap(data)
  } catch (e) {
    error.value = e.response?.data?.message || 'Impossible de charger les documents.'
  } finally {
    loading.value = false
  }
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---- Preview overlay ----
const previewFile = ref(null)
const previewUrl = ref('')
const previewLoading = ref(false)
const previewError = ref('')

function revokePreviewUrl() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

async function openPreview(file) {
  previewFile.value = file
  previewError.value = ''
  previewLoading.value = true
  try {
    const url = await KnowledgeFilesAPI.previewBlobUrl(file.filename)
    revokePreviewUrl() // just in case one was already open
    previewUrl.value = url
  } catch (e) {
    previewError.value = e.response?.data?.message || "Impossible d'afficher l'aperçu de ce document."
  } finally {
    previewLoading.value = false
  }
}

function closePreview() {
  previewFile.value = null
  revokePreviewUrl()
}

// ---- Rename ----
const renamingFile = ref(null)
const renameValue = ref('')
const renameSubmitting = ref(false)
const renameError = ref('')

function openRename(file) {
  renamingFile.value = file
  renameValue.value = file.filename
  renameError.value = ''
}

function closeRename() {
  renamingFile.value = null
  renameValue.value = ''
  renameError.value = ''
}

async function submitRename() {
  const oldFilename = renamingFile.value.filename
  const newFilename = renameValue.value.trim()

  if (!newFilename) {
    renameError.value = 'Le nom du fichier est obligatoire.'
    return
  }
  // Keep the original extension — renaming "manuel.pdf" to "manuel.txt" would
  // desync the sync command, which re-reads the physical file's extension to
  // decide how to extract text (PDF parser vs plain text).
  if (extensionOf(newFilename) !== extensionOf(oldFilename)) {
    renameError.value = `L'extension doit rester .${extensionOf(oldFilename)}.`
    return
  }
  if (newFilename === oldFilename) {
    closeRename()
    return
  }

  renameSubmitting.value = true
  renameError.value = ''
  try {
    await KnowledgeFilesAPI.rename(oldFilename, newFilename)
    toast.success(`Document renommé en « ${newFilename} ».`)
    closeRename()
    await loadFiles()
  } catch (e) {
    if (e.response?.status === 422 && e.response.data?.errors?.filename) {
      renameError.value = e.response.data.errors.filename[0]
    } else {
      renameError.value = e.response?.data?.message || 'Impossible de renommer ce document.'
    }
  } finally {
    renameSubmitting.value = false
  }
}

// ---- Delete ----
const deletingFile = ref(null)
const deleteSubmitting = ref(false)

async function confirmDelete() {
  deleteSubmitting.value = true
  try {
    await KnowledgeFilesAPI.remove(deletingFile.value.filename)
    toast.success(`Document « ${deletingFile.value.filename} » supprimé.`)
    files.value = files.value.filter((f) => f.filename !== deletingFile.value.filename)
  } catch (e) {
    toast.error(e.response?.data?.message || 'Impossible de supprimer ce document.')
  } finally {
    deleteSubmitting.value = false
    deletingFile.value = null
  }
}

onMounted(loadFiles)
onUnmounted(revokePreviewUrl)
</script>

<template>
  <div>
    <div class="mb-8 border-b border-rule pb-6">
      <p class="text-xs uppercase tracking-[0.16em] text-gold">Administration</p>
      <h1 class="mt-1 font-display text-3xl text-ink-dark">Base de connaissance IA</h1>
      <p class="mt-2 max-w-2xl text-sm text-ink-dark/55">
        Les documents déposés ici sont découpés en fragments, vectorisés, puis utilisés par
        l'assistant IA (chatbot) comme source pour répondre aux questions des membres et
        visiteurs. Toute mise à jour ou suppression déclenche automatiquement une
        resynchronisation de la base vectorielle.
      </p>
    </div>

    <!-- Upload zone -->
    <div
      class="mb-6 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition"
      :class="dragOver ? 'border-gold bg-gold/5' : 'border-rule bg-white'"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
    >
      <svg viewBox="0 0 24 24" class="h-8 w-8 text-ink-dark/30" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <div>
        <p class="text-sm font-medium text-ink-dark">Glissez un fichier ici, ou</p>
        <button
          type="button"
          :disabled="uploading"
          @click="openFilePicker"
          class="mt-1 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink-dark transition hover:bg-gold-light disabled:opacity-60"
        >
          {{ uploading ? 'Envoi en cours…' : 'Choisir un fichier' }}
        </button>
      </div>
      <p class="text-xs text-ink-dark/40">Formats acceptés : .pdf, .txt — 10 Mo maximum</p>
      <input
        ref="fileInput"
        type="file"
        accept=".pdf,.txt"
        class="hidden"
        @change="onFileSelected"
      />
    </div>

    <p v-if="error" class="mb-4 rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
      {{ error }}
    </p>

    <!-- Files table -->
    <div class="overflow-hidden rounded-lg border border-rule bg-white">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-rule bg-parchment-dark/40 text-[11px] uppercase tracking-wide text-ink-dark/45">
            <th class="px-5 py-3 font-semibold">Fichier</th>
            <th class="px-5 py-3 font-semibold">Fragments</th>
            <th class="px-5 py-3 font-semibold">Traité le</th>
            <th class="px-5 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4" class="px-5 py-10 text-center text-ink-dark/40">Chargement…</td>
          </tr>
          <tr v-else-if="!files.length">
            <td colspan="4" class="px-5 py-10 text-center text-ink-dark/40">
              Aucun document dans la base de connaissance.
            </td>
          </tr>
          <tr
            v-for="file in files"
            :key="file.id"
            class="border-b border-rule last:border-0 hover:bg-parchment/60"
          >
            <td class="px-5 py-3.5 font-medium text-ink-dark">
              <div class="flex items-center gap-2">
                <span
                  class="rounded-md border border-rule bg-parchment-dark/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-dark/50"
                >
                  {{ file.filename.split('.').pop() }}
                </span>
                {{ file.filename }}
              </div>
            </td>
            <td class="px-5 py-3.5 text-ink-dark/60">
              {{ file.chunks_count ?? '—' }}
            </td>
            <td class="px-5 py-3.5 text-ink-dark/60">
              {{ formatDateTime(file.processed_at) }}
            </td>
            <td class="px-5 py-3.5 text-right">
              <div class="flex justify-end gap-2">
                <button
                  @click="openPreview(file)"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:bg-parchment-dark hover:text-ink-dark"
                >
                  Aperçu
                </button>
                <button
                  @click="openRename(file)"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-dark/60 transition hover:bg-parchment-dark hover:text-ink-dark"
                >
                  Renommer
                </button>
                <button
                  @click="deletingFile = file"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-rust/70 transition hover:bg-rust/10 hover:text-rust"
                >
                  Supprimer
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Preview overlay -->
    <div
      v-if="previewFile"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/60 px-4 py-8"
      @click.self="closePreview"
    >
      <div class="flex h-full w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-rule px-5 py-3">
          <h3 class="truncate font-display text-base text-ink-dark">{{ previewFile.filename }}</h3>
          <button @click="closePreview" class="rounded-md p-1.5 text-ink-dark/50 transition hover:bg-parchment-dark hover:text-ink-dark">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 6l12 12M6 18L18 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-hidden bg-parchment-dark/20">
          <p v-if="previewLoading" class="flex h-full items-center justify-center text-sm text-ink-dark/40">
            Chargement de l'aperçu…
          </p>
          <p v-else-if="previewError" class="flex h-full items-center justify-center px-6 text-center text-sm text-rust">
            {{ previewError }}
          </p>
          <iframe
            v-else-if="previewUrl"
            :src="previewUrl"
            class="h-full w-full border-0"
            title="Aperçu du document"
          ></iframe>
        </div>
      </div>
    </div>

    <!-- Rename modal -->
    <div
      v-if="renamingFile"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="closeRename"
    >
      <div class="w-full max-w-sm rounded-lg bg-white p-6">
        <h3 class="font-display text-lg text-ink-dark">Renommer le document</h3>
        <p class="mt-2 text-sm text-ink-dark/60">
          Seul le nom du fichier peut être modifié — l'extension doit rester identique.
        </p>
        <div class="mt-4">
          <input
            v-model="renameValue"
            type="text"
            :disabled="renameSubmitting"
            @keyup.enter="submitRename"
            class="w-full rounded-md border border-rule px-3.5 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-60"
          />
          <p v-if="renameError" class="mt-1.5 text-xs text-rust">{{ renameError }}</p>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="closeRename"
            class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark"
          >
            Annuler
          </button>
          <button
            :disabled="renameSubmitting"
            @click="submitRename"
            class="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink-dark transition hover:bg-gold-light disabled:opacity-60"
          >
            {{ renameSubmitting ? 'Enregistrement…' : 'Renommer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm delete modal -->
    <div
      v-if="deletingFile"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/50 px-4"
      @click.self="deletingFile = null"
    >
      <div class="w-full max-w-sm rounded-lg bg-white p-6">
        <h3 class="font-display text-lg text-ink-dark">Supprimer ce document ?</h3>
        <p class="mt-2 text-sm text-ink-dark/60">
          « {{ deletingFile.filename }} » et tous ses fragments vectorisés seront retirés de la
          base de connaissance. L'assistant IA ne pourra plus s'en servir pour répondre aux
          questions.
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="deletingFile = null"
            class="rounded-md px-4 py-2 text-sm font-medium text-ink-dark/60 hover:text-ink-dark"
          >
            Annuler
          </button>
          <button
            :disabled="deleteSubmitting"
            @click="confirmDelete"
            class="rounded-md bg-rust px-4 py-2 text-sm font-semibold text-white transition hover:bg-rust/90 disabled:opacity-60"
          >
            {{ deleteSubmitting ? 'Suppression…' : 'Supprimer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
