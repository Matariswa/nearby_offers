import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  enableNetwork,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/firebase/firebase";
import {
  getFirebaseConfig,
  isFirebaseConfigured,
} from "@/firebase/config";
import { COLLECTIONS } from "@/constants/collections";
import { FirebaseNotConfiguredError } from "@/lib/auth/errors";
import type { RegisterableRole, User } from "@/types/user";

export interface SignUpParams {
  name: string;
  email: string;
  password: string;
  role: RegisterableRole;
  phone?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface GoogleSignInParams {
  role?: RegisterableRole;
}

function ensureFirebaseConfigured(): void {
  if (!isFirebaseConfigured(getFirebaseConfig())) {
    throw new FirebaseNotConfiguredError();
  }
}

async function ensureAuthPersistence(): Promise<void> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
}

/**
 * Retries a Firestore operation when the client reports it is offline.
 * Google's signInWithPopup briefly drops the WebSocket, so the first
 * attempt can fail with "client is offline". We retry up to 3 times.
 */
async function withFirestoreRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 500,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      const isOffline =
        msg.includes("offline") ||
        msg.includes("client is offline") ||
        err?.code === "unavailable";
      if (!isOffline || i === retries - 1) throw err;
      lastErr = err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

function mapFirebaseUserToProfile(
  firebaseUser: FirebaseUser,
  role: RegisterableRole,
  phone: string | null,
): Omit<User, "createdAt" | "lastLogin"> & {
  createdAt: ReturnType<typeof serverTimestamp>;
  lastLogin: ReturnType<typeof serverTimestamp>;
} {
  return {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName ?? "User",
    email: firebaseUser.email ?? "",
    role,
    photoURL: firebaseUser.photoURL,
    phone,
    isVerified: firebaseUser.emailVerified,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  };
}

export async function createUserProfile(
  firebaseUser: FirebaseUser,
  role: RegisterableRole,
  phone: string | null = null,
): Promise<User> {
  const userRef = doc(getFirebaseDb(), COLLECTIONS.USERS, firebaseUser.uid);
  const profile = mapFirebaseUserToProfile(firebaseUser, role, phone);

  await setDoc(userRef, profile);

  return {
    ...profile,
    createdAt: Timestamp.now(),
    lastLogin: Timestamp.now(),
  };
}

export async function getUserProfile(uid: string): Promise<User | null> {
  ensureFirebaseConfigured();

  const userRef = doc(getFirebaseDb(), COLLECTIONS.USERS, uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as User;
}

export async function updateUserLastLogin(uid: string): Promise<void> {
  const userRef = doc(getFirebaseDb(), COLLECTIONS.USERS, uid);

  await updateDoc(userRef, {
    lastLogin: serverTimestamp(),
    isVerified: getFirebaseAuth().currentUser?.emailVerified ?? false,
  });
}

export async function signUpWithEmail({
  name,
  email,
  password,
  role,
  phone,
}: SignUpParams): Promise<{ firebaseUser: FirebaseUser; profile: User }> {
  ensureFirebaseConfigured();
  await ensureAuthPersistence();

  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );

  await updateProfile(credential.user, { displayName: name.trim() });

  const profile = await createUserProfile(
    credential.user,
    role,
    phone?.trim() || null,
  );

  return { firebaseUser: credential.user, profile };
}

export async function signInWithEmail({
  email,
  password,
}: SignInParams): Promise<{ firebaseUser: FirebaseUser; profile: User }> {
  ensureFirebaseConfigured();
  await ensureAuthPersistence();

  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );

  let profile = await getUserProfile(credential.user.uid);

  if (!profile) {
    profile = await createUserProfile(
      credential.user,
      "customer",
      null,
    );
  } else {
    await updateUserLastLogin(credential.user.uid);
    profile = (await getUserProfile(credential.user.uid)) ?? profile;
  }

  return { firebaseUser: credential.user, profile };
}

/**
 * Builds an in-memory User profile from Firebase Auth data.
 * Used as an immediate fallback when Firestore is temporarily offline.
 */
function buildProfileFromAuthUser(
  firebaseUser: FirebaseUser,
  role: RegisterableRole,
): User {
  return {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName ?? "User",
    email: firebaseUser.email ?? "",
    role,
    photoURL: firebaseUser.photoURL,
    phone: firebaseUser.phoneNumber,
    isVerified: firebaseUser.emailVerified,
    createdAt: Timestamp.now() as any,
    lastLogin: Timestamp.now() as any,
  };
}

/**
 * Runs Firestore profile create/update in the background with very generous
 * retries (up to 15 attempts, 2 s apart = ~30 s window).
 * Called after Google sign-in when Firestore may still be reconnecting.
 */
function syncGoogleProfileInBackground(
  firebaseUser: FirebaseUser,
  role: RegisterableRole,
): void {
  (async () => {
    const db = getFirebaseDb();
    for (let attempt = 0; attempt < 15; attempt++) {
      try {
        await enableNetwork(db);
        const existing = await getUserProfile(firebaseUser.uid);
        if (!existing) {
          await createUserProfile(firebaseUser, role, firebaseUser.phoneNumber);
        } else {
          await updateUserLastLogin(firebaseUser.uid);
        }
        return; // success
      } catch {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    console.warn("[Auth] Background Firestore profile sync failed after 15 attempts.");
  })();
}

export async function signInWithGoogle({
  role = "customer",
}: GoogleSignInParams = {}): Promise<{
  firebaseUser: FirebaseUser;
  profile: User;
}> {
  ensureFirebaseConfigured();
  await ensureAuthPersistence();

  // Pre-warm Firestore before opening the popup.
  const db = getFirebaseDb();

  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const credential = await signInWithPopup(auth, provider);

  // Re-enable Firestore network (popup can drop the WebSocket).
  try {
    await enableNetwork(db);
  } catch { /* already online */ }

  // Try Firestore quickly (one attempt, short window).
  try {
    await new Promise((r) => setTimeout(r, 500));
    const existing = await getUserProfile(credential.user.uid);

    if (!existing) {
      const created = await createUserProfile(
        credential.user,
        role,
        credential.user.phoneNumber,
      );
      return { firebaseUser: credential.user, profile: created };
    } else {
      // Returning user — update lastLogin in background, don't block.
      updateUserLastLogin(credential.user.uid).catch(() => {});
      return { firebaseUser: credential.user, profile: existing };
    }
  } catch {
    // Firestore still offline — build a local profile from Auth data
    // and sync the real Firestore document in the background.
    syncGoogleProfileInBackground(credential.user, role as RegisterableRole);
    return {
      firebaseUser: credential.user,
      profile: buildProfileFromAuthUser(credential.user, role as RegisterableRole),
    };
  }
}


export async function sendPasswordReset(email: string): Promise<void> {
  ensureFirebaseConfigured();

  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser(): Promise<void> {
  ensureFirebaseConfigured();

  const auth = getFirebaseAuth();
  await signOut(auth);
}

export async function initializeAuthPersistence(): Promise<void> {
  ensureFirebaseConfigured();
  await ensureAuthPersistence();
}
