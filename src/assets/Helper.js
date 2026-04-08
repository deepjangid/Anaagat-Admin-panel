// Fallback base URL for the backend (used when Vite env var `VITE_APP_URL` is not set).
// In production you can set `VITE_APP_URL` in your deployment environment, or use a same-origin `/api/*`
// proxy (e.g. Vercel rewrites) to avoid CORS.
// When left empty, the frontend will call relative `/api/*` on the same origin.
export const DEFAULT_API_BASE_URL = '';
