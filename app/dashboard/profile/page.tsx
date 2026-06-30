"use client";

import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

const sidebarLinks = [
  { label: "Overview", href: "/dashboard", icon: "📊" },
  { label: "Favorites", href: "/dashboard/favorites", icon: "❤️" },
  { label: "Profile", href: "/dashboard/profile", icon: "👤" },
];

export default function ProfilePage() {
  const { userProfile, firebaseUser } = useAuth();

  const displayName =
    userProfile?.name || firebaseUser?.displayName || "User";
  const email = userProfile?.email || firebaseUser?.email || "";
  const photoURL = userProfile?.photoURL || firebaseUser?.photoURL;
  const role = userProfile?.role ?? "customer";
  const phone = userProfile?.phone ?? "";
  const isVerified =
    userProfile?.isVerified ?? firebaseUser?.emailVerified ?? false;

  const roleLabel =
    role === "admin"
      ? "Administrator"
      : role === "shop_owner"
      ? "Shop Owner"
      : "Customer";

  return (
    <ProtectedRoute allowedRoles={["customer", "shop_owner", "admin"]}>
      <DashboardLayout
        title="My Profile"
        description="View your account details and sign-in information"
        sidebarTitle="Customer Menu"
        links={sidebarLinks}
      >
        <div className="space-y-6">
          {/* Avatar + name card */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-5 py-6">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={displayName}
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-brand-100"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-3xl font-bold text-white ring-4 ring-brand-100">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900">
                  {displayName}
                </h2>
                <p className="text-sm text-slate-500">{email}</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-0.5 text-xs font-medium text-brand-700">
                  {roleLabel}
                </span>
              </div>

              <div>
                {isVerified ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                    ⚠ Not verified
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detail cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account Details</CardTitle>
                <CardDescription>Your basic account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Full name" value={displayName} />
                <Row label="Email" value={email} />
                <Row label="Phone" value={phone || "—"} />
                <Row label="Role" value={roleLabel} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sign-in Method</CardTitle>
                <CardDescription>
                  How you access your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {firebaseUser?.providerData.map((p) => (
                  <Row
                    key={p.providerId}
                    label="Provider"
                    value={
                      p.providerId === "google.com"
                        ? "Google"
                        : p.providerId === "password"
                        ? "Email & Password"
                        : p.providerId
                    }
                  />
                ))}
                <Row label="User ID" value={firebaseUser?.uid ?? "—"} />
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="text-right text-slate-900 break-all">{value}</span>
    </div>
  );
}
