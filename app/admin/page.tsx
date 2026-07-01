"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { usersService } from "@/services/users.service";
import { shopsService } from "@/services/shops.service";
import { offersService } from "@/services/offers.service";
import type { User } from "@/types/user";
import type { Shop } from "@/types/shop";
import type { Offer } from "@/types/offer";

const sidebarLinks = [
  { label: "Overview", href: "/admin", icon: "📊" },
  { label: "Users", href: "/admin/users", icon: "👤" },
  { label: "Shops", href: "/admin/shops", icon: "🏪" },
  { label: "Offers", href: "/admin/offers", icon: "🏷️" },
  { label: "Reviews", href: "/admin/reviews", icon: "⭐" },
  { label: "Import Shops", href: "/admin/import", icon: "📥" },
];

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allUsers, allShops, allOffers] = await Promise.all([
        usersService.getAllUsers(),
        shopsService.getAllShops(),
        offersService.getAllOffers(),
      ]);
      setUsers(allUsers);
      setShops(allShops);
      setOffers(allOffers);
    } catch (err) {
      console.error("Error loading admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveShop = async (shopId: string) => {
    try {
      setActionLoadingId(shopId);
      await shopsService.updateShop(shopId, { verified: true });
      await loadData();
    } catch (err) {
      console.error("Failed to approve shop:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectShop = async (shopId: string) => {
    try {
      setActionLoadingId(shopId);
      await shopsService.updateShop(shopId, { verified: false });
      await loadData();
    } catch (err) {
      console.error("Failed to reject shop:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Calculations for stats
  const totalUsers = users.length;
  const totalShopOwners = users.filter((u) => u.role === "shop_owner").length;
  const totalShops = shops.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalActiveOffers = offers.filter((o) => {
    const end = (o.endDate as any)?.toDate ? (o.endDate as any).toDate() : new Date(o.endDate as any);
    end.setHours(0, 0, 0, 0);
    return o.active && end >= today;
  }).length;

  const totalExpiredOffers = offers.filter((o) => {
    const end = (o.endDate as any)?.toDate ? (o.endDate as any).toDate() : new Date(o.endDate as any);
    end.setHours(0, 0, 0, 0);
    return !o.active || end < today;
  }).length;

  const pendingShops = shops.filter((s) => !s.verified);
  const totalPendingVerifications = pendingShops.length;

  // Simple analytics computation
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();

  const newUsersThisMonth = users.filter((u) => {
    const d = (u.createdAt as any)?.toDate ? (u.createdAt as any).toDate() : new Date(u.createdAt as any);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const newShopsThisMonth = shops.filter((s) => {
    const d = (s.createdAt as any)?.toDate ? (s.createdAt as any).toDate() : new Date(s.createdAt as any);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  // Category counts
  const categoryMap: Record<string, number> = {};
  shops.forEach((s) => {
    if (s.category) {
      categoryMap[s.category] = (categoryMap[s.category] || 0) + 1;
    }
  });

  const popularCategories = Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const stats = [
    { label: "Total Users", value: totalUsers, icon: "👤", color: "text-blue-600 bg-blue-50" },
    { label: "Shop Owners", value: totalShopOwners, icon: "👥", color: "text-purple-600 bg-purple-50" },
    { label: "Total Shops", value: totalShops, icon: "🏪", color: "text-emerald-600 bg-emerald-50" },
    { label: "Active Offers", value: totalActiveOffers, icon: "🏷️", color: "text-amber-600 bg-amber-50" },
    { label: "Expired Offers", value: totalExpiredOffers, icon: "⌛", color: "text-rose-600 bg-rose-50" },
    { label: "Pending Verifications", value: totalPendingVerifications, icon: "🛡️", color: "text-indigo-600 bg-indigo-50" },
  ];

  return (
    <DashboardLayout
      title="Admin Control Center"
      description="Moderate shops, verify owners, and manage platform activity."
      sidebarTitle="Administration"
      links={sidebarLinks}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-xl border border-slate-200 shadow-sm w-full">
          <LoadingSpinner className="h-10 w-10 text-brand-600 animate-spin" />
          <span className="text-sm text-slate-500 font-medium animate-pulse">
            Loading dashboard data...
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.label} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                  </div>
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg ${stat.color}`}>
                    {stat.icon}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Pending Moderation Queue */}
            <div className="lg:col-span-7">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>🛡️</span> Moderation Queue
                  </CardTitle>
                  <CardDescription>
                    Shops awaiting approval to appear publicly on maps and list offers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {pendingShops.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                      <span className="text-4xl">✨</span>
                      <p className="text-sm font-medium">All caught up! No pending shops.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                      {pendingShops.map((shop) => (
                        <div key={shop.shopId} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm truncate">{shop.shopName}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Owner: {shop.ownerName || "Unknown"}</p>
                            <p className="text-[10px] text-slate-400 truncate mt-1">📍 {shop.address}, {shop.city}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectShop(shop.shopId)}
                              disabled={actionLoadingId !== null}
                              className="text-[11px] h-7 px-2 border-rose-200 text-rose-600 hover:bg-rose-50"
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveShop(shop.shopId)}
                              disabled={actionLoadingId !== null}
                              className="text-[11px] h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            >
                              {actionLoadingId === shop.shopId ? "..." : "Verify"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Analytics Widgets */}
            <div className="lg:col-span-5">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>📈</span> Platform Analytics
                  </CardTitle>
                  <CardDescription>
                    Summary of this month's growth and categories.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Growth stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">New Users (Month)</p>
                      <p className="text-lg font-bold text-slate-800 mt-1">+{newUsersThisMonth}</p>
                    </div>
                    <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">New Shops (Month)</p>
                      <p className="text-lg font-bold text-slate-800 mt-1">+{newShopsThisMonth}</p>
                    </div>
                  </div>

                  {/* Popular Categories Chart */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Popular Categories
                    </h4>
                    {popularCategories.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No category data available</p>
                    ) : (
                      <div className="space-y-3">
                        {popularCategories.map((cat, idx) => {
                          const percentage = totalShops > 0 ? (cat.count / totalShops) * 100 : 0;
                          const barColors = [
                            "bg-blue-500",
                            "bg-purple-500",
                            "bg-emerald-500",
                            "bg-amber-500",
                          ];
                          const color = barColors[idx % barColors.length];
                          return (
                            <div key={cat.name} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-medium text-slate-700">
                                <span>{cat.name}</span>
                                <span>{cat.count} shops ({Math.round(percentage)}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${color}`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
