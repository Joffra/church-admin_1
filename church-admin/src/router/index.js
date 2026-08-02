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
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { public: true } },

  // ---- Admin (auth required) ----
  { path: '/admin', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { requiresDashboard: true } },
  // Mon Église — scoped church view accessible to all authenticated users
  { path: '/mon-eglise', name: 'mon-eglise', component: () => import('../views/MyChurch.vue') },
  // Own profile page — always accessible to authenticated users
  { path: '/profile', name: 'profile', component: () => import('../views/MyProfile.vue') },
  // Churches — list and detail are public to all authenticated users
  { path: '/churches', name: 'churches', component: () => import('../views/Churches/ChurchList.vue') },
  { path: '/churches/new', name: 'church-create', component: () => import('../views/Churches/ChurchForm.vue'), meta: { requiresChurchManager: true } },
  { path: '/churches/:id', name: 'church-show', component: () => import('../views/Churches/ChurchShow.vue'), props: true },
  { path: '/churches/:id/edit', name: 'church-edit', component: () => import('../views/Churches/ChurchForm.vue'), props: true, meta: { requiresChurchManager: true } },
  // Members
  { path: '/members', name: 'members', component: () => import('../views/Members/MemberList.vue'), meta: { requiresMemberViewer: true } },
  { path: '/members/new', name: 'member-create', component: () => import('../views/Members/MemberForm.vue'), meta: { requiresChurchAdmin: true } },
  { path: '/members/:id', name: 'member-show', component: () => import('../views/Members/MemberShow.vue'), props: true, meta: { requiresMemberShow: true } },
  { path: '/members/:id/edit', name: 'member-edit', component: () => import('../views/Members/MemberForm.vue'), props: true, meta: { requiresChurchAdmin: true } },
  // Users
  { path: '/users', name: 'users', component: () => import('../views/Users/UserList.vue'), meta: { requiresAdmin: true } },
  // Committees
  { path: '/committees', name: 'committees', component: () => import('../views/Committees/CommitteeList.vue') },
  { path: '/committees/:id', name: 'committee-show', component: () => import('../views/Committees/CommitteeShow.vue'), props: true },
  // Sanctions
  { path: '/sanctions', name: 'sanctions', component: () => import('../views/Sanctions/SanctionList.vue'), meta: { requiresAdmin: true } },
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

router.beforeEach((to, from) => {
  const auth = useAuthStore()

  // 1. Portal & public routes — always allow
  if (to.meta.portal || to.meta.public) return true

  // 2. Must be authenticated for everything else
  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 3. Already logged in → skip login page UNLESS must_change_password is set
  // (the login page itself handles the inline password change form)
  if (to.name === 'login') {
    if (auth.mustChangePassword) return true  // stay on login to change password
    return { name: 'dashboard' }
  }

  // 4. Force password change — block all admin pages, redirect to login
  // (login page shows the inline password change form)
  if (auth.mustChangePassword && to.name !== 'password-change' && to.name !== 'profile') {
    return { name: 'login' }
  }

  // 5. Dashboard route itself is restricted to admins — redirect simple users to Mon Église
  if (to.meta.requiresDashboard && !auth.canAccessDashboard) {
    return { name: 'mon-eglise' }
  }

  // 6. Requires mission_admin (church manager)
  if (to.meta.requiresChurchManager && !auth.canManageChurches) {
    return { name: 'dashboard' }
  }

  // 7. Requires admin (both mission_admin and church_admin)
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'mon-eglise' }
  }

  // 8. Requires at least admin to view member list
  if (to.meta.requiresMemberViewer && !auth.canViewMembers) {
    return { name: 'mon-eglise' }
  }

  // 9. Create/edit member: church_admin ONLY
  if (to.meta.requiresChurchAdmin && !auth.canCreateMembers) {
    return { name: 'members' }
  }

  // 10. Member detail page: admins only
  if (to.meta.requiresMemberShow) {
    if (auth.isAdmin) return true
    return { name: 'profile' }
  }

  return true
})

export default router
