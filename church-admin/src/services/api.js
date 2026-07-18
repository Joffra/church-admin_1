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
  // backend expects { member_code, password }
  // returns { access_token, token_type, user }
  login: (member_code, password) => api.post('/login', { member_code, password }),
  logout: () => api.post('/logout'),
  me: () => api.get('/user'),

  // User Story 3 — Modifier son mot de passe
  // POST /password/update with { current_password, new_password, new_password_confirmation }
  changePassword: (current_password, new_password, new_password_confirmation) =>
    api.post('/password/update', { current_password, new_password, new_password_confirmation }),

  // User Story 4 — Réinitialiser son mot de passe (multi-step flow)
  // Step 1: send verification code to the user's email
  // POST /password/reset/code with { email }
  sendResetCode: (email) => api.post('/password/reset/code', { email }),

  // Step 2: verify the code, generate a temp password, email it
  // POST /password/reset/code/verify with { email, code }
  verifyResetCode: (email, code) => api.post('/password/reset/code/verify', { email, code }),
}

// ---- Resource helpers ----

export const ChurchesAPI = {
  list: (params) => api.get('/churches', { params }),
  get: (id) => api.get(`/churches/${id}`),
  // JSON-only update (basic fields)
  update: (id, data) => api.put(`/churches/${id}`, data),
  // Binary status toggle — dedicated endpoint, sends new status in body
  changeStatus: (id, newStatus) => api.patch(`/churches/${id}/change-status`, { status: newStatus }),
  // FormData create (supports church_image file upload)
  createForm: (formData) => api.post('/churches', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  // FormData update with method spoofing (PUT via POST + _method=PUT)
  updateForm: (id, formData) => api.post(`/churches/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  remove: (id) => api.delete(`/churches/${id}`),
}

export const EcclesiasticalTitlesAPI = {
  list: (params) => api.get('/ecclesiastical-titles', { params }),
}
