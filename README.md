# A TO Z Properties

A TO Z Properties is a React + Vite real estate listing application built with Tailwind CSS, shadcn/ui, Firebase, and Supabase.

## Project overview

This repository includes:

- Frontend app built with React, TypeScript, Vite, and Tailwind CSS
- Firebase integration for authentication, Firestore, storage, and messaging
- Supabase client for additional backend data access
- A Firebase Cloud Functions folder for function-based server logic
- A service worker for Firebase Messaging in `public/firebase-messaging-sw.js`

## Getting started

### 1. Install dependencies

```sh
npm install
```

### 2. Create local environment variables

Copy or create a `.env.local` file at the project root with the following values:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

### 3. Run the development server

```sh
npm run dev
```

Open the local URL printed by Vite to view the app.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — produce a production build
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint across the project
- `npm run test` — run unit tests with Vitest

## Firebase and Supabase

The app loads Firebase config from `import.meta.env` variables in `src/integrations/firebase/client.ts`.

The Supabase client is configured in `src/integrations/supabase/client.ts` using:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Firebase Cloud Functions

The `functions/` folder contains a separate Firebase Functions project. If you need to work with cloud functions:

```sh
cd functions
npm install
```

Then follow the Firebase Functions deployment workflow for your project.

## Recommended environment

- Node.js 18 or newer
- npm 9 or newer
- A modern browser for local development

## Notes

- Keep `serviceAccountKey.json` and any secret credentials out of public repositories.
- Make sure Firebase and Supabase environment values are set correctly before starting the app.
- The project uses `tailwindcss-animate`, `@radix-ui` components, and `react-hook-form` for UI and form handling.
