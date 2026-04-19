# Admin Response System

This project now includes a complete admin-to-candidate application response flow for a shared MongoDB job portal setup.

## Included Feature Set

- Admin can update application status from the admin panel
- Admin can save an `adminMessage` for the candidate
- Candidate can load `GET /api/my-applications`
- Candidate can receive live updates from `GET /api/my-applications/stream`
- Admin panel includes a card-based `Candidate Response` page
- Candidate UI includes a `My Applications` page component

## Status Values

- `pending`
- `shortlisted`
- `rejected`
- `accepted`

## API Examples

### `PUT /api/applications/:id`

```json
{
  "status": "shortlisted",
  "adminMessage": "You are shortlisted for the interview round on Monday at 11 AM."
}
```

```json
{
  "success": true,
  "message": "Application updated",
  "application": {
    "_id": "6800b3d0f1234567890abcde",
    "status": "shortlisted",
    "adminMessage": "You are shortlisted for the interview round on Monday at 11 AM."
  }
}
```

### `GET /api/my-applications`

```json
{
  "success": true,
  "applications": [
    {
      "_id": "6800b3d0f1234567890abcde",
      "jobTitle": "Frontend Developer",
      "status": "shortlisted",
      "adminMessage": "You are shortlisted for the interview round on Monday at 11 AM."
    }
  ],
  "total": 1,
  "currentPage": 1,
  "limit": 20,
  "totalPages": 1
}
```

## Run Locally

### Backend

```bash
cd admin-backend
npm install
npm run dev
```

Required `admin-backend/.env` values:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

### Frontend

```bash
npm install
npm run dev
```

Optional root env:

```env
VITE_APP_URL=http://localhost:5000
```

## Notes

- `updatedAt` already exists through Mongoose `timestamps: true`
- SSE uses the authenticated token passed to the stream endpoint
- Main implementation files are in `admin-backend/controllers/applicationsController.js`, `admin-backend/services/applicationService.js`, `src/pages/CandidateResponsePage.jsx`, and `src/pages/MyApplicationsPage.jsx`

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
