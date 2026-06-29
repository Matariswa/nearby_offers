"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { shopsService } from "@/services/shops.service";
import { usersService } from "@/services/users.service";
import type { Shop } from "@/types/shop";
import Link from "next/link";

const sidebarLinks = [
  { label: "Overview", href: "/dashboard", icon: "📊" },
  { label: "Favorites", href: "/dashboard/favorites", icon: "❤️" },
  { label: "Profile", href: "/dashboard/profile", icon: "👤" },
];

export default function FavoritesPage() {
  const { firebaseUser } = useAuth();
  const [favoriteShops, setFavoriteShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!firebaseUser) return;

    async function loadFavorites() {
      try {
        const favsList = await usersService.getFavoriteShops(firebaseUser.uid);
        if (favsList.length === 0) {
          setFavoriteShops([]);
          return;
        }

        const { getDocs } = await import("firebase/firestore");
        const shopsRef = shopsService.getCollectionRef();
        const shopSnap = await getDocs(shopsRef);
        const allShops = shopSnap.docs.map((doc) => doc.data() as Shop);
        
        // Filter verified shops that are in the user's favorites list
        const filtered = allShops.filter(
          (s) => s.verified === true && favsList.includes(s.shopId)
        );
        setFavoriteShops(filtered);
      } catch (err) {
        console.error("Error loading favorites:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFavorites();
  }, [firebaseUser]);

  const handleRemoveFavorite = (shopId: string) => {
    if (!firebaseUser) return;

    startTransition(async () => {
      try {
        await usersService.removeFavoriteShop(firebaseUser.uid, shopId);
        setFavoriteShops((prev) => prev.filter((s) => s.shopId !== shopId));
      } catch (err) {
        console.error("Error removing favorite shop:", err);
      }
    });
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Saved Shops"
        description="Your curated list of favorite local stores."
        sidebarTitle="Customer"
        links={sidebarLinks}
      >
        <PageLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Favorites"
      description="View and manage your favorite local shops."
      sidebarTitle="Customer"
      links={sidebarLinks}
    >
      {favoriteShops.length === 0 ? (
        <Card className="text-center py-16 max-w-xl mx-auto mt-10">
          <CardContent className="space-y-4">
            <span className="text-5xl block">❤️</span>
            <CardTitle>No favorite shops saved yet</CardTitle>
            <CardDescription>
              Explore the Nearby Map Finder and toggle the heart icon on any store to save them to your list.
            </CardDescription>
            <Link href="/dashboard" className="inline-block mt-2">
              <Button>Start Exploring</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl">
          {favoriteShops.map((shop) => (
            <Card key={shop.shopId} className="hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <CardContent className="p-5">
                {/* Header details */}
                <div className="flex gap-4 items-start">
                  <div className="h-14 w-14 rounded-lg bg-slate-100 border overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                    {shop.logo ? (
                      <img src={shop.logo} alt={shop.shopName} className="object-cover h-full w-full" />
                    ) : (
                      <span className="text-xl">🏪</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-base truncate pr-6">{shop.shopName}</h4>
                    <p className="text-slate-500 text-xs mt-0.5">{shop.category}</p>
                  </div>
                </div>

                <p className="text-slate-400 text-xs mt-3 truncate">📍 {shop.address}, {shop.city}</p>
                {shop.phone && <p className="text-slate-400 text-xs mt-1">📞 {shop.phone}</p>}
                {shop.openingTime && (
                  <p className="text-slate-400 text-xs mt-1">
                    🕒 Hours: {shop.openingTime} - {shop.closingTime}
                  </p>
                )}
              </CardContent>

              {/* Actions footer */}
              <div className="px-5 pb-5 flex gap-2">
                <Link href={`/dashboard/shop/${shop.shopId}`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full text-xs">
                    View Details
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemoveFavorite(shop.shopId)}
                  disabled={isPending}
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs"
                >
                  Remove ❤️
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
