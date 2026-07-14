import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
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

// Members, Committees, and Titles endpoints are commented out on the
// backend for this sprint — re-enable these helpers once those routes
// are back in routes/api.php.
//
// export const MembersAPI = { ... }
// export const CommitteesAPI = { ... }
// export const TitlesAPI = { ... }
