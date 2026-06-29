import type { Metadata } from "next";
import Link from "next/link";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Shop Owner Dashboard",
};

const sidebarLinks = [
  { label: "Overview", href: "/shop-owner", icon: "📊" },
  { label: "My Shop", href: "/shop-owner/shop", icon: "🏪" },
  { label: "Offers", href: "/shop-owner/offers", icon: "🏷️" },
  { label: "Analytics", href: "/shop-owner/analytics", icon: "📈" },
];

const stats = [
  { label: "Active offers", value: "0" },
  { label: "Shop views", value: "0" },
  { label: "Offer clicks", value: "0" },
];

export default function ShopOwnerDashboardPage() {
  return (
    <DashboardLayout
      title="Shop Owner Dashboard"
      description="Manage your shop profile and publish offers to nearby customers."
      sidebarTitle="Shop Owner"
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shop profile</CardTitle>
            <CardDescription>
              Set up your shop details, location, and opening hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/shop-owner/shop">
              <Button variant="outline">Create shop profile</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publish an offer</CardTitle>
            <CardDescription>
              Create discounts and promotions visible to nearby users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Create new offer</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
