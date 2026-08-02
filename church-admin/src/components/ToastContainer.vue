<script setup>
import { useToastStore } from '../stores/toast'

const toast = useToastStore()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-3 sm:bottom-8 sm:right-8">
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="translate-x-20 opacity-0 scale-90"
        enter-to-class="translate-x-0 opacity-100 scale-100"
        leave-active-class="transition-all duration-250 ease-in"
        leave-from-class="translate-x-0 opacity-100 scale-100"
        leave-to-class="translate-x-20 opacity-0 scale-90"
        move-class="transition-transform duration-300"
      >
        <div
          v-for="t in toast.toasts"
          :key="t.id"
          class="flex items-center gap-3 rounded-lg px-5 py-3.5 shadow-lg backdrop-blur-md min-w-[280px] max-w-sm cursor-pointer"
          :class="{
            'bg-emerald-50/95 border border-emerald-200 text-emerald-800': t.type === 'success',
            'bg-red-50/95 border border-red-200 text-red-800': t.type === 'error',
            'bg-blue-50/95 border border-blue-200 text-blue-800': t.type === 'info',
          }"
          @click="toast.dismiss(t.id)"
        >
          <!-- Icon -->
          <svg v-if="t.type === 'success'" viewBox="0 0 24 24" class="h-5 w-5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else-if="t.type === 'error'" viewBox="0 0 24 24" class="h-5 w-5 shrink-0 text-red-500" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else viewBox="0 0 24 24" class="h-5 w-5 shrink-0 text-blue-500" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v5M12 16h.01" stroke-linecap="round" />
          </svg>

          <p class="text-sm font-medium leading-snug">{{ t.message }}</p>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
