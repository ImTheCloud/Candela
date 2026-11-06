import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'candela-64d25';

function parseServiceAccount(val: string): any {
  let str = val.trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    try {
      const unq = JSON.parse(str);
      if (typeof unq === 'string') str = unq;
      else if (typeof unq === 'object') return unq;
    } catch {
      str = str.slice(1, -1);
    }
  }
  if (str.startsWith('{')) {
    try {
      return JSON.parse(str);
    } catch {
      try {
        return JSON.parse(str.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
      } catch {}
    }
  }
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf8');
    if (decoded.startsWith('{')) return JSON.parse(decoded);
  } catch {}
  return JSON.parse(str);
}

export function getAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) return apps[0]!;

  if (process.env.PUBLIC_EMULATORS === '1') {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  }

  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saEnv) {
    try {
      const sa = parseServiceAccount(saEnv);
      return initializeApp({
        credential: cert(sa),
        projectId: sa.project_id || PROJECT_ID,
      });
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', e);
    }
  }

  return initializeApp({ projectId: PROJECT_ID });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}
