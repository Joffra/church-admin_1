<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { AiAssistantAPI } from '../services/api'

// ---- State ----
const isOpen = ref(false)
const messages = ref([])
const input = ref('')
const loading = ref(false)
const error = ref('')
const messagesContainer = ref(null)

const STORAGE_KEY = 'meceiph_ai_chat'

const suggestions = [
  'Comment puis-je trouver une église près de chez moi ?',
  'Quel verset me conseillez-vous pour trouver la paix ?',
  'Parlez-moi de la mission MECEIPH',
  'Je traverse une période difficile, pouvez-vous prier avec moi ?',
]

// ---- Persistence ----
function loadChat() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      // Remove legacy RAG source footers from conversations saved before this update.
      messages.value = JSON.parse(raw).map(message => ({
        ...message,
        content: typeof message.content === 'string'
          ? message.content.replace(/\n\n\*Sources\s*:\s*[^*]+\*/gi, '').trim()
          : message.content,
      }))
      saveChat()
    }
  } catch {
    // ignore
  }
}

function saveChat() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value.slice(-20)))
  } catch {
    // ignore
  }
}

// ---- Actions ----
function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value && messages.value.length === 0) {
    messages.value.push({
      role: 'assistant',
      content: "Bonjour ! Je suis l'assistant pastoral de MECEIPH. Je suis là pour répondre à vos questions spirituelles, vous orienter vers une église, ou simplement échanger. Comment puis-je vous aider aujourd'hui ?",
    })
    saveChat()
  }
  if (isOpen.value) {
    nextTick(scrollToBottom)
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// FIXED: No longer takes a `text` param — Vue was passing the Event object
// as the first argument, causing .trim() to fail on an Event.
async function sendMessage() {
  const content = input.value.trim()
  if (!content || loading.value) return

  error.value = ''
  input.value = ''

  // Add user message
  messages.value.push({ role: 'user', content })
  saveChat()
  nextTick(scrollToBottom)

  loading.value = true
  try {
    // Build history from prior messages (exclude welcome message + the just-added user message)
    const history = messages.value
      .slice(0, -1)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))

    const { data } = await AiAssistantAPI.chat(content, history)
    const answer = data.data?.answer || data.answer || data.data?.reply || data.reply || 'Désolé, je n\'ai pas pu traiter votre demande.'
    // RAG source documents remain an internal retrieval detail and are not
    // displayed to members in the professional chat response.
    messages.value.push({ role: 'assistant', content: answer })
    saveChat()
    nextTick(scrollToBottom)
  } catch (e) {
    if (e.response?.status === 429) {
      error.value = 'Trop de messages. Veuillez patienter quelques instants avant de continuer.'
    } else {
      error.value = "Une erreur s'est produite. Veuillez réessayer."
    }
    // Remove the user's message so they can retry
    messages.value.pop()
    saveChat()
  } finally {
    loading.value = false
    nextTick(scrollToBottom)
  }
}

// FIXED: No args — reads from input ref directly
function useSuggestion(suggestion) {
  input.value = suggestion
  sendMessage()
}

function clearChat() {
  messages.value = []
  sessionStorage.removeItem(STORAGE_KEY)
  toggleChat()
}

onMounted(loadChat)

// ---- Markdown-like text formatter ----
// Renders AI responses with paragraphs, bold, italic, lists, and line breaks
// without any external dependency. Escapes HTML first for safety.
function formatMessage(text) {
  if (!text) return ''
  
  // Escape HTML to prevent injection
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // Split into blocks by double newline (paragraph separator)
  const blocks = html.split(/\n\n+/)
  const formattedBlocks = blocks.map(block => {
    const trimmed = block.trim()
    if (!trimmed) return ''
    
    // Detect bullet list (lines starting with - or *)
    if (/^(\s*[-*]\s+.+)\n?(\s*[-*]\s+.+)*/m.test(trimmed) && trimmed.match(/^\s*[-*]\s+/m)) {
      const items = trimmed.split(/\n/).filter(l => l.trim()).map(line => {
        const item = line.replace(/^\s*[-*]\s+/, '').trim()
        return `<li>${formatInline(item)}</li>`
      })
      return `<ul class="ml-4 mt-1 space-y-1 list-disc list-outside">${items.join('')}</ul>`
    }
    
    // Detect numbered list (1. 2. etc)
    if (/^\s*\d+[.)]\s+.+/m.test(trimmed)) {
      const items = trimmed.split(/\n/).filter(l => l.trim()).map(line => {
        const item = line.replace(/^\s*\d+[.)]\s+/, '').trim()
        return `<li>${formatInline(item)}</li>`
      })
      return `<ol class="ml-4 mt-1 space-y-1 list-decimal list-outside">${items.join('')}</ol>`
    }
    
    // Regular paragraph — preserve single line breaks
    const lines = trimmed.split(/\n/).map(l => formatInline(l.trim())).filter(l => l)
    return `<p class="leading-relaxed">${lines.join('<br/>')}</p>`
  })
  
  return formattedBlocks.filter(b => b).join('')
}

