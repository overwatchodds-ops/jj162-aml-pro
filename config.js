// ─── SIMPLEAML PRO — FIREBASE CONFIG ─────────────────────────────────────────
// Replace the placeholder values below with your actual Firebase project config.
// Found in: Firebase Console → Project Settings → Your apps → Web app → Config
//
// DO NOT commit real API keys to a public repo.
// Use environment variables or a private repo.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';

const firebaseConfig = {
  apiKey:            "REPLACE_WITH_YOUR_API_KEY",
  authDomain:        "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId:         "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket:     "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId:             "REPLACE_WITH_YOUR_APP_ID",
};

export const app = initializeApp(firebaseConfig);
