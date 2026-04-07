import axios from 'axios';

import { DEFAULT_API_BASE_URL } from '../assets/Helper';

const API_BASE_URL =
  import.meta.env.VITE_APP_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : DEFAULT_API_BASE_URL) ||
  'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    let token;
    try {
      token = localStorage.getItem('token');
    } catch {
      token = null;
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch {
        // ignore storage failures
      }
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ─── JOBS ────────────────────────────────────────────────────────────────────
// GET ALL JOBS
export const jobsAPI = {
  getAll: (params) => api.get("/jobs", { params }),
  create: (data) => api.post("/jobs", data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
};

// ─── APPLICATIONS ────────────────────────────────────────────────────────────
export const applicationsAPI = {
  // List with optional ?page=&limit=&status=&search=
  getAll: (params, config = {}) => api.get('/applications', { params, ...config }),

  // Single application detail
  getById: (id, config = {}) => api.get(`/applications/${id}`, config),

  // Download resume — returns a blob, so we configure responseType here
  downloadResume: (id, applicantName) =>
    api.get(`/applications/${id}/resume`, { responseType: 'blob' }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeName = String(applicantName || 'Applicant')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '');
      link.setAttribute('download', `${safeName || 'Applicant'}_Resume.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }),

  // Update status: pending | reviewing | shortlisted | rejected | hired
  updateStatus: (id, status, config = {}) => api.patch(`/applications/${id}/status`, { status }, config),

  // Save admin notes
  updateNotes: (id, notes, config = {}) => api.patch(`/applications/${id}/notes`, { notes }, config),

  // Delete application
  delete: (id, config = {}) => api.delete(`/applications/${id}`, config),

  // Dashboard stats
  getStats: (config = {}) => api.get('/applications/stats', config),
};

// --- ADMIN ---
export const adminAPI = {
  getDashboard: (params, config = {}) => api.get('/admin/dashboard', { params, ...config }),
  getUsers: (params, config = {}) => api.get('/admin/users', { params, ...config }),
  deleteUser: (id, config = {}) => api.delete(`/admin/user/${id}`, config),
};

export default api;
