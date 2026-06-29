import type { UserRole } from "@/types/user";

export function getDashboardPathForRole(role: UserRole): string {
  switch (role) {
    case "shop_owner":
      return "/shop-owner";
    case "admin":
      return "/admin";
    case "customer":
    default:
      return "/dashboard";
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "shop_owner":
      return "Shop Owner";
    case "admin":
      return "Admin";
    case "customer":
    default:
      return "Customer";
  }
}
