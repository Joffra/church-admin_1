import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Login from '../views/Login.vue'
import NotFound from '../views/NotFound.vue'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'login', component: Login, meta: { public: true } },
  { path: '/', name: 'dashboard', component: Dashboard },

  // ---- Churches ----
  { path: '/churches', name: 'churches', component: () => import('../views/Churches/ChurchList.vue') },
  { path: '/churches/new', name: 'church-create', component: () => import('../views/Churches/ChurchForm.vue'), meta: { roles: ['mission_admin'] } },
  { path: '/churches/:id', name: 'church-show', component: () => import('../views/Churches/ChurchShow.vue'), props: true },
  { path: '/churches/:id/edit', name: 'church-edit', component: () => import('../views/Churches/ChurchForm.vue'), props: true, meta: { roles: ['mission_admin'] } },

  // ---- Members (Iteration 1) ----
  { path: '/members', name: 'members', component: () => import('../views/Members/MemberList.vue') },
  { path: '/members/new', name: 'member-create', component: () => import('../views/Members/MemberForm.vue'), meta: { roles: ['church_admin'] } },
  { path: '/members/:id', name: 'member-show', component: () => import('../views/Members/MemberShow.vue'), props: true },
  { path: '/members/:id/edit', name: 'member-edit', component: () => import('../views/Members/MemberForm.vue'), props: true, meta: { roles: ['church_admin'] } },

  // ---- Users (Iteration 1) — Admin only ----
  { path: '/users', name: 'users', component: () => import('../views/Users/UserList.vue'), meta: { roles: ['mission_admin', 'church_admin'] } },

  // ---- Sanctions (Iteration 1) — Admin only ----
  { path: '/sanctions', name: 'sanctions', component: () => import('../views/Sanctions/SanctionList.vue'), meta: { roles: ['mission_admin', 'church_admin'] } },

  // ---- Password management (Itération 0) ----
  { path: '/password/change', name: 'password-change', component: () => import('../views/ChangePassword.vue') },
  { path: '/password/reset', name: 'password-reset', component: () => import('../views/ResetPassword.vue'), meta: { public: true } },

  // 404 catch-all — must be last
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound, meta: { public: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
  // Role-based route guard
  if (to.meta.roles && !to.meta.roles.includes(auth.role)) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
