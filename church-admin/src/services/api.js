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
  changePassword: (current_password, new_password, new_password_confirmation) =>
    api.post('/password/update', { current_password, new_password, new_password_confirmation }),
  sendResetCode: (email) => api.post('/password/reset/code', { email }),
  verifyResetCode: (email, code) => api.post('/password/reset/code/verify', { email, code }),
}

// ---- Churches ----

export const ChurchesAPI = {
  list: (params) => api.get('/churches', { params }),
  get: (id) => api.get(`/churches/${id}`),
  update: (id, data) => api.put(`/churches/${id}`, data),
  changeStatus: (id, newStatus) => api.patch(`/churches/${id}/status/change`, { status: newStatus }),
  changePastor: (id, pastorMemberId) => api.put(`/churches/${id}/pastor/change`, { pastor_member_id: pastorMemberId }),
  changeAdmin: (id, adminMemberId) => api.put(`/churches/${id}/admin/change`, { admin_member_id: adminMemberId }),
  createForm: (formData) => api.post('/churches', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateForm: (id, formData) => api.post(`/churches/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  remove: (id, data) => api.delete(`/churches/${id}`, { data }),
}

// ---- Members ----

export const MembersAPI = {
  list: (params) => api.get('/members', { params }),
  get: (id) => api.get(`/members/${id}`),
  createForm: (formData) => api.post('/members', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateForm: (id, formData) => api.post(`/members/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  remove: (id) => api.delete(`/members/${id}`),
  sanction: (id, data) => api.post(`/members/${id}/sanction`, data),
  liftSanction: (id, lifted_reason) => api.post(`/members/${id}/sanction/lift`, { lifted_reason }),
  transfer: (id, new_church_id) => api.patch(`/members/${id}/transfer`, { new_church_id }),
  availablePastors: () => api.get('/pastors'),
  availableAdmins: () => api.get('/available-users'),
}

// ---- Users ----

export const UsersAPI = {
  list: (params) => api.get('/users', { params }),
  suspend: (id) => api.patch(`/users/${id}/suspend`),
  activate: (id) => api.patch(`/users/${id}/activate`),
  resetPassword: (id) => api.patch(`/users/${id}/password/reset`),
}

// ---- Sanctions ----

export const SanctionsAPI = {
  list: (params) => api.get('/sanctions', { params }),
}

// ---- Ecclesiastical Titles ----

export const EcclesiasticalTitlesAPI = {
  list: () => api.get('/ecclesiastical-titles'),
  create: (data) => api.post('/ecclesiastical-titles', data),
  update: (id, data) => api.put(`/ecclesiastical-titles/${id}`, data),
  remove: (id) => api.delete(`/ecclesiastical-titles/${id}`),
}

// ---- Titles (committee titles, for committee management) ----

export const TitlesAPI = {
  list: () => api.get('/titles'),
  availableFor: (committeeId) => api.get(`/committees/${committeeId}/available-titles`),
}

// ---- Permissions ----

export const PermissionsAPI = {
  list: () => api.get('/permissions'),
}

// ---- Committees ----

export const CommitteesAPI = {
  list: (params) => api.get('/committees', { params }),
  get: (id) => api.get(`/committees/${id}`),
  showByStructure: (structureId) => api.get(`/structures/${structureId}/committee`),
  update: (id, data) => api.put(`/committees/${id}`, data),
  addMember: (id, data) => api.post(`/committees/${id}/members`, data),
  // Backend requires BOTH member_id AND title_id for removal
  removeMember: (id, data) => api.delete(`/committees/${id}/members`, { data }),
  availableTitles: (committeeId) => api.get(`/committees/${committeeId}/available-titles`),
}

// ---- Daily Verse ----
// Public endpoint — no auth required

export const DailyVerseAPI = {
  getVerse: (data) => api.post('/daily-verse', data),
}

// ---- AI Chatbot ----
// Public endpoint — no auth required, rate-limited server-side
// Backend expects: { message: string, history: [{role, content}] }

export const AiAssistantAPI = {
  chat: (message, history = []) => api.post('/chat', { message, history }),
}

// ---- Portal (public, no auth) ----

export const PortalAPI = {
  getMission: () => api.get("/public/mission"),
  getChurches: (params) => api.get('/public/churches', { params }),
  sendContact: (data) => api.post('/public/contact', data),
}
