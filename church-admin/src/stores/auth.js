import { defineStore } from 'pinia'
import { AuthAPI } from '../services/api'

function loadStoredUser() {
  try {
    const raw = localStorage.getItem('auth_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('auth_token') || null,
    user: loadStoredUser(),
    error: '',
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    fullName: (state) =>
      state.user ? `${state.user.first_name ?? ''} ${state.user.last_name ?? ''}`.trim() : '',
    role: (state) => state.user?.role || '',
    isMissionAdmin: (state) => state.user?.role === 'mission_admin',
    isChurchAdmin: (state) => state.user?.role === 'church_admin',
    // Admin = both mission_admin and church_admin
    isAdmin: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),

    // ---- User management (Itération 1) ----
    // View, search, suspend, activate, reset password → Admin (both)
    canManageUsers: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),

    // ---- Church management ----
    // Add/change pastor, add/change church admin → mission_admin only
    canManageChurches: (state) => state.user?.role === 'mission_admin',

    // ---- Member management (Itération 1) ----
    // View/search members → mission_admin + church_admin (backend only allows these two)
    canViewMembers: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),
    // Create member → church_admin only (backend store() blocks mission_admin)
    canCreateMembers: (state) => state.user?.role === 'church_admin',
    // Edit/archive member → both (gate passes for mission_admin via member:create-restricted)
    canManageMembers: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),
    // Sanction/lift sanction → church_admin only (mission_admin lacks member:sanction permission)
    canSanctionMembers: (state) => state.user?.role === 'church_admin',
    // Transfer → mission_admin only (church_admin lacks member:transfer permission in backend)
    canTransferMembers: (state) => state.user?.role === 'mission_admin',

    userChurchId: (state) => state.user?.church_id || null,
  },

  actions: {
    async login(member_code, password) {
      this.loading = true
      this.error = ''
      try {
        const { data } = await AuthAPI.login(member_code, password)
        this.token = data.access_token
        this.user = data.user
        localStorage.setItem('auth_token', data.access_token)
        localStorage.setItem('auth_user', JSON.stringify(data.user))
        return true
      } catch (e) {
        if (e.response?.status === 422 || e.response?.status === 400) {
          this.error =
            e.response.data?.message ||
            e.response.data?.errors?.message?.[0] ||
            'Identifiants incorrects.'
        } else if (e.response?.data?.message) {
          this.error = e.response.data.message
        } else {
          this.error = "Impossible de se connecter. Vérifiez votre connexion."
        }
        return false
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        await AuthAPI.logout()
      } catch {
        // even if the request fails, clear local state so the user isn't stuck
      }
      this.token = null
      this.user = null
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    },
  },
})
