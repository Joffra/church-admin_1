import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  // ---- Public portal (no auth required) ----
  { path: '/', name: 'portal-home', component: () => import('../views/Portal/PortalHome.vue'), meta: { portal: true } },
  { path: '/mission', name: 'portal-mission', component: () => import('../views/Portal/PortalMission.vue'), meta: { portal: true } },
  { path: '/eglises', name: 'portal-churches', component: () => import('../views/Portal/PortalChurches.vue'), meta: { portal: true } },
  { path: '/contact', name: 'portal-contact', component: () => import('../views/Portal/PortalContact.vue'), meta: { portal: true } },
  { path: '/eglises/:id', name: 'portal-church-detail', component: () => import('../views/Portal/PortalChurchDetail.vue'), props: true, meta: { portal: true } },

  // ---- Auth ----
  // /connexion — unified login entry point for members and administrators
  { path: '/connexion', redirect: (to) => ({ name: 'login-admin', query: to.query }), meta: { public: true } },
  // /login — administration login for admins (mission_admin, church_admin)
  { path: '/login', name: 'login-admin', component: () => import('../views/Login.vue'), meta: { public: true } },

  // ---- Admin (auth required) ----
  { path: '/admin', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { requiresDashboard: true } },
  // Mon Église — scoped church view accessible to all authenticated users
  { path: '/mon-eglise', name: 'mon-eglise', component: () => import('../views/MyChurch.vue') },
  // Churches — list and detail are public to all authenticated users
  { path: '/churches', name: 'churches', component: () => import('../views/Churches/ChurchList.vue') },
  { path: '/churches/new', name: 'church-create', component: () => import('../views/Churches/ChurchForm.vue'), meta: { requiresChurchManager: true } },
  { path: '/churches/:id', name: 'church-show', component: () => import('../views/Churches/ChurchShow.vue'), props: true },
  { path: '/churches/:id/edit', name: 'church-edit', component: () => import('../views/Churches/ChurchForm.vue'), props: true, meta: { requiresChurchManager: true } },
  // Members
  { path: '/members', name: 'members', component: () => import('../views/Members/MemberList.vue'), meta: { requiresMemberViewer: true } },
  { path: '/members/new', name: 'member-create', component: () => import('../views/Members/MemberForm.vue'), meta: { requiresMemberCreate: true } },
  { path: '/members/:id', name: 'member-show', component: () => import('../views/Members/MemberShow.vue'), props: true, meta: { requiresMemberViewer: true } },
  { path: '/members/:id/edit', name: 'member-edit', component: () => import('../views/Members/MemberForm.vue'), props: true, meta: { requiresMemberEditor: true } },
  // Users
  { path: '/users', name: 'users', component: () => import('../views/Users/UserList.vue'), meta: { requiresUserViewer: true } },
  // Committees
  { path: '/committees', name: 'committees', component: () => import('../views/Committees/CommitteeList.vue') },
  { path: '/committees/:id', name: 'committee-show', component: () => import('../views/Committees/CommitteeShow.vue'), props: true },
  // Sanctions
  { path: '/sanctions', name: 'sanctions', component: () => import('../views/Sanctions/SanctionList.vue'), meta: { requiresSanctionViewer: true } },
  // Knowledge base — documents used by the AI chatbot (RAG). Mission admin / Bishop only.
  { path: '/knowledge-files', name: 'knowledge-files', component: () => import('../views/KnowledgeFiles/KnowledgeFileList.vue'), meta: { requiresKnowledgeManager: true } },
  // Password management — always accessible to authenticated users
  { path: '/password/change', name: 'password-change', component: () => import('../views/ChangePassword.vue') },
  { path: '/password/reset', name: 'password-reset', component: () => import('../views/ResetPassword.vue'), meta: { public: true } },
  // 404 catch-all
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFound.vue'), meta: { public: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Set browser tab title based on route section
router.afterEach((to) => {
  if (to.meta.portal) {
    document.title = 'MECEIPH.portail web'
  } else {
    document.title = 'MECEIPH.administration'
  }
})

router.beforeEach(async (to, from) => {
  const auth = useAuthStore()

  // 1. Portal & public routes — always allow
  if (to.meta.portal || to.meta.public) return true

  // 2. Must be authenticated for everything else
  if (!auth.isAuthenticated) {
    return { name: 'login-admin', query: { redirect: to.fullPath } }
  }

  // Hydrate role and committee-title permissions before protected routes
  // are evaluated, including after a direct page refresh.
  if (!auth.permissionsHydrated) await auth.initAuth()

  // 3. Already logged in → skip login pages UNLESS must_change_password
  // (the login page itself renders the inline password-change form —
  // returning `true` here just lets the user stay put, no self-redirect)
  if (to.name === 'login-admin') {
    if (auth.mustChangePassword) return true
    if (auth.canAccessDashboard) return { name: 'dashboard' }
    return { name: 'mon-eglise' }
  }

  // 4. Forced password changes take priority over every protected page.
  // Bounce back to the login page (inline change form) — NOT to
  // /password/change, since that route renders inside the admin layout
  // (SideNav + full nav) which must stay hidden until the change is done.
  if (auth.mustChangePassword && to.name !== 'login-admin') {
    return { name: 'login-admin' }
  }

  // 5. Dashboard route — admins plus committee members holding real
  // permissions (e.g. Secrétaire Général); plain users → Mon Église
  if (to.meta.requiresDashboard && !auth.canAccessDashboard) {
    return { name: 'mon-eglise' }
  }

  // 6. Requires mission_admin (church manager)
  if (to.meta.requiresChurchManager && !auth.canManageChurches) {
    return auth.canAccessDashboard ? { name: 'dashboard' } : { name: 'mon-eglise' }
  }

  // 7. Requires 'user:view-any' (mission_admin, church_admin)
  if (to.meta.requiresUserViewer && !auth.canViewUsers) {
    return auth.canAccessDashboard ? { name: 'dashboard' } : { name: 'mon-eglise' }
  }

  // 8. Requires 'member:view-any' (mission_admin, church_admin,
  // committee titles like Secrétaire Général)
  if (to.meta.requiresMemberViewer && !auth.canViewMembers) {
    return auth.canAccessDashboard ? { name: 'dashboard' } : { name: 'mon-eglise' }
  }

  // 9. Create member: 'member:manage' holders only (church_admin,
  // Secrétaire Général, Pasteur Responsable, Pasteur Assistant, Diacre).
  // mission_admin is blocked from creating by MemberController::store.
  if (to.meta.requiresMemberCreate && !auth.canCreateMembers) {
    return auth.canViewMembers ? { name: 'members' } : { name: 'mon-eglise' }
  }

  // 9b. Edit member: 'member:manage' holders or mission_admin
  // (backend Gate 'manage-members' passes mission_admin via
  // 'member:create-restricted' on any church)
  if (to.meta.requiresMemberEditor && !auth.canEditMember) {
    return auth.canViewMembers ? { name: 'members' } : { name: 'mon-eglise' }
  }

  // 9b. Knowledge base management: mission_admin or Bishop only
  if (to.meta.requiresKnowledgeManager && !auth.canManageKnowledgeBase) {
    return auth.canAccessDashboard ? { name: 'dashboard' } : { name: 'mon-eglise' }
  }

  // 10. Sanctions list: 'sanction:view-any' holders
  if (to.meta.requiresSanctionViewer && !auth.canViewSanctions) {
    return auth.canAccessDashboard ? { name: 'dashboard' } : { name: 'mon-eglise' }
  }

  return true
})

export default router
