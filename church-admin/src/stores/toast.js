import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])
  let id = 0

  function add(message, type = 'success', duration = 4000) {
    const toastId = ++id
    toasts.value.push({ id: toastId, message, type })
    setTimeout(() => dismiss(toastId), duration)
  }

  function dismiss(toastId) {
    const idx = toasts.value.findIndex(t => t.id === toastId)
    if (idx > -1) toasts.value.splice(idx, 1)
  }

  function success(msg, duration) { add(msg, 'success', duration) }
  function error(msg, duration) { add(msg, 'error', duration ?? 6000) }
  function info(msg, duration) { add(msg, 'info', duration) }

  return { toasts, dismiss, success, error, info }
})
