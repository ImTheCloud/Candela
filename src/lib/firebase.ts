import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, memoryLocalCache, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// Public web config of the Firebase project "Candela" (safe to ship: access is enforced by firestore.rules).
const app = initializeApp({
  apiKey: 'AIzaSyDnHNKulcQKMNlWV-My68S_DdK0jfEzSVI',
  authDomain: 'candela-64d25.firebaseapp.com',
  projectId: 'candela-64d25',
  storageBucket: 'candela-64d25.firebasestorage.app',
  messagingSenderId: '663771331445',
  appId: '1:663771331445:web:ddb313b50263062c8a713c',
});

// `npm run dev` runs against local emulators, so testing never touches real accounts.
const emulators = import.meta.env.PUBLIC_EMULATORS === '1';

export const auth = getAuth(app);
auth.languageCode = 'ro';

// Progress keeps working offline and syncs when the phone is back online.
export const db = initializeFirestore(app, {
  localCache: emulators ? memoryLocalCache() : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (emulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
