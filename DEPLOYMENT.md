# Deployment (GitHub + Vercel + Railway)

This repo is a monorepo:
- Frontend (Vite/React): repo root
- Backend (Express/Mongo): `admin-backend/`

## 1) Push to GitHub

From repo root:
1. Ensure no secrets are committed (`.env` files should be ignored).
2. Commit & push:
   - `git add .`
   - `git commit -m "Deploy setup"`
   - `git push origin main`

## 2) Deploy backend to Railway

1. Create a new Railway project.
2. Add a service from this GitHub repo.
3. Set the service **Root Directory** to `admin-backend`.
4. Set environment variables (Railway → Variables):
   - `PORT` = `5000` (Railway may override; keep if needed)
   - `MONGODB_URI` = your MongoDB Atlas / cloud URI (or Railway Mongo plugin URI)
   - `JWT_ACCESS_SECRET` = long random secret
   - `CORS_ORIGIN` = your frontend URL(s), comma-separated (Vercel and/or Railway)
     - Example: `https://your-frontend.vercel.app,https://your-frontend.up.railway.app`
     - For debugging only: `CORS_ORIGIN=*` (allow all origins)
5. Deploy. Copy the Railway public URL, e.g. `https://your-backend.up.railway.app`

## 3) Deploy frontend to Vercel

1. Import this GitHub repo in Vercel.
2. Framework preset: Vite.
3. Environment variables (Vercel → Settings → Environment Variables):
   - `VITE_APP_URL` = your Railway backend URL (no trailing `/api`)
     - Example: `https://your-backend.up.railway.app`
4. Deploy.

## 4) Connect both (CORS + API base URL)

After both are deployed:
- Railway: set `CORS_ORIGIN` to your frontend domain(s)
- Vercel: set `VITE_APP_URL` to your Railway domain

Re-deploy/restart both after changing env vars.
