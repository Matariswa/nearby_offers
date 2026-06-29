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
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";
import { calculateDistance } from "@/utils/distance";
import { shopsService } from "@/services/shops.service";
import { offersService } from "@/services/offers.service";
import { usersService } from "@/services/users.service";
import type { Shop } from "@/types/shop";
import type { Offer } from "@/types/offer";
import Link from "next/link";

const sidebarLinks = [
  { label: "Overview", href: "/dashboard", icon: "📊" },
  { label: "Favorites", href: "/dashboard/favorites", icon: "❤️" },
  { label: "Profile", href: "/dashboard/profile", icon: "👤" },
];

export default function FavoritesPage() {
  const { firebaseUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"shops" | "offers">("shops");
  
  // Data
  const [favoriteShops, setFavoriteShops] = useState<Shop[]>([]);
  const [favoriteOffers, setFavoriteOffers] = useState<(Offer & { shopName?: string; shopDistance?: number; shop?: Shop })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Geolocation
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Load user geolocation
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => console.log("Geolocation blocked/unavailable.")
      );
    }
  }, []);

  // Fetch data
  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    async function loadData() {
      try {
        const { getDocs } = await import("firebase/firestore");

        // Fetch User profile fav lists
        const favShopIds = await usersService.getFavoriteShops(uid);
        const favOfferIds = await usersService.getFavoriteOffers(uid);

        // Fetch all verified shops
        const shopsRef = shopsService.getCollectionRef();
        const shopSnap = await getDocs(shopsRef);
        const allShops = shopSnap.docs.map((doc) => doc.data() as Shop).filter((s) => s.verified === true);

        // Filter favorite shops
        const filteredShops = allShops.filter((s) => favShopIds.includes(s.shopId));

        // Inject distance to favorite shops
        if (userLocation) {
          filteredShops.forEach((shop) => {
            if (shop.latitude && shop.longitude) {
              (shop as any).distance = calculateDistance(
                { latitude: userLocation.latitude, longitude: userLocation.longitude },
                { latitude: shop.latitude, longitude: shop.longitude }
              );
            }
          });
        }
        setFavoriteShops(filteredShops);

        if (favOfferIds.length === 0) {
          setFavoriteOffers([]);
          return;
        }

        // Fetch all active offers
        const offersRef = offersService.getCollectionRef();
        const offersSnap = await getDocs(offersRef);
        const allOffers = offersSnap.docs.map((doc) => doc.data() as Offer);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter active & saved offers
        const filteredOffers = allOffers.filter((o) => {
          const end = (o.endDate as any)?.toDate ? (o.endDate as any).toDate() : new Date(o.endDate as any);
          end.setHours(0, 0, 0, 0);
          return o.active === true && end >= today && favOfferIds.includes(o.offerId);
        });

        // Map parent shop info to the offers
        const offersWithShopInfo = filteredOffers.map((offer) => {
          const parentShop = allShops.find((s) => s.shopId === offer.shopId);
          let dist = undefined;
          if (userLocation && parentShop?.latitude && parentShop?.longitude) {
            dist = calculateDistance(
              { latitude: userLocation.latitude, longitude: userLocation.longitude },
              { latitude: parentShop.latitude, longitude: parentShop.longitude }
            );
          }
          return {
            ...offer,
            shopName: parentShop?.shopName,
            shopDistance: dist,
            shop: parentShop,
          };
        });

        setFavoriteOffers(offersWithShopInfo);
      } catch (err) {
        console.error("Error loading favorites data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [firebaseUser, userLocation]);

  const handleRemoveShopFavorite = (shopId: string) => {
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

  const handleRemoveOfferFavorite = (offerId: string) => {
    if (!firebaseUser) return;

    startTransition(async () => {
      try {
        await usersService.removeFavoriteOffer(firebaseUser.uid, offerId);
        setFavoriteOffers((prev) => prev.filter((o) => o.offerId !== offerId));
      } catch (err) {
        console.error("Error removing favorite offer:", err);
      }
    });
  };

  const getDirectionsLink = (shop: Shop) => {
    if (!shop || !shop.latitude || !shop.longitude) return "#";
    return `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
  };

  const formatDate = (ts: any) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <DashboardLayout
        title="My Favorites"
        description="Your curated list of stores and discount offers."
        sidebarTitle="Customer"
        links={sidebarLinks}
      >
        <div className="space-y-6 max-w-6xl animate-pulse">
          {/* Tabs Selector Skeleton */}
          <div className="flex gap-2 border-b pb-2">
            <div className="bg-slate-200 h-9 w-24 rounded-lg"></div>
            <div className="bg-slate-200 h-9 w-24 rounded-lg"></div>
          </div>
          {/* Grid Cards Skeletons */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-48 bg-slate-100 flex flex-col justify-between p-5">
                <div className="flex gap-4">
                  <div className="h-14 w-14 bg-slate-200 rounded-lg shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="bg-slate-200 h-5 w-2/3 rounded"></div>
                    <div className="bg-slate-200 h-3.5 w-1/3 rounded"></div>
                  </div>
                </div>
                <div className="bg-slate-200 h-6 w-full rounded mt-4"></div>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Favorites"
      description="View and manage your favorite stores and active offers."
      sidebarTitle="Customer"
      links={sidebarLinks}
    >
      <div className="space-y-6 max-w-6xl">
        {/* Tab switch buttons */}
        <div className="flex border-b border-slate-100 pb-px gap-4">
          <button
            onClick={() => setActiveTab("shops")}
            className={`pb-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "shops"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Favorite Shops ({favoriteShops.length})
          </button>
          <button
            onClick={() => setActiveTab("offers")}
            className={`pb-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "offers"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Favorite Offers ({favoriteOffers.length})
          </button>
        </div>

        {/* Favorite Shops Tab Panel */}
        {activeTab === "shops" && (
          favoriteShops.length === 0 ? (
            <Card className="text-center py-16 max-w-xl mx-auto mt-6">
              <CardContent className="space-y-4">
                <span className="text-5xl block">🏪</span>
                <CardTitle>No favorite shops saved yet</CardTitle>
                <CardDescription>
                  Explore the Nearby Map Finder and toggle the heart icon on any store to save them here.
                </CardDescription>
                <Link href="/dashboard" className="inline-block mt-2">
                  <Button>Start Exploring</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {favoriteShops.map((shop) => (
                <Card key={shop.shopId} className="hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                  <CardContent className="p-5">
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

                    <p className="text-slate-400 text-xs mt-4 truncate">📍 {shop.address}, {shop.city}</p>
                    {(shop as any).distance !== undefined && (
                      <p className="text-slate-500 text-xs font-semibold mt-1">
                        📍 Distance: {(shop as any).distance.toFixed(1)} km
                      </p>
                    )}
                    {shop.openingTime && (
                      <p className="text-slate-400 text-xs mt-1">
                        🕒 Hours: {shop.openingTime} - {shop.closingTime}
                      </p>
                    )}
                  </CardContent>

                  <div className="px-5 pb-5 flex gap-2">
                    <Link href={`/dashboard/shop/${shop.shopId}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        View Details
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveShopFavorite(shop.shopId)}
                      disabled={isPending}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs"
                    >
                      Remove ❤️
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}

        {/* Favorite Offers Tab Panel */}
        {activeTab === "offers" && (
          favoriteOffers.length === 0 ? (
            <Card className="text-center py-16 max-w-xl mx-auto mt-6">
              <CardContent className="space-y-4">
                <span className="text-5xl block">🏷️</span>
                <CardTitle>No favorite offers saved yet</CardTitle>
                <CardDescription>
                  Explore the dashboard and save any exciting deals to keep track of them here.
                </CardDescription>
                <Link href="/dashboard" className="inline-block mt-2">
                  <Button>Start Exploring</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {favoriteOffers.map((offer) => (
                <Card key={offer.offerId} className="hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                  <CardContent className="p-5 space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2">
                      <span className="bg-brand-50 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {offer.offerType === "Percentage" ? `${offer.discountValue}% OFF` : offer.offerType}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Expires: {formatDate(offer.endDate)}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-base truncate">{offer.title}</h4>
                      {offer.shopName && (
                        <p className="text-slate-500 text-xs mt-0.5 font-medium">🏪 {offer.shopName}</p>
                      )}
                      {offer.shopDistance !== undefined && (
                        <p className="text-slate-500 text-[11px] font-semibold mt-1">
                          📍 Distance: {offer.shopDistance.toFixed(1)} km
                        </p>
                      )}
                      <p className="text-slate-600 text-xs mt-2 line-clamp-2">{offer.description}</p>
                    </div>
                  </CardContent>

                  <div className="px-5 pb-5 flex gap-2">
                    <Link href={`/dashboard/offer/${offer.offerId}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        View Details
                      </Button>
                    </Link>
                    {offer.shop && (
                      <a
                        href={getDirectionsLink(offer.shop)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center justify-center"
                      >
                        🗺️ Navigate
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveOfferFavorite(offer.offerId)}
                      disabled={isPending}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs shrink-0"
                    >
                      ❤️
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
