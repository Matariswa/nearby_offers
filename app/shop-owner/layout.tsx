"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function ShopOwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["shop_owner"]}>{children}</ProtectedRoute>
  );
}
