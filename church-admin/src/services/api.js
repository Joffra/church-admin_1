import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    Accept: 'application/json',
  },
})

// Attach bearer token if present (Sanctum token auth)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// If the token is rejected/expired, clear local auth state.
// (Doesn't redirect here — the router guard handles navigation.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
    return Promise.reject(error)
  }
)

export default api

// ---- Auth ----

export const AuthAPI = {
  login: (member_code, password) => api.post('/login', { member_code, password }),
  logout: () => api.post('/logout'),
  me: () => api.get('/user'),

  // User Story 3 — Modifier son mot de passe
  changePassword: (current_password, new_password, new_password_confirmation) =>
    api.post('/password/update', { current_password, new_password, new_password_confirmation }),

  // User Story 4 — Réinitialiser son mot de passe (multi-step flow)
  sendResetCode: (email) => api.post('/password/reset/code', { email }),
  verifyResetCode: (email, code) => api.post('/password/reset/code/verify', { email, code }),
}

// ---- Churches ----

export const ChurchesAPI = {
  list: (params) => api.get('/churches', { params }),
  get: (id) => api.get(`/churches/${id}`),
  // JSON-only update (basic fields)
  update: (id, data) => api.put(`/churches/${id}`, data),
  // Status toggle — updated route path
  changeStatus: (id, newStatus) => api.patch(`/churches/${id}/status/change`, { status: newStatus }),
  // FormData create (supports church_image file upload + pastor/admin fields)
  createForm: (formData) => api.post('/churches', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  // FormData update with method spoofing (PUT via POST + _method=PUT)
  updateForm: (id, formData) => api.post(`/churches/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  remove: (id) => api.delete(`/churches/${id}`),
  // Change head pastor — updated route path: /churches/{id}/pastor/change
  changePastor: (id, pastorMemberId) => api.put(`/churches/${id}/pastor/change`, { pastor_member_id: pastorMemberId }),
}

export const EcclesiasticalTitlesAPI = {
  list: (params) => api.get('/ecclesiastical-titles', { params }),
}

// ---- Members (now PAGINATED with SearchMemberRequest) ----

export const MembersAPI = {
  // Paginated — supports ?search=...&per_page=15&page=1&sort_by=last_name&order_by=asc&church_id=...&ecclesiastical_title_id=...
  list: (params) => api.get('/members', { params }),
  get: (id) => api.get(`/members/${id}`),
  // FormData create (supports profile_picture upload)
  createForm: (formData) => api.post('/members', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  // FormData update with method spoofing
  updateForm: (id, formData) => api.post(`/members/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  remove: (id) => api.delete(`/members/${id}`),
  // Sanction a member (reason, description?, ends_at?)
  sanction: (id, data) => api.post(`/members/${id}/sanction`, data),
  // Lift a sanction (lifted_reason)
  liftSanction: (id, data) => api.post(`/members/${id}/sanction/lift`, data),
  // Transfer member to another church (new_church_id)
  transfer: (id, data) => api.patch(`/members/${id}/transfer`, data),
}

// ---- Pastors (members with ecclesiastical title 'Pasteur') ----

export const PastorsAPI = {
  list: () => api.get('/pastors'),
}

// ---- Users ----

export const UsersAPI = {
  // Paginated — supports ?search=...&per_page=20
  list: (params) => api.get('/users', { params }),
  // Suspend/deactivate a user account
  suspend: (id) => api.patch(`/users/${id}/suspend`),
  // Activate a user account
  activate: (id) => api.patch(`/users/${id}/activate`),
  // Admin resets a user's password (sends temp password via email)
  resetPassword: (id) => api.patch(`/users/${id}/password/reset`),
  // Promote a user to church_admin (mission_admin only)
  promote: (id) => api.patch(`/users/${id}/promote`),
}

// ---- Sanctions ----

export const SanctionsAPI = {
  // Paginated — supports ?search=...&status=active|lifted&per_page=15
  list: (params) => api.get('/sanctions', { params }),
}

// ---- Missions (public mission info) ----

export const MissionsAPI = {
  get: () => api.get('/missions'),
}

// ---- Contact (public contact form) ----

export const ContactAPI = {
  send: (data) => api.post('/contact', data),
}
