"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { FirebaseConfigAlert } from "@/components/auth/FirebaseConfigAlert";
import { getDashboardPathForRole } from "@/lib/auth/redirects";

interface GuestRouteProps {
  children: ReactNode;
}

/** Redirects authenticated users away from login/register pages. */
export function GuestRoute({ children }: GuestRouteProps) {
  const router = useRouter();
  const { firebaseUser, userProfile, loading, isConfigured } = useAuth();

  useEffect(() => {
    if (loading || !isConfigured || !firebaseUser || !userProfile) {
      return;
    }

    router.replace(getDashboardPathForRole(userProfile.role));
  }, [firebaseUser, isConfigured, loading, router, userProfile]);

  if (!isConfigured) {
    return <FirebaseConfigAlert />;
  }

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (firebaseUser && userProfile) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
}
