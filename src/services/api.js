import axios from 'axios';

// ✅ Use Vite env variable
const API_BASE_URL = import.meta.env.VITE_APP_URL;

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true, // important for cookies (if used)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token to headers
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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // prevent infinite reload loop
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ------------------- AUTH APIs -------------------
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ------------------- JOB APIs -------------------
export const jobsAPI = {
  getAll: (params) => api.get('/jobs', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  create: (jobData) => api.post('/jobs', jobData),
  update: (id, jobData) => api.put(`/jobs/${id}`, jobData),
  delete: (id) => api.delete(`/jobs/${id}`),
  getStats: () => api.get('/jobs/stats/overview'),
};

export default api;
