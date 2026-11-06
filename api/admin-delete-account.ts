import { getAdminAuth, getAdminFirestore } from './_firebase-admin';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing Bearer token' });
  }
  const token = authHeader.slice(7).trim();

  let adminAuth;
  let adminDb;
  try {
    adminAuth = getAdminAuth();
    adminDb = getAdminFirestore();
  } catch (err: any) {
    console.error('Failed to init Firebase Admin:', err);
    return res.status(500).json({ error: 'admin_init_failed', message: err?.message });
  }

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (err: any) {
    return res.status(401).json({ error: 'invalid_token', message: err?.message });
  }

  // Verify caller has admin rights in Firestore or token claims
  const isClaimAdmin = decodedToken.admin === true;
  let isDbAdmin = false;
  if (!isClaimAdmin) {
    try {
      const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();
      isDbAdmin = userSnap.data()?.admin === true;
    } catch (err) {
      console.warn('Could not read user admin flag from Firestore:', err);
    }
  }

  if (!isClaimAdmin && !isDbAdmin) {
    return res.status(403).json({ error: 'forbidden', message: 'Admin privileges required' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const targetUid = String(body.uid || '').trim();
  if (!targetUid) {
    return res.status(400).json({ error: 'missing_uid' });
  }
  if (targetUid === decodedToken.uid) {
    return res.status(400).json({ error: 'cannot_delete_self' });
  }

  // Delete user from Firebase Authentication
  try {
    await adminAuth.deleteUser(targetUid);
  } catch (err: any) {
    // If user is already removed from Auth, don't fail
    if (err?.code !== 'auth/user-not-found') {
      console.error('Failed to delete user from Firebase Auth:', err);
      return res.status(500).json({ error: 'auth_delete_failed', message: err?.message });
    }
  }

  return res.status(200).json({ ok: true });
}

