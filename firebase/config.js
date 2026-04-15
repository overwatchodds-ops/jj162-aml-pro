// ─── SIMPLEAML PRO — FIREBASE CONFIG ─────────────────────────────────────────
// Replace the placeholder values below with your actual Firebase project config.
// Found in: Firebase Console → Project Settings → Your apps → Web app → Config
//
// DO NOT commit real API keys to a public repo.
// Use environment variables or a private repo.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';

const firebaseConfig = {
  apiKey:            "AIzaSyAL9a1pfulYwhnaTXE1IpkYRbbahQkIiJE",
  authDomain:        "simpleaml-pro.firebaseapp.com",
  projectId:         "simpleaml-pro",
  storageBucket:     "simpleaml-pro.firebasestorage.app",
  messagingSenderId: "924984790086",
  appId:             "1:924984790086:web:00e68ac756b620d4938e47"
};

export const app = initializeApp(firebaseConfig);
