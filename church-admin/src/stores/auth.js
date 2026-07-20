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
    // view-users gate: mission_admin (has user:view-any), church_admin (has user:view-any)
    // manage-users gate: mission_admin (always true), church_admin (same church)
    canManageUsers: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),

    // ---- Church management ----
    // manage-churches gate: requires church:manage permission
    // mission_admin has it, church_admin does NOT
    canManageChurches: (state) => state.user?.role === 'mission_admin',

    // ---- Member management (Itération 1) ----
    // view-members gate: mission_admin (always true), church_admin (own church), others → 403
    canViewMembers: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),
    // store(): manage-members gate passes for mission_admin (member:create-restricted)
    // BUT controller explicitly returns 403 for mission_admin → church_admin only
    canCreateMembers: (state) => state.user?.role === 'church_admin',
    // update()/destroy(): manage-members gate → both pass (church_admin via member:manage,
    // mission_admin via member:create-restricted)
    canManageMembers: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),
    // sanction-members gate: mission_admin → true (before perm check),
    // church_admin → has member:sanction (own church)
    canSanctionMembers: (state) => ['mission_admin', 'church_admin'].includes(state.user?.role),
    // transfer-members gate: mission_admin → true,
    // church_admin → does NOT have member:transfer → false
    canTransferMembers: (state) => state.user?.role === 'mission_admin',

    userChurchId: (state) => state.user?.church_id || null,
    // The member_id of the currently logged-in user (login response provides this)
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
  },
})
