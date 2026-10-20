import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Public web config of the Firebase project "Candela" (safe to ship: access is enforced by firestore.rules).
const app = initializeApp({
  apiKey: 'AIzaSyDnHNKulcQKMNlWV-My68S_DdK0jfEzSVI',
  authDomain: 'candela-64d25.firebaseapp.com',
  projectId: 'candela-64d25',
  storageBucket: 'candela-64d25.firebasestorage.app',
  messagingSenderId: '663771331445',
  appId: '1:663771331445:web:ddb313b50263062c8a713c',
});

export const auth = getAuth(app);
auth.languageCode = 'ro';
export const db = getFirestore(app);