function formatInline(text) {
  return text
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_ (but not ** which is bold)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>')
    // Inline code: `text`
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-ink-dark/5 text-xs">$1</code>')
    // Bible references like "Jean 3:16" — make them subtle but distinct
    .replace(/\b(\d+\s*[A-Z][a-zéèêàâïîôöûüç]+(?:\s[A-Z][a-zéèêàâïîôöûüç]+)?\s*\d+:\d+(?:-\d+)?|\b(?:Gen|Ex|Lev|Nomb|Deut|Jos|Jug|Ruth|1\s*Sam|2\s*Sam|1\s*Rois|2\s*Rois|1\s*Chron|2\s*Chron|Esd|Neh|Esth|Job|Ps|Prov|Eccl|Cant|Esa|Jer|Lam|Ez|Dan|Os|Joe|Am|Abd|Jon|Mic|Nah|Hab|Soph|Agg|Zach|Mal|Matt|Marc|Luc|Jean|Act|Rom|1\s*Cor|2\s*Cor|Gal|Eph|Phil|Col|1\s*Thess|2\s*Thess|1\s*Tim|2\s*Tim|Tit|Phil|Heb|Jac|1\s*Pierre|2\s*Pierre|1\s*Jean|2\s*Jean|3\s*Jean|Jude|Apoc)\s+\d+:\d+(?:-\d+)?)/g, 
      '<span class="font-semibold text-gold-dark">$1</span>')
}

// Expose to template
defineExpose({ formatMessage })
</script>

<template>
  <div>
    <!-- Floating chat bubble -->
    <button
      v-show="!isOpen"
      @click="toggleChat"
      class="chat-btn widget-pulse fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-ink-dark shadow-lg"
      aria-label="Ouvrir l'assistant IA"
    >
      <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <!-- Chat panel -->
    <transition name="chat-slide">
      <div
        v-if="isOpen"
        class="fixed bottom-0 right-0 z-50 flex h-[100vh] w-full flex-col bg-white shadow-2xl sm:bottom-6 sm:right-6 sm:h-[32rem] sm:max-h-[80vh] sm:w-[24rem] sm:rounded-2xl sm:border sm:border-rule overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center justify-between bg-ink px-5 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gold/20">
              <svg class="h-5 w-5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div>
              <p class="font-display text-sm font-semibold text-parchment">Assistant MECEIPH</p>
              <p class="text-[10px] text-parchment/50">Assistant pastoral IA</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button
              v-if="messages.length > 1"
              @click="clearChat"
              class="rounded-md p-1.5 text-parchment/40 transition hover:bg-white/10 hover:text-parchment"
              title="Nouvelle conversation"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button
              @click="isOpen = false"
              class="rounded-md p-1.5 text-parchment/40 transition hover:bg-white/10 hover:text-parchment"
              aria-label="Fermer"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Messages area -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto bg-parchment/30 px-4 py-4 space-y-3">
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="flex"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[85%] rounded-2xl px-4 py-3 text-sm"
              :class="msg.role === 'user'
                ? 'bg-gold text-ink-dark rounded-br-sm'
                : 'bg-white border border-rule text-ink-dark rounded-bl-sm shadow-sm'"
            >
              <template v-if="msg.role === 'assistant'">
                <div class="chat-content space-y-2" v-html="formatMessage(msg.content)"></div>
              </template>
              <template v-else>
                <p class="leading-relaxed whitespace-pre-wrap">{{ msg.content }}</p>
              </template>
            </div>
          </div>

          <!-- Loading indicator -->
          <div v-if="loading" class="flex justify-start">
            <div class="rounded-2xl rounded-bl-sm bg-white border border-rule px-4 py-3 shadow-sm">
              <div class="flex items-center gap-1.5">
                <span class="h-2 w-2 animate-bounce rounded-full bg-ink-dark/30" style="animation-delay: 0ms"></span>
                <span class="h-2 w-2 animate-bounce rounded-full bg-ink-dark/30" style="animation-delay: 150ms"></span>
                <span class="h-2 w-2 animate-bounce rounded-full bg-ink-dark/30" style="animation-delay: 300ms"></span>
              </div>
            </div>
          </div>

          <!-- Error -->
          <div v-if="error" class="flex justify-center">
            <p class="text-xs text-rust">{{ error }}</p>
          </div>
        </div>

        <!-- Suggestions (only on first interaction) -->
        <div v-if="messages.length <= 1 && !loading" class="border-t border-rule bg-white px-4 py-3">
          <p class="mb-2 text-[10px] font-medium uppercase tracking-wide text-ink-dark/40">Suggestions</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="s in suggestions"
              :key="s"
              @click="useSuggestion(s)"
              class="rounded-full border border-rule bg-parchment/40 px-3 py-1.5 text-xs text-ink-dark/60 transition hover:border-gold hover:text-ink-dark"
            >
              {{ s }}
            </button>
          </div>
        </div>

        <!-- Input area — FIXED: sendMessage() with parens to avoid passing Event -->
        <div class="border-t border-rule bg-white p-3">
          <form @submit.prevent="sendMessage()" class="flex items-end gap-2">
            <textarea
              v-model="input"
              rows="1"
              placeholder="Posez votre question…"
              class="flex-1 resize-none rounded-xl border border-rule px-4 py-2.5 text-sm text-ink-dark outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
              style="max-height: 100px"
              @keydown.enter.exact.prevent="sendMessage()"
              @input="($event.target.style.height = 'auto'), ($event.target.style.height = Math.min($event.target.scrollHeight, 100) + 'px')"
            />
            <button
              type="submit"
              :disabled="loading || !input.trim()"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-ink-dark transition hover:bg-gold-light disabled:opacity-40"
              aria-label="Envoyer"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all 0.3s ease;
}
.chat-content p { margin-bottom: 0.5rem; }
.chat-content p:last-child { margin-bottom: 0; }
.chat-content ul, .chat-content ol { margin-top: 0.25rem; margin-bottom: 0.5rem; }
.chat-content li { margin-bottom: 0.15rem; }
.chat-content strong { font-weight: 600; }
.chat-content code { font-family: monospace; }

.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
