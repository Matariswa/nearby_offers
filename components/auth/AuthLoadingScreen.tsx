"use client";

import { PageLoader } from "@/components/ui/LoadingSpinner";

export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <PageLoader />
      <p className="mt-4 text-sm font-medium text-slate-600">
        Checking authentication...
      </p>
    </div>
  );
}
