import { defineStore } from 'pinia'
import { AuthAPI, CommitteesAPI } from '../services/api'

function loadStoredUser() {
  try {
    const raw = localStorage.getItem('auth_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function loadStoredPermissions() {
  try {
    const raw = localStorage.getItem('auth_permissions')
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Base permissions granted purely by the user's role.
// Mirrors User::hasPermission() in the backend (app/Models/User.php)
// so the frontend never grants something the backend would 403.
const ROLE_PERMISSIONS = {
  mission_admin: [
    'church:manage',
    'user:manage',
    'user:view-any',
    'member:view-any',
    'member:create-restricted',
    'member:transfer',
    'member:sanction',
    'sanction:view-any',
    'committee:manage',
    'committee:view-any',
    'knowledge:manage',
    // Backend Gate 'manage-members' also lets mission_admin edit members
    // in any church via 'member:create-restricted'; 'member:manage' here is
    // the effective frontend view of that (mission_admin is still blocked
    // from *creating* members by MemberController::store).
    'member:manage',
  ],
  church_admin: [
    'member:manage',
    'member:view-any',
    'committee:manage',
    'committee:view-any',
    'member:sanction',
    'member:transfer',
    'sanction:view-any',
    'user:manage',
    'user:view-any',
  ],
  // Simple users only ever get this from their role; anything extra must
  // come from an active committee title (e.g. Secrétaire Général).
  user: ['committee:view-any'],
}

function roleBasePermissions(role) {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.user
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('auth_token') || null,
    user: loadStoredUser(),
    // Effective permissions: role base + committee-title permissions
    // hydrated from GET /committees (assignment.title.permissions_slugs).
    permissions: loadStoredPermissions(),
    permissionsHydrated: false,
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

    // ---- Effective permissions (role + committee titles) ----
    can: (state) => (slug) => state.permissions.includes(slug),

    // Committee-derived permissions only (used to detect users like a
    // Secrétaire Général who holds real backend permissions).
    hasCommitteePowers: (state) =>
      state.permissions.some((slug) => !roleBasePermissions(state.user?.role).includes(slug)),

    // Must change password (forced on first login or after admin reset)
    mustChangePassword: (state) => {
      const value = state.user?.must_change_password ?? state.user?.mustChangePassword
      return value === true || value === 1 || value === '1' || value === 'true'
    },

    // Dashboard: admins, or committee members with real permissions
    // (e.g. Secrétaire Général). Plain users stay on Mon Église.
    canAccessDashboard: (state) =>
      ['mission_admin', 'church_admin'].includes(state.user?.role) ||
      state.permissions.some(
        (slug) => !roleBasePermissions(state.user?.role).includes(slug)
      ),

    // ---- User management (backend: user:view-any / user:manage) ----
    canViewUsers: (state) => state.permissions.includes('user:view-any'),
    canManageUsers: (state) => state.permissions.includes('user:manage'),

    // ---- Church management (backend: church:manage — mission_admin only) ----
    canManageChurches: (state) => state.user?.role === 'mission_admin',

    // ---- Member management ----
    canViewMembers: (state) => state.permissions.includes('member:view-any'),
    // Create/update: backend Gate 'manage-members' allows 'member:manage'
    // holders within their own church (church_admin, Secrétaire Général).
    // Mission_admin edits via 'member:create-restricted' but is blocked
    // from creating by MemberController::store.
    // Create: 'member:manage' holders only (church_admin, Secrétaire Général,
    // Pasteur Responsable, Pasteur Assistant, Diacre/Diaconesse).
    // mission_admin is explicitly blocked from creating by MemberController::store.
    canCreateMembers: (state) => state.permissions.includes('member:manage'),
    // Edit: same as create, PLUS mission_admin (backend Gate 'manage-members'
    // passes them via 'member:create-restricted' on any church).
    canEditMember: (state) =>
      state.permissions.includes('member:manage') ||
      state.user?.role === 'mission_admin',
    canManageMembers: (state) => state.permissions.includes('member:manage'),
    canSanctionMembers: (state) => state.permissions.includes('member:sanction'),

    // Transfers: mirrors the backend transfer-members Gate.
    // mission_admin and church_admin receive this from their role base;
    // committee titles may also grant it to regular users.
    canTransferMembers: (state) => state.permissions.includes('member:transfer'),

    // ---- Sanctions ----
    canViewSanctions: (state) => state.permissions.includes('sanction:view-any'),

    // ---- Committee management ----
    canManageCommittees: (state) => state.permissions.includes('committee:manage'),

    // ---- Knowledge base (RAG documents used by the AI chatbot) ----
    // Backend Gate 'manage-knowledge-base' allows mission_admin OR the Bishop
    // (member->isBishop()) OR anyone holding the 'knowledge:manage' permission
    // via a committee title. The login/user payload doesn't expose an
    // is_bishop flag today, so a Bishop who isn't also mission_admin won't
    // see this menu until the backend adds that field — flagged to the team.
    canManageKnowledgeBase: (state) =>
      state.user?.role === 'mission_admin' ||
      state.permissions.includes('knowledge:manage'),

    userChurchId: (state) => state.user?.church_id || null,
    userMemberId: (state) => state.user?.member_id || null,
  },

  actions: {
    // Hydrate effective permissions from the backend.
    //
    // The /committees response includes each member's committee assignment
    // with the title's permission slugs (CommitteeResource →
    // assignment.title.permissions_slugs), exactly the data the backend's
    // User::hasPermission() resolves from the permission_title pivot.
    // We mirror its rules: only ACTIVE committees count, and the current
    // user's own member_id must appear among the committee members.
    //
    // On any failure we fall back to the role base, so a committee-less
    // admin keeps working and a 403 never breaks login.
    async hydratePermissions() {
      const base = roleBasePermissions(this.user?.role)
      const slugs = new Set(base)

      if (this.token && this.user?.member_id) {
        try {
          const { data } = await CommitteesAPI.list()
          const payload = data?.data ?? data
          const list = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : []

          const memberId = String(this.user.member_id)
          for (const committee of list) {
            if (!committee || committee.status !== 'active') continue
            for (const m of committee.members || []) {
              if (String(m?.id) !== memberId) continue
              const titleSlugs = m.assignment?.title?.permissions_slugs
              if (Array.isArray(titleSlugs)) titleSlugs.forEach((s) => slugs.add(s))
            }
          }
        } catch {
          // /committees unreachable or forbidden → role-only permissions.
        }
      }

      this.permissions = [...slugs]
      this.permissionsHydrated = true
      localStorage.setItem('auth_permissions', JSON.stringify(this.permissions))
    },

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

        // Role-only permissions first (router guard needs them immediately),
        // then upgrade with committee-title permissions in the background.
        await this.hydratePermissions()
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
      this.permissions = []
      this.permissionsHydrated = false
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_permissions')
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
      this.permissions = []
      localStorage.removeItem('auth_permissions')
    },

    // Re-validate the session on app boot by fetching /user from the backend
    async initAuth() {
      if (!this.token) return
      try {
        const { data } = await AuthAPI.me()
        const userData = data.data ?? data
        if (userData) {
          this.user = {
            ...userData,
            member_id: userData.member_id ?? userData.member?.id ?? this.user?.member_id ?? null,
            church_id:
              userData.church_id ??
              userData.member?.church_id ??
              this.user?.church_id ??
              null,
          }
          localStorage.setItem('auth_user', JSON.stringify(this.user))
        }
        await this.hydratePermissions()
      } catch {
        // Token is invalid/expired — clear everything
        this.token = null
        this.user = null
        this.permissions = []
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        localStorage.removeItem('auth_permissions')
      }
    },
  },
})
