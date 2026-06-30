"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { shopsService } from "@/services/shops.service";
import { reviewsService } from "@/services/reviews.service";
import type { Shop } from "@/types/shop";
import type { Review } from "@/types/review";
import Link from "next/link";

const sidebarLinks = [
  { label: "Overview", href: "/shop-owner", icon: "📊" },
  { label: "My Shop", href: "/shop-owner/shop", icon: "🏪" },
  { label: "Offers", href: "/shop-owner/offers", icon: "🏷️" },
  { label: "Reviews", href: "/shop-owner/reviews", icon: "⭐" },
  { label: "Analytics", href: "/shop-owner/analytics", icon: "📈" },
];

export default function ShopOwnerReviewsPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      router.push("/login");
      return;
    }

    async function loadData() {
      try {
        const ownerShop = await shopsService.getShopByOwner(firebaseUser!.uid);
        if (ownerShop) {
          setShop(ownerShop);
          const shopReviews = await reviewsService.getReviewsForShop(ownerShop.shopId);
          setReviews(shopReviews);
        }
      } catch (err) {
        console.error("Error loading shop owner reviews data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [firebaseUser, authLoading, router]);

  const formatDate = (ts: any) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Compute rating distribution statistics
  const ratingDistribution = [0, 0, 0, 0, 0]; // Index 0 represents 1-star, etc.
  reviews.forEach((r) => {
    const starIndex = Math.max(1, Math.min(5, Math.round(r.rating))) - 1;
    ratingDistribution[starIndex]++;
  });

  const totalReviews = reviews.length;
  const averageRating = shop?.rating || 0;

  if (authLoading || loading) {
    return (
      <ProtectedRoute allowedRoles={["shop_owner"]}>
        <DashboardLayout
          title="Customer Reviews"
          description="Read and monitor comments left on your shop profile."
          sidebarTitle="Shop Owner"
          links={sidebarLinks}
        >
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-xl border border-slate-200 shadow-sm w-full">
            <LoadingSpinner className="h-10 w-10 text-brand-600 animate-spin" />
            <span className="text-sm text-slate-500 font-medium animate-pulse">Loading reviews...</span>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!shop) {
    return (
      <ProtectedRoute allowedRoles={["shop_owner"]}>
        <DashboardLayout
          title="Customer Reviews"
          description="Read and monitor comments left on your shop profile."
          sidebarTitle="Shop Owner"
          links={sidebarLinks}
        >
          <Card className="max-w-md mx-auto text-center p-8 mt-10">
            <CardContent className="space-y-4">
              <span className="text-5xl block">🏪</span>
              <CardTitle>No Shop Profile Created</CardTitle>
              <CardDescription>
                You must complete your shop setup before you can view customer ratings and reviews.
              </CardDescription>
              <Link href="/shop-owner/shop" className="inline-block mt-2">
                <Button>Set Up Shop Profile</Button>
              </Link>
            </CardContent>
          </Card>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["shop_owner"]}>
      <DashboardLayout
        title="Customer Reviews"
        description={`Manage customer ratings, feedback, and comments for "${shop.shopName}".`}
        sidebarTitle="Shop Owner"
        links={sidebarLinks}
      >
        <div className="space-y-6 max-w-5xl">
          {/* Stats Cards Row */}
          <div className="grid gap-6 md:grid-cols-12 items-stretch">
            {/* Average Score Card */}
            <Card className="md:col-span-4 flex flex-col justify-center items-center py-6 text-center">
              <CardContent className="space-y-2 p-0">
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Average Rating</span>
                <h3 className="text-5xl font-black text-slate-900">
                  {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
                </h3>
                <div className="flex justify-center text-amber-500 text-lg">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>{i < Math.round(averageRating) ? "★" : "☆"}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-500 font-medium">Based on {totalReviews} reviews</p>
              </CardContent>
            </Card>

            {/* Distribution Graph Card */}
            <Card className="md:col-span-8">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-800">Rating Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = ratingDistribution[stars - 1];
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3 text-xs text-slate-600">
                      <span className="w-12 font-semibold text-right">{stars} star{stars > 1 ? "s" : ""}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-slate-400 font-semibold text-right">{count}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Feedback list */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Reviews & Feedback ({totalReviews})</CardTitle>
              <CardDescription>Detailed comments from customers who visited your shop.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {reviews.length === 0 ? (
                <div className="text-center py-16 text-slate-400 gap-2 flex flex-col items-center justify-center">
                  <span className="text-5xl">⭐</span>
                  <p className="text-sm font-medium">No reviews received yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {reviews.map((rev) => (
                    <div key={rev.reviewId} className="p-5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-slate-900 text-sm">{rev.userName}</span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {formatDate(rev.createdAt)}
                        </span>
                      </div>
                      <div className="flex text-amber-500 text-xs">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i}>{i < rev.rating ? "★" : "☆"}</span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
