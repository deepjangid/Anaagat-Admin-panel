import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_APP_URL;

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
export const jobsAPI = {
  getAll: (params) => api.get('/jobs', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  create: (jobData) => api.post('/jobs', jobData),
  update: (id, jobData) => api.put(`/jobs/${id}`, jobData),
  delete: (id) => api.delete(`/jobs/${id}`),
  getStats: () => api.get('/jobs/stats/overview'),
};

// ─── APPLICATIONS ────────────────────────────────────────────────────────────
export const applicationsAPI = {
  // List with optional ?page=&limit=&status=&search=
  getAll: (params) => api.get('/applications', { params }),

  // Single application detail
  getById: (id) => api.get(`/applications/${id}`),

  // Download resume — returns a blob, so we configure responseType here
  downloadResume: (id, applicantName) =>
    api.get(`/applications/${id}/resume`, { responseType: 'blob' }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${applicantName.replace(/\s+/g, '_')}_Resume.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }),

  // Update status: pending | reviewing | shortlisted | rejected | hired
  updateStatus: (id, status) => api.patch(`/applications/${id}/status`, { status }),

  // Save admin notes
  updateNotes: (id, notes) => api.patch(`/applications/${id}/notes`, { notes }),

  // Delete application
  delete: (id) => api.delete(`/applications/${id}`),

  // Dashboard stats
  getStats: () => api.get('/applications/stats'),
};

export default api;