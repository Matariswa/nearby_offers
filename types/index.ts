export type UserRole = "customer" | "shop_owner" | "admin";

export interface NavLink {
  label: string;
  href: string;
}

export interface DashboardStat {
  label: string;
  value: string;
  change?: string;
}

export interface FeatureCard {
  title: string;
  description: string;
  icon: string;
}
