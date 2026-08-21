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
  create: (data) => api.post('/churches', data),
  update: (id, data) => api.put(`/churches/${id}`, data),
  remove: (id) => api.delete(`/churches/${id}`),
  // Not active on backend yet — uncomment when re-enabled:
  // changePastor: (id, data) => api.put(`/churches/${id}/change-pastor`, data),
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
