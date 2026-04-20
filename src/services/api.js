import axios from 'axios';

import { DEFAULT_API_BASE_URL } from '../assets/Helper';

const envBase = String(import.meta.env.VITE_APP_URL || '').trim().replace(/\/+$/, '');

const shouldUseSameOriginProxy = (() => {
  const forceProxy = String(import.meta.env.VITE_FORCE_SAME_ORIGIN_API || '')
    .trim()
    .toLowerCase();
  if (forceProxy === 'true' || forceProxy === '1' || forceProxy === 'yes') return true;

  // Auto-enable same-origin proxy on Vercel to avoid CORS when `vercel.json` rewrites `/api/*`.
  if (!import.meta.env.PROD) return false;
  if (typeof window === 'undefined') return false;
  const host = String(window.location.hostname || '').toLowerCase();
  return host === 'anaagat-admin-panel.vercel.app' || host.endsWith('.vercel.app');
})();

if (!import.meta.env.DEV && !envBase && !DEFAULT_API_BASE_URL && !shouldUseSameOriginProxy) {
  // If this happens in a deployed build, your host didn't rebuild with `VITE_APP_URL`.
  // API calls will go to same-origin `/api/*` which fails unless you have a proxy/rewrite configured.
  console.warn(
    '[api] `VITE_APP_URL` is not set. Set it to your backend public URL (no `/api`) or enable a same-origin `/api/*` proxy (e.g. Vercel rewrites).'
  );
}

const API_BASE_URL = (() => {
  if (shouldUseSameOriginProxy) return '';
  if (envBase) return envBase;
  if (import.meta.env.DEV) return 'http://localhost:5000';
  if (DEFAULT_API_BASE_URL) return DEFAULT_API_BASE_URL;
  // Production build with no backend URL configured: use same-origin `/api/*`.
  return '';
})();

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  // Default false (this app uses Authorization header tokens). Enable only if you use cookies/sessions.
  withCredentials: String(import.meta.env.VITE_WITH_CREDENTIALS || '').trim() === 'true',
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

// â”€â”€â”€ AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// â”€â”€â”€ JOBS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET ALL JOBS
export const jobsAPI = {
  getAll: (params) => api.get("/jobs", { params }),
  create: (data) => api.post("/jobs", data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  deleteAll: () => api.delete("/jobs"),
  delete: (id) => api.delete(`/jobs/${id}`),
};

export const openingsAPI = {
  getAll: (params) => api.get("/openings", { params }),
  create: (data) => api.post("/openings", data),
  update: (id, data) => api.put(`/openings/${id}`, data),
  deleteAll: () => api.delete("/openings"),
  delete: (id) => api.delete(`/openings/${id}`),
};

export const blogPostsAPI = {
  getAll: (params) => api.get("/blogposts", { params }),
  getPublished: (params) => api.get("/blogposts", { params: { published: true, ...params } }),
  create: (data) => api.post("/blogposts", data),
  update: (id, data) => api.put(`/blogposts/${id}`, data),
  delete: (id) => api.delete(`/blogposts/${id}`),
};

export const blogUploadsAPI = {
  uploadImage: (file) =>
    api.post("/uploads/blog-image", file, {
      headers: {
        "Content-Type": file?.type || "application/octet-stream",
      },
      transformRequest: [(data) => data],
    }),
};

// â”€â”€â”€ APPLICATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const applicationsAPI = {
  apply: (data, config = {}) => api.post('/applications/apply', data, config),

  // List with optional ?page=&limit=&status=&search=
  getAll: (params, config = {}) => api.get('/applications', { params, ...config }),

  // Single application detail
  getById: (id, config = {}) => api.get(`/applications/${id}`, config),

  // Candidate dashboard
  getMine: (params, config = {}) => api.get('/my-applications', { params, ...config }),
  streamMine: (token) => {
    const base = `${API_BASE_URL}/api/my-applications/stream`;
    const url = token ? `${base}?token=${encodeURIComponent(token)}` : base;
    return new EventSource(url);
  },

  // Full application update
  update: (id, data, config = {}) => api.put(`/applications/${id}`, data, config),

  // Download resume â€” returns a blob, so we configure responseType here
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

  // Update status: pending | shortlisted | rejected | accepted
  updateStatus: (id, status, config = {}) => api.patch(`/applications/${id}/status`, { status }, config),

  // Save admin notes
  updateNotes: (id, notes, config = {}) => api.patch(`/applications/${id}/notes`, { notes }, config),

  // Send candidate response
  updateResponse: (id, data, config = {}) =>
    api.patch(
      `/applications/${id}/response`,
      {
        status: data?.status || data?.responseStatus,
        adminMessage: data?.adminMessage || data?.responseMessage || '',
        nextStepInfo: data?.nextStepInfo || '',
        candidateResponseDetails: data?.candidateResponseDetails || {},
      },
      config
    ),

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

  getCandidateProfiles: (params, config = {}) => api.get('/admin/candidate-profiles', { params, ...config }),
  createCandidateProfile: (data, config = {}) => api.post('/admin/candidate-profiles', data, config),
  updateCandidateProfile: (id, data, config = {}) => api.put(`/admin/candidate-profiles/${id}`, data, config),
  deleteCandidateProfile: (id, config = {}) => api.delete(`/admin/candidate-profiles/${id}`, config),

  getClientProfiles: (params, config = {}) => api.get('/admin/client-profiles', { params, ...config }),
  createClientProfile: (data, config = {}) => api.post('/admin/client-profiles', data, config),
  updateClientProfile: (id, data, config = {}) => api.put(`/admin/client-profiles/${id}`, data, config),
  deleteClientProfile: (id, config = {}) => api.delete(`/admin/client-profiles/${id}`, config),

  getContactMessages: (params, config = {}) => api.get('/admin/contact-messages', { params, ...config }),
  createContactMessage: (data, config = {}) => api.post('/admin/contact-messages', data, config),
  updateContactMessage: (id, data, config = {}) => api.put(`/admin/contact-messages/${id}`, data, config),
  markContactMessageRead: (id, config = {}) => api.patch(`/admin/contact-messages/${id}/read`, {}, config),
  deleteContactMessage: (id, config = {}) => api.delete(`/admin/contact-messages/${id}`, config),
};

export default api;
