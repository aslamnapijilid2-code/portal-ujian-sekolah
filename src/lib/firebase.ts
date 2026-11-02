import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';

/**
 * Konfigurasi Firebase Modular Web SDK (Client-Side)
 * Proyek: portal-ujian-sdn4-sojol-utara
 * Region Firestore: asia-southeast2 (Jakarta)
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyChyMOZEYPrwK-q15Gh6t8zPuSrH1dqIFo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'portal-ujian-sdn4-sojol-utara.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'portal-ujian-sdn4-sojol-utara',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'portal-ujian-sdn4-sojol-utara.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '248212674265',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:248212674265:web:2211124d0bd019253d90c8',
};

export const isFirebaseConfigured = true;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  try {
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
    });
  } catch {
    db = getFirestore(app);
  }
} catch (error) {
  console.error('Inisialisasi Firebase gagal:', error);
}

export { app, auth, db };
