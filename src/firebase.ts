import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut as firebaseSignOut, onAuthStateChanged, User, type UserCredential } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../firebase-applet-config.json';

// Serve the Firebase auth handler from our public host only where Vercel
// proxies /__/auth/* and /__/firebase/*. Previews and localhost keep the
// Firebase project auth domain so sign-in never points to an unproxied host.
const PROXIED_AUTH_HOSTS = ['costaricatours2026.vercel.app'];

export function resolveAuthDomain(fallback: string, host?: string | null): string {
  const override = (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  if (override) return override;
  const currentHost = host ?? (typeof window !== 'undefined' ? window.location.host : '');
  return currentHost && PROXIED_AUTH_HOSTS.includes(currentHost) ? currentHost : fallback;
}

export const app = initializeApp({
  ...firebaseConfig,
  authDomain: resolveAuthDomain(firebaseConfig.authDomain),
});
export const analytics = typeof window !== 'undefined' ? isSupported().then(yes => yes ? getAnalytics(app) : null) : null;

export const db = (firebaseConfig as any).firestoreDatabaseId
  ? initializeFirestore(app, { experimentalForceLongPolling: true }, (firebaseConfig as any).firestoreDatabaseId)
  : initializeFirestore(app, { experimentalForceLongPolling: true });

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  console.log("Firestore initialized successfully with database ID:", (firebaseConfig as any).firestoreDatabaseId || "(default)");
}
testConnection();

// Minimal scopes for authentication only - openid, email, profile
googleProvider.addScope('openid');
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.addScope('https://www.googleapis.com/auth/calendar');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.addScope('https://mail.google.com/');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');

// Cache the access token in memory
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Completes a redirect fallback after browsers block the popup/COOP flow.
let redirectResultPromise: Promise<UserCredential | null> | null = null;
const consumeRedirectResult = () => {
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth)
      .then(result => {
        const token = result ? GoogleAuthProvider.credentialFromResult(result)?.accessToken : null;
        if (token) cachedAccessToken = token;
        return result;
      })
      .catch(error => {
        console.error('Google redirect sign-in error', error);
        return null;
      });
  }
  return redirectResultPromise;
};

const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  consumeRedirectResult();
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (redirectResultPromise) await redirectResultPromise;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (POPUP_FALLBACK_CODES.has(error?.code)) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    if (error?.code === 'auth/cancelled-popup-request' || error?.code === 'auth/popup-closed-by-user') {
      console.log('User cancelled sign-in popup.');
      return null;
    }
    console.error("Google Sign-In Error", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    cachedAccessToken = null;
  } catch (error) {
    console.error("Sign Out Error", error);
  }
};
