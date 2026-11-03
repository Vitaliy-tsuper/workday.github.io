import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const cleanVal = (val?: string): string | undefined => {
  if (!val) return undefined;
  return val.trim().replace(/^["']|["',]$/g, '').trim();
};

const firebaseConfig = {
  apiKey: cleanVal(process.env.NEXT_PUBLIC_FIREBASE_API_KEY) || "AIzaSyBXooUHF50jYLOSkZa7oHT64DnwRfiI6h0",
  authDomain: cleanVal(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) || "workday-compass-e6086.firebaseapp.com",
  projectId: cleanVal(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) || "workday-compass-e6086",
  storageBucket: cleanVal(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) || "workday-compass-e6086.firebasestorage.app",
  messagingSenderId: cleanVal(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) || "817100008266",
  appId: cleanVal(process.env.NEXT_PUBLIC_FIREBASE_APP_ID) || "1:817100008266:web:f42185d2e9088d8f46afb3",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
} else {
  console.warn("Firebase configuration is missing.");
}

export { app, auth, db, firebaseConfig };
