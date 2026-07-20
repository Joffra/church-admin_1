import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Login from '../views/Login.vue'
import NotFound from '../views/NotFound.vue'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'login', component: Login, meta: { public: true } },
  { path: '/', name: 'dashboard', component: Dashboard },
  // Churches — list and detail are public to all authenticated users
  { path: '/churches', name: 'churches', component: () => import('../views/Churches/ChurchList.vue') },
  { path: '/churches/new', name: 'church-create', component: () => import('../views/Churches/ChurchForm.vue'), meta: { requiresChurchManager: true } },
  { path: '/churches/:id', name: 'church-show', component: () => import('../views/Churches/ChurchShow.vue'), props: true },
  { path: '/churches/:id/edit', name: 'church-edit', component: () => import('../views/Churches/ChurchForm.vue'), props: true, meta: { requiresChurchManager: true } },
  // Members — list requires admin; create/edit require church_admin; show is restricted (see guard below)
  { path: '/members', name: 'members', component: () => import('../views/Members/MemberList.vue'), meta: { requiresMemberViewer: true } },
  { path: '/members/new', name: 'member-create', component: () => import('../views/Members/MemberForm.vue'), meta: { requiresChurchAdmin: true } },
  { path: '/members/:id', name: 'member-show', component: () => import('../views/Members/MemberShow.vue'), props: true, meta: { requiresMemberShow: true } },
  { path: '/members/:id/edit', name: 'member-edit', component: () => import('../views/Members/MemberForm.vue'), props: true, meta: { requiresChurchAdmin: true } },
  // Users (Itération 1)
  { path: '/users', name: 'users', component: () => import('../views/Users/UserList.vue'), meta: { requiresAdmin: true } },
  // Sanctions (Itération 1)
  { path: '/sanctions', name: 'sanctions', component: () => import('../views/Sanctions/SanctionList.vue'), meta: { requiresAdmin: true } },
  // Password management
  { path: '/password/change', name: 'password-change', component: () => import('../views/ChangePassword.vue') },
  { path: '/password/reset', name: 'password-reset', component: () => import('../views/ResetPassword.vue'), meta: { public: true } },
  // 404 catch-all — must be last
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound, meta: { public: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from) => {
  const auth = useAuthStore()

  // 1. Public routes — always allow
  if (to.meta.public) return true

  // 2. Must be authenticated for everything else
  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 3. Already logged in → skip login page
  if (to.name === 'login') {
    return { name: 'dashboard' }
  }

  // 4. Requires mission_admin (church manager)
  if (to.meta.requiresChurchManager && !auth.canManageChurches) {
    return { name: 'dashboard' }
  }

  // 5. Requires admin (both mission_admin and church_admin)
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'dashboard' }
  }

  // 6. Requires at least admin to view member list
  if (to.meta.requiresMemberViewer && !auth.canViewMembers) {
    return { name: 'dashboard' }
  }

  // 7. Requires church_admin to create/edit members
  if (to.meta.requiresChurchAdmin && !auth.canManageMembers) {
    return { name: 'dashboard' }
  }

  // 8. Member detail page: admins can see any, regular users can only see their own profile
  if (to.meta.requiresMemberShow) {
    if (auth.isAdmin) return true
    // Regular user → only their own member profile
    const memberId = String(auth.userMemberId)
    const requestedId = String(to.params.id)
    if (memberId && memberId === requestedId) return true
    // Not their profile → redirect to their own profile if we know it, else dashboard
    if (memberId) return { name: 'member-show', params: { id: memberId } }
    return { name: 'dashboard' }
  }

  return true
})

export default router
