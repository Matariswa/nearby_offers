"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { getFirebaseAuth } from "@/firebase/firebase";
import {
  getFirebaseConfig,
  isFirebaseConfigured,
} from "@/firebase/config";
import {
  getUserProfile,
  initializeAuthPersistence,
  logoutUser,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  updateUserLastLogin,
  type GoogleSignInParams,
  type SignInParams,
  type SignUpParams,
} from "@/services/auth.service";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { Timestamp } from "firebase/firestore";
import type { User } from "@/types/user";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  isConfigured: boolean;
  signUp: (params: SignUpParams) => Promise<User>;
  signIn: (params: SignInParams) => Promise<User>;
  signInGoogle: (params?: GoogleSignInParams) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Wraps a promise with a timeout so Firestore fetches never hang indefinitely.
 * With experimentalForceLongPolling, offline getDoc calls are queued forever
 * instead of rejecting — this forces them to fail fast.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Firestore fetch timed out")),
      ms,
    );
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

/**
 * Builds a minimal in-memory profile from Firebase Auth data.
 * Used when Firestore is offline so ProtectedRoute can still render.
 * The real profile will overwrite this once Firestore reconnects.
 */
function buildSyntheticProfile(user: FirebaseUser): User {
  return {
    uid: user.uid,
    name: user.displayName ?? "User",
    email: user.email ?? "",
    role: "customer",
    photoURL: user.photoURL,
    phone: user.phoneNumber,
    isVerified: user.emailVerified,
    createdAt: Timestamp.now() as any,
    lastLogin: Timestamp.now() as any,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isFirebaseConfigured(getFirebaseConfig());

  /**
   * When signIn/signUp/signInGoogle resolves the profile themselves they set
   * this ref to `true`. The onAuthStateChanged listener checks it and skips
   * the redundant Firestore fetch, immediately marking loading=false instead.
   */
  const profileAlreadyResolvedRef = useRef(false);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function subscribeToAuth() {
      try {
        await initializeAuthPersistence();
        const auth = getFirebaseAuth();

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!isMounted) return;

          setFirebaseUser(user);

          if (!user) {
            setUserProfile(null);
            setLoading(false);
            profileAlreadyResolvedRef.current = false;
            return;
          }

          // signIn / signUp / signInGoogle already fetched the profile and
          // set it in state — skip the extra Firestore round-trip.
          if (profileAlreadyResolvedRef.current) {
            profileAlreadyResolvedRef.current = false;
            setLoading(false);
            return;
          }

          // Cold start (page refresh / returning user): fetch from Firestore.
          // Wrap with a 5 s timeout — long polling queues requests indefinitely
          // when offline, which would keep loading=true forever.
          try {
            const profile = await withTimeout(getUserProfile(user.uid), 5000);
            if (profile && profile.disabled) {
              await logoutUser();
              setFirebaseUser(null);
              setUserProfile(null);
            } else {
              // If profile is null (e.g. Google user whose Firestore doc hasn't
              // synced yet), preserve the existing in-memory profile.
              setUserProfile((existing) => profile ?? existing);
            }
          } catch (err) {
            console.warn("Auth profile fetch failed:", err);
            // Firestore is temporarily offline — preserve existing profile, or
            // build a synthetic one from Auth data so ProtectedRoute can render.
            setUserProfile((existing) => existing ?? buildSyntheticProfile(user));
            // Retry once after 6 s in case Firestore comes back quickly.
            setTimeout(async () => {
              try {
                const retried = await withTimeout(getUserProfile(user.uid), 5000);
                if (retried) setUserProfile(retried);
              } catch { /* still offline, ignore */ }
            }, 6000);
          } finally {
            if (isMounted) setLoading(false);
          }
        });

        return unsubscribe;
      } catch {
        if (isMounted) setLoading(false);
        return undefined;
      }
    }

    let unsubscribe: (() => void) | undefined;
    subscribeToAuth().then((unsub) => { unsubscribe = unsub; });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [isConfigured]);

  const signUp = useCallback(async (params: SignUpParams) => {
    try {
      const { firebaseUser: user, profile } = await signUpWithEmail(params);
      profileAlreadyResolvedRef.current = true;
      setFirebaseUser(user);
      setUserProfile(profile);
      setLoading(false);
      return profile;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const signIn = useCallback(async (params: SignInParams) => {
    try {
      const { firebaseUser: user, profile } = await signInWithEmail(params);
      if (profile && profile.disabled) {
        await logoutUser();
        throw new Error("Your account has been disabled. Please contact support.");
      }
      profileAlreadyResolvedRef.current = true;
      setFirebaseUser(user);
      setUserProfile(profile);
      setLoading(false);
      return profile;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const signInGoogle = useCallback(async (params?: GoogleSignInParams) => {
    try {
      const { firebaseUser: user, profile } = await signInWithGoogle(params);
      if (profile && profile.disabled) {
        await logoutUser();
        throw new Error("Your account has been disabled. Please contact support.");
      }
      profileAlreadyResolvedRef.current = true;
      setFirebaseUser(user);
      setUserProfile(profile);
      setLoading(false);

      // If Firestore was offline during sign-in we received a synthetic profile
      // (role defaults to "customer"). Fetch the real profile from Firestore
      // after a short delay so the correct role is applied without requiring
      // the user to sign out and back in.
      setTimeout(async () => {
        try {
          const real = await withTimeout(getUserProfile(user.uid), 8000);
          if (real) setUserProfile(real);
        } catch { /* Firestore still recovering — background sync will handle it */ }
      }, 3000);

      return profile;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordReset(email);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
      setFirebaseUser(null);
      setUserProfile(null);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      userProfile,
      loading,
      isConfigured,
      signUp,
      signIn,
      signInGoogle,
      resetPassword,
      logout,
    }),
    [
      firebaseUser,
      userProfile,
      loading,
      isConfigured,
      signUp,
      signIn,
      signInGoogle,
      resetPassword,
      logout,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
