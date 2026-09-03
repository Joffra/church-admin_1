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
    mustChangePassword: (state) => {
      const value = state.user?.must_change_password ?? state.user?.mustChangePassword
      return value === true || value === 1 || value === '1' || value === 'true'
    },

    // Simple users (role=user) WITHOUT any admin permissions should NOT access dashboard
    // They can still access profile and password pages
    canAccessDashboard: (state) => {
      const role = state.user?.role
      if (role === 'mission_admin' || role === 'church_admin') return true
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

    // ---- Knowledge base (RAG documents used by the AI chatbot) ----
    // Backend Gate 'manage-knowledge-base' allows mission_admin OR the Bishop
    // (member->isBishop()) OR anyone holding the 'knowledge:manage' permission
    // via a committee title. The login/user payload doesn't expose an
    // is_bishop flag today, so a Bishop who isn't also mission_admin won't
    // see this menu until the backend adds that field — flagged to the team.
    canManageKnowledgeBase: (state) => state.user?.role === 'mission_admin' || !!state.user?.is_bishop,

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
        localStorage.setItem('auth_token', data.access_token)

        let user = data.user || {}
        try {
          const me = await AuthAPI.me()
          const remoteUser = me.data?.data ?? me.data
          if (remoteUser && typeof remoteUser === 'object') user = { ...user, ...remoteUser }
        } catch {
          // Keep the login payload if /user is temporarily unavailable.
        }
        user = {
          ...user,
          member_id: user.member_id ?? user.member?.id ?? null,
          church_id: user.church_id ?? user.member?.church_id ?? user.member?.church?.id ?? null,
        }
        this.user = user
        localStorage.setItem('auth_user', JSON.stringify(user))
        return true
      } catch (e) {
        if (e.response?.status === 422 || e.response?.status === 400) {
          // Robustly extract Laravel validation messages
          const resData = e.response.data
          if (resData?.errors) {
            const firstField = Object.keys(resData.errors)[0]
            this.error = resData.errors[firstField]?.[0] || resData.message || 'Identifiants incorrects.'
          } else {
            this.error = resData?.message || 'Identifiants incorrects.'
          }
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

    // Called when the 401 interceptor fires — clears Pinia state to stay in sync
    handleTokenExpired() {
      this.token = null
      this.user = null
    },

    // Re-validate the session on app boot by fetching /user from the backend
    async initAuth() {
      if (!this.token) return
      try {
        const { data } = await AuthAPI.me()
        const userData = data.data ?? data
        if (userData) {
          this.user = userData
          localStorage.setItem('auth_user', JSON.stringify(userData))
        }
      } catch {
        // Token is invalid/expired — clear everything
        this.token = null
        this.user = null
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    },
  },
})
