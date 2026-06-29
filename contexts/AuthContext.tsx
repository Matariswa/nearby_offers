"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Database connection timed out"));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isFirebaseConfigured(getFirebaseConfig());

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
          if (!isMounted) {
            return;
          }

          setFirebaseUser(user);

          if (!user) {
            setUserProfile(null);
            setLoading(false);
            return;
          }

          try {
            const profile = await promiseWithTimeout(getUserProfile(user.uid), 4000);
            if (profile && profile.disabled) {
              await logoutUser();
              setFirebaseUser(null);
              setUserProfile(null);
            } else {
              setUserProfile(profile);
            }
          } catch (err) {
            console.warn("Auth initialization profile fetch timed out or failed:", err);
            setUserProfile(null);
          } finally {
            if (isMounted) {
              setLoading(false);
            }
          }
        });

        return unsubscribe;
      } catch {
        if (isMounted) {
          setLoading(false);
        }

        return undefined;
      }
    }

    let unsubscribe: (() => void) | undefined;

    subscribeToAuth().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [isConfigured]);

  const signUp = useCallback(async (params: SignUpParams) => {
    try {
      const { profile } = await signUpWithEmail(params);
      setUserProfile(profile);
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
      setFirebaseUser(user);
      setUserProfile(profile);
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
      setFirebaseUser(user);
      setUserProfile(profile);
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
