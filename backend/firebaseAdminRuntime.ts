import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let cachedApp: App | null = null;
let cachedAuth: Auth | null = null;

function projectId(): string | undefined {
  return String(process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || '').trim() || undefined;
}

/**
 * Single Firebase Admin app for server-side services.
 * Google-hosted production uses Application Default Credentials from the
 * Cloud Run service identity; no deployment credential is copied into the
 * running container. A JSON credential remains supported only for explicit
 * non-Google compatibility environments.
 */
export function getFirebaseAdminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length > 0) {
    cachedApp = getApp();
    return cachedApp;
  }

  const explicitProjectId = projectId();
  const rawServiceAccount = String(process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (rawServiceAccount) {
    const serviceAccount = JSON.parse(rawServiceAccount);
    cachedApp = initializeApp({
      credential: cert(serviceAccount),
      ...(explicitProjectId ? { projectId: explicitProjectId } : {}),
    });
    return cachedApp;
  }

  cachedApp = initializeApp({
    credential: applicationDefault(),
    ...(explicitProjectId ? { projectId: explicitProjectId } : {}),
  });
  return cachedApp;
}

export function getFirebaseAdminAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(getFirebaseAdminApp());
  return cachedAuth;
}
