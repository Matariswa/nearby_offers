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

export async function signInWithGoogle({
  role = "customer",
}: GoogleSignInParams = {}): Promise<{
  firebaseUser: FirebaseUser;
  profile: User;
}> {
  ensureFirebaseConfigured();
  await ensureAuthPersistence();

  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const credential = await signInWithPopup(auth, provider);
  let profile = await getUserProfile(credential.user.uid);

  if (!profile) {
    profile = await createUserProfile(
      credential.user,
      role,
      credential.user.phoneNumber,
    );
  } else {
    await updateUserLastLogin(credential.user.uid);
    profile = (await getUserProfile(credential.user.uid)) ?? profile;
  }

  return { firebaseUser: credential.user, profile };
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
