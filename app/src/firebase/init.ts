import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { firebaseConfig, isFirebaseConfigured } from './config';

// Guarded: if .env.local isn't filled in yet, `db` is null and callers should treat the app
// as "backend not connected yet" instead of crashing at startup.
export const app = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const db = app ? getDatabase(app) : null;
