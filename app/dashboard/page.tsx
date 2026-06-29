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
  title: "Dashboard",
};

const sidebarLinks = [
  { label: "Overview", href: "/dashboard", icon: "📊" },
  { label: "Favorites", href: "/dashboard/favorites", icon: "❤️" },
  { label: "Profile", href: "/dashboard/profile", icon: "👤" },
];

const stats = [
  { label: "Nearby shops", value: "—" },
  { label: "Active offers", value: "—" },
  { label: "Saved favorites", value: "—" },
];

export default function DashboardPage() {
  return (
    <DashboardLayout
      title="Customer Dashboard"
      description="Your personalized view of nearby shops and offers."
      sidebarTitle="Customer"
      links={sidebarLinks}
    >
      <div className="grid gap-4 sm:grid-cols-3">
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
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            Your browsing history and saved offers will appear here as you
            explore nearby shops.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            No activity yet
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
