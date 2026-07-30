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
    isSimpleUser: (state) => state.user?.role === 'user',

    // Must change password (forced on first login or after admin reset)
    mustChangePassword: (state) => !!state.user?.must_change_password,

    // Simple users (role=user) WITHOUT any admin permissions should NOT access dashboard
    // They can still access profile and password pages
    canAccessDashboard: (state) => {
      const role = state.user?.role
      if (role === 'mission_admin' || role === 'church_admin') return true
      // For regular users, check if they have committee-based permissions
      // Since the frontend doesn't have the full permission list, we rely on
      // the backend. But as a heuristic, users without admin role get redirected to portal.
      // They CAN still access /profile and /password/*
      return false
    },

    // ---- User management ----
    canManageUsers: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),

    // ---- Church management ----
    canManageChurches: (state) => state.user?.role === 'mission_admin',

    // ---- Member management ----
    canViewMembers: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),
    canCreateMembers: (state) => state.user?.role === 'church_admin',
    canManageMembers: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),
    canSanctionMembers: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),
    canTransferMembers: (state) => state.user?.role === 'mission_admin',

    // ---- Committee management ----
    canManageCommittees: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),

    userChurchId: (state) => state.user?.church_id || null,
    userMemberId: (state) => state.user?.member_id || null,
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

    // Called after successful password change — clear the flag locally
    passwordChanged() {
      if (this.user) {
        this.user.must_change_password = false
        localStorage.setItem('auth_user', JSON.stringify(this.user))
      }
    },

    // Called by the API interceptor when backend returns 403 PASSWORD_CHANGE_REQUIRED
    flagMustChangePassword() {
      if (this.user) {
        this.user.must_change_password = true
        localStorage.setItem('auth_user', JSON.stringify(this.user))
      }
    },
  },
})
