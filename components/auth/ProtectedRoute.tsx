"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { FirebaseConfigAlert } from "@/components/auth/FirebaseConfigAlert";
import { getDashboardPathForRole } from "@/lib/auth/redirects";
import type { UserRole } from "@/types/user";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { firebaseUser, userProfile, loading, isConfigured } = useAuth();

  useEffect(() => {
    if (loading || !isConfigured) {
      return;
    }

    if (!firebaseUser) {
      router.replace("/login");
      return;
    }

    if (userProfile && !allowedRoles.includes(userProfile.role)) {
      router.replace(getDashboardPathForRole(userProfile.role));
    }
  }, [
    allowedRoles,
    firebaseUser,
    isConfigured,
    loading,
    router,
    userProfile,
  ]);

  if (!isConfigured) {
    return <FirebaseConfigAlert />;
  }

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!firebaseUser || !userProfile) {
    return <AuthLoadingScreen />;
  }

  if (!allowedRoles.includes(userProfile.role)) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
}
