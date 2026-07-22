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
    role: (state) => state.user?.role || null,

    // Role checks — four roles: mission_admin > church_admin > secretaire > utilisateur
    isMissionAdmin: (state) => state.user?.role === 'mission_admin',
    isChurchAdmin:  (state) => state.user?.role === 'church_admin',
    isSecretaire:   (state) => state.user?.role === 'secretaire',
    isUtilisateur:  (state) => state.user?.role === 'utilisateur',

    // "isAdmin" = has elevated access (not a plain viewer)
    isAdmin: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),

    // Has ANY elevated role (sees more than the public read-only view)
    hasElevatedRole: (state) =>
      ['mission_admin', 'church_admin', 'secretaire'].includes(state.user?.role),

    churchId: (state) => state.user?.church_id || null,

    // Church management: create / edit / archive churches, change pastor — mission_admin only
    canManageChurches: (state) => state.user?.role === 'mission_admin',

    // Status toggle on churches — mission_admin only
    canToggleChurchStatus: (state) => state.user?.role === 'mission_admin',

    // User management: suspend/activate/reset password — admin roles only
    canManageUsers: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),

    // Member CRUD (add/edit/archive/transfer) — church_admin + secretaire
    canManageMembers: (state) =>
      ['mission_admin', 'church_admin', 'secretaire'].includes(state.user?.role),

    // Sanctioning members — church_admin + secretaire
    canSanctionMembers: (state) =>
      ['mission_admin', 'church_admin', 'secretaire'].includes(state.user?.role),

    // Viewing sanctions list — admins only
    canViewSanctions: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),

    // Plain read-only user — can only view, never modify
    isReadOnly: (state) => state.user?.role === 'utilisateur',
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
        // even if the request fails, clear local state
      }
      this.token = null
      this.user = null
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    },
  },
})
