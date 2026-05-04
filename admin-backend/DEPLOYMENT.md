# Backend Deployment

## Start Command

This backend entrypoint is `admin-backend/server.js`, so the production start command is:

```bash
npm install
npm run start
```

`package.json` already uses:

```json
"start": "node server.js"
```

## Required Environment Variables

```env
NODE_ENV=production
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_ACCESS_SECRET=replace_with_a_64_plus_character_secret
CORS_ORIGIN=https://your-frontend-domain.com
IMAGEKIT_PUBLIC_KEY=your_key
IMAGEKIT_PRIVATE_KEY=your_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

Notes:
- `MONGO_URI` is the preferred variable.
- `MONGODB_URI` is still accepted for backward compatibility.
- `CORS_ORIGIN` can be a comma-separated allowlist.

## Production Checklist

1. Push the repo to GitHub.
2. Deploy `admin-backend` to Railway, Render, a VPS, or another Node host.
3. Set the environment variables in the hosting dashboard.
4. Confirm `/api/health` returns `{ "ok": true }`.
5. Log into the admin panel and test `/api/uploads/file`.
6. Create or update:
   - a blog with cover + editor image
   - a candidate resume
   - a team member profile image
7. Confirm MongoDB stores only metadata objects and ImageKit URLs.

## Safe Cleanup Workflow

Run these only after deploy is healthy:

```bash
npm run cleanup:legacy-storage -- --validate-only
npm run cleanup:legacy-storage -- --execute --rename
```

Re-test the app, then do final removal:

```bash
npm run cleanup:legacy-storage -- --execute --drop
```

## Upload API

Universal upload endpoint:

```http
POST /api/uploads/file
```

Response shape:

```json
{
  "success": true,
  "url": "https://ik.imagekit.io/...",
  "fileId": "imagekit_file_id",
  "name": "original-file-name.png",
  "size": 12345,
  "type": "image/png"
}
```

## Notes

- Runtime local filesystem uploads are disabled.
- Legacy cleanup creates a backup before destructive changes.
- Production logging is reduced for noisy debug routes, while errors still log.
