
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if all required environment variables are present
const isFirebaseConfigured = 
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId;

// Initialize Firebase only if it's configured
const app = isFirebaseConfigured && !getApps().length ? initializeApp(firebaseConfig) : (getApps().length ? getApp() : null);

// IMPORTANT: To fix "Missing or insufficient permissions" errors, you must
// update your Firestore security rules in the Firebase Console. For development,
// you can allow all read/write access.
//
// Go to your Firebase project -> Firestore Database -> Rules and paste this:
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /{document=**} {
//       allow read, write: if true;
//     }
//   }
// }
const db = app ? getFirestore(app) : null;

if (db) {
  enableIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        // This can happen if you have multiple tabs open.
        // Persistence can only be enabled in one tab at a time.
        console.warn("Firestore persistence failed: can only be enabled in one tab at a time.");
      } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence
        console.warn("Firestore persistence is not supported in this browser.");
      }
    });
}

export { app, db, isFirebaseConfigured };
