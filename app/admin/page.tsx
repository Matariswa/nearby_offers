import type { Metadata } from "next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

const sidebarLinks = [
  { label: "Overview", href: "/admin", icon: "📊" },
  { label: "Shops", href: "/admin/shops", icon: "🏪" },
  { label: "Shop Owners", href: "/admin/shop-owners", icon: "👥" },
  { label: "Reports", href: "/admin/reports", icon: "🚩" },
  { label: "Users", href: "/admin/users", icon: "👤" },
];

const stats = [
  { label: "Pending shops", value: "0" },
  { label: "Pending owners", value: "0" },
  { label: "Open reports", value: "0" },
  { label: "Total users", value: "0" },
];

export default function AdminDashboardPage() {
  return (
    <DashboardLayout
      title="Admin Dashboard"
      description="Moderate shops, verify owners, and manage platform activity."
      sidebarTitle="Administration"
      links={sidebarLinks}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Moderation queue</CardTitle>
          <CardDescription>
            Shops and shop owners awaiting approval will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            No pending items
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
