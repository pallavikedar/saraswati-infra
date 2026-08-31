import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCbKYK2oK1rR0qISwCBIBfw5hIo1JoqjXo',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'abhi-9bd8f.firebaseapp.com',
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || 'https://abhi-9bd8f-default-rtdb.firebaseio.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'abhi-9bd8f',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'abhi-9bd8f.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '95918928552',
  appId: env.VITE_FIREBASE_APP_ID || '1:95918928552:web:0de697f49363a52653c89d',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-QY5C23TNNE',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/* Analytics needs a browser with cookies and a measurement id; it throws
   in SSR, in tests and behind some privacy settings. Never let it take
   the map down with it. */
export const analyticsReady = isSupported()
  .then((ok) => (ok ? getAnalytics(app) : null))
  .catch(() => null);
