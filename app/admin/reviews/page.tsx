"use client";

import { useEffect, useState, useTransition } from "react";
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
import { reviewsService } from "@/services/reviews.service";
import { shopsService } from "@/services/shops.service";
import type { Review } from "@/types/review";
import type { Shop } from "@/types/shop";

const sidebarLinks = [
  { label: "Overview", href: "/admin", icon: "📊" },
  { label: "Users", href: "/admin/users", icon: "👤" },
  { label: "Shops", href: "/admin/shops", icon: "🏪" },
  { label: "Offers", href: "/admin/offers", icon: "🏷️" },
  { label: "Reviews", href: "/admin/reviews", icon: "⭐" },
  { label: "Import Shops", href: "/admin/import", icon: "📥" },
];

export default function AdminReviewsPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    try {
      setLoading(true);
      const [allReviews, allShops] = await Promise.all([
        reviewsService.getAllReviews(),
        shopsService.getAllShops(),
      ]);
      setReviews(allReviews);
      setShops(allShops);
    } catch (err) {
      console.error("Failed to load reviews data for admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      router.push("/login");
      return;
    }

    loadData();
  }, [firebaseUser, authLoading, router]);

  const handleDeleteReview = (reviewId: string, shopId: string, rating: number) => {
    if (!window.confirm("Are you sure you want to delete this review? This will recalculate the shop rating.")) {
      return;
    }

    startTransition(async () => {
      try {
        await reviewsService.deleteReview(reviewId, shopId, rating);
        setReviews((prev) => prev.filter((r) => r.reviewId !== reviewId));
      } catch (err) {
        console.error("Failed to delete review:", err);
        alert("Failed to delete review. Please check console logs.");
      }
    });
  };

  const getShopName = (shopId: string) => {
    const s = shops.find((shop) => shop.shopId === shopId);
    return s ? s.shopName : "Unknown Shop";
  };

  const formatDate = (ts: any) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <DashboardLayout
          title="Review Moderation"
          description="Moderate platform feedback, ratings, and comments."
          sidebarTitle="Administration"
          links={sidebarLinks}
        >
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-xl border border-slate-200 shadow-sm w-full">
            <LoadingSpinner className="h-10 w-10 text-brand-600 animate-spin" />
            <span className="text-sm text-slate-500 font-medium">Loading reviews...</span>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout
        title="Review Moderation"
        description="View all customer reviews across the platform and delete inappropriate comments."
        sidebarTitle="Administration"
        links={sidebarLinks}
      >
        <div className="space-y-6 max-w-5xl">
          <Card>
            <CardHeader>
              <CardTitle>Platform Reviews ({reviews.length})</CardTitle>
              <CardDescription>
                Reviews are listed in reverse chronological order. Recalculation is atomic upon deletion.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {reviews.length === 0 ? (
                <div className="text-center py-16 text-slate-400 gap-2 flex flex-col items-center justify-center">
                  <span className="text-5xl">⭐</span>
                  <p className="text-sm font-medium">No reviews found on the platform yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {reviews.map((rev) => (
                    <div
                      key={rev.reviewId}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{rev.userName}</span>
                          <span className="text-slate-400 text-xs">on</span>
                          <span className="font-semibold text-brand-600 text-xs truncate">
                            🏪 {getShopName(rev.shopId)}
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
                        <p className="text-[10px] text-slate-400 font-medium">
                          Posted: {formatDate(rev.createdAt)}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteReview(rev.reviewId, rev.shopId, rev.rating)}
                          disabled={isPending}
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs font-bold w-full sm:w-auto"
                        >
                          Delete Review
                        </Button>
                      </div>
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
