"use client";

import { useEffect, useState, useRef, useTransition, use } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import { LoadingSpinner, PageLoader } from "@/components/ui/LoadingSpinner";
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";
import { shopsService } from "@/services/shops.service";
import { offersService } from "@/services/offers.service";
import { usersService } from "@/services/users.service";
import type { Shop } from "@/types/shop";
import type { Offer } from "@/types/offer";

const sidebarLinks = [
  { label: "Overview", href: "/dashboard", icon: "📊" },
  { label: "Favorites", href: "/dashboard/favorites", icon: "❤️" },
  { label: "Profile", href: "/dashboard/profile", icon: "👤" },
];

export default function ShopDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = params.shopId as string;

  const { firebaseUser } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Google Maps
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const mapsLoaded = useGoogleMapsScript(apiKey);
  const mapRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // Load shop profile, favorites, and offers
  useEffect(() => {
    if (!firebaseUser || !shopId) return;
    const uid = firebaseUser.uid;

    async function loadData() {
      try {
        const { getDoc, getDocs, query, where } = await import("firebase/firestore");
        
        // Fetch Favorites
        const favsList = await usersService.getFavoriteShops(uid);
        setFavorites(favsList);

        // Fetch Shop Doc
        const shopRef = shopsService.getDocRef(shopId);
        const shopSnap = await getDoc(shopRef);

        if (!shopSnap.exists()) {
          setShop(null);
          setLoading(false);
          return;
        }

        const shopData = shopSnap.data() as Shop;
        
        // Customers are only allowed to read verified shops
        if (shopData.verified !== true) {
          setShop(null);
          setLoading(false);
          return;
        }

        setShop(shopData);

        // Fetch active offers for this shop
        const q = query(offersService.getCollectionRef(), where("shopId", "==", shopId));
        const offersSnap = await getDocs(q);
        const allOffers = offersSnap.docs.map((doc) => doc.data() as Offer);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeOffers = allOffers.filter((o) => {
          const end = (o.endDate as any)?.toDate ? (o.endDate as any).toDate() : new Date(o.endDate as any);
          end.setHours(0, 0, 0, 0);
          return o.active === true && end >= today;
        });

        setOffers(activeOffers);
      } catch (err) {
        console.error("Error loading shop details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [firebaseUser, shopId]);

  // Initialize Map
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || !shop || !shop.latitude || !shop.longitude) return;

    const position = { lat: shop.latitude, lng: shop.longitude };
    const map = new window.google.maps.Map(mapRef.current, {
      center: position,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    new window.google.maps.Marker({
      position,
      map,
      title: shop.shopName,
    });
  }, [mapsLoaded, shop]);

  const handleToggleFavorite = () => {
    if (!firebaseUser || !shop) return;

    const isFav = favorites.includes(shop.shopId);
    startTransition(async () => {
      try {
        if (isFav) {
          await usersService.removeFavoriteShop(firebaseUser.uid, shop.shopId);
          setFavorites((prev) => prev.filter((id) => id !== shop.shopId));
        } else {
          await usersService.addFavoriteShop(firebaseUser.uid, shop.shopId);
          setFavorites((prev) => [...prev, shop.shopId]);
        }
      } catch (err) {
        console.error("Error updating favorite shop status:", err);
      }
    });
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

  const getDirectionsLink = () => {
    if (!shop || !shop.latitude || !shop.longitude) return "#";
    return `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Shop Details"
        description="Loading shop information..."
        sidebarTitle="Customer"
        links={sidebarLinks}
      >
        <div className="space-y-6 max-w-6xl animate-pulse">
          {/* Action Row skeleton */}
          <div className="flex items-center justify-between">
            <div className="bg-slate-200 h-9 w-28 rounded-lg"></div>
            <div className="bg-slate-200 h-9 w-36 rounded-lg"></div>
          </div>

          {/* Hero Card skeleton */}
          <Card>
            <div className="flex flex-col md:flex-row border-b pb-6 p-6 gap-6">
              <div className="h-24 w-24 rounded-xl bg-slate-200 shrink-0"></div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-200 h-8 w-48 rounded"></div>
                  <div className="bg-slate-200 h-5 w-20 rounded-full"></div>
                </div>
                <div className="bg-slate-200 h-4 w-24 rounded"></div>
                <div className="bg-slate-200 h-10 w-full max-w-2xl rounded"></div>
              </div>
            </div>

            <div className="p-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="bg-slate-200 h-6 w-32 rounded"></div>
                <div className="bg-slate-200 h-12 w-full rounded"></div>
                <div className="bg-slate-200 h-12 w-full rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-200 h-6 w-32 rounded"></div>
                <div className="bg-slate-200 h-[220px] w-full rounded-lg"></div>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!shop) {
    return (
      <DashboardLayout
        title="Shop Not Found"
        description="We couldn't locate the requested shop details."
        sidebarTitle="Customer"
        links={sidebarLinks}
      >
        <Card className="max-w-md mx-auto mt-10 text-center p-8">
          <CardContent className="space-y-4">
            <span className="text-5xl block">⚠️</span>
            <CardTitle>Shop Profile Unobtainable</CardTitle>
            <CardDescription>
              This shop profile might be disabled, unverified, or does not exist.
            </CardDescription>
            <Button onClick={() => router.push("/dashboard")}>Back to Finder</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const isFav = favorites.includes(shop.shopId);

  return (
    <DashboardLayout
      title={shop.shopName}
      description={`View coordinates, operations, and active discounts at ${shop.shopName}.`}
      sidebarTitle="Customer"
      links={sidebarLinks}
    >
      <div className="space-y-6 max-w-6xl">
        {/* Back Button & Favorites Toggle */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
            ← Back to Finder
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleFavorite}
            disabled={isPending}
            className={isFav ? "text-rose-600 border-rose-200 bg-rose-50" : ""}
          >
            {isFav ? "Saved Favorite ❤️" : "Add to Favorites 🤍"}
          </Button>
        </div>

        {/* Hero Section Card */}
        <Card className="overflow-hidden">
          <div className="flex flex-col md:flex-row border-b pb-6 p-6 gap-6">
            <div className="h-24 w-24 rounded-xl bg-slate-100 border overflow-hidden flex items-center justify-center shadow-inner shrink-0">
              {shop.logo ? (
                <img src={shop.logo} alt={shop.shopName} className="object-cover h-full w-full" />
              ) : (
                <span className="text-3xl">🏪</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-3xl font-extrabold text-slate-900">{shop.shopName}</h2>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  Verified ✓
                </span>
                <span className="text-sm font-semibold text-amber-500 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 ml-1">
                  ⭐ 4.6 (23 reviews)
                </span>
              </div>
              <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">{shop.category}</p>
              <p className="text-slate-600 text-sm max-w-2xl whitespace-pre-wrap pt-2">
                {shop.description || "No description provided."}
              </p>
            </div>
          </div>

          <CardContent className="p-6 grid gap-6 md:grid-cols-2">
            {/* Operational Info */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-lg border-b pb-1.5">Shop Information</h3>
              
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Phone Contact</span>
                <p className="text-sm font-semibold text-slate-950 mt-0.5">{shop.phone}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Opening Hours</span>
                <p className="text-sm font-semibold text-slate-950 mt-0.5">
                  🕒 {shop.openingTime} - {shop.closingTime}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Physical Address</span>
                <p className="text-sm text-slate-950 mt-0.5">{shop.address}</p>
                <p className="text-sm text-slate-950">{shop.city}, {shop.state} - {shop.pincode}</p>
              </div>
            </div>

            {/* Embed Map locator */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-1.5">
                <h3 className="font-bold text-slate-800 text-lg">Location Map</h3>
                <a
                  href={getDirectionsLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  🗺️ Google Maps Directions →
                </a>
              </div>
              <div className="h-[220px] rounded-lg border overflow-hidden bg-slate-100 shadow-inner">
                {!mapsLoaded ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <LoadingSpinner />
                    <span className="text-xs text-slate-400 font-semibold">Loading Map...</span>
                  </div>
                ) : (
                  <div ref={mapRef} className="w-full h-full" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media / Images Gallery */}
        {shop.shopImages && shop.shopImages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Shop Gallery</CardTitle>
              <CardDescription>Photos of storefront and product displays.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {shop.shopImages.map((url, idx) => (
                  <div key={idx} className="h-36 rounded-lg border overflow-hidden bg-slate-50 shadow-sm">
                    <img src={url} alt={`Gallery ${idx + 1}`} className="object-cover h-full w-full hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Offers Section */}
        <Card>
          <CardHeader>
            <CardTitle>Active Offers & Discounts ({offers.length})</CardTitle>
            <CardDescription>Redeem deals by showing coupons in-store. Click any card to view details.</CardDescription>
          </CardHeader>
          <CardContent>
            {offers.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed text-sm text-slate-500">
                No active promotional offers available at this shop right now.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {offers.map((offer) => (
                  <div
                    key={offer.offerId}
                    className="flex flex-col justify-between border rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors relative"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="bg-brand-50 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          {offer.offerType === "Percentage" ? `${offer.discountValue}% OFF` : offer.offerType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Valid: {formatDate(offer.startDate)} - {formatDate(offer.endDate)}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-2">{offer.title}</h4>
                      <p className="text-slate-600 text-xs mt-1">{offer.description}</p>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t">
                      {offer.couponCode ? (
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-2.5 py-0.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Code</span>
                          <span className="text-xs font-mono font-bold text-slate-800">{offer.couponCode}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No code needed</span>
                      )}

                      <Link href={`/dashboard/offer/${offer.offerId}`}>
                        <Button size="sm" variant="outline" className="text-[11px] h-7 px-2">
                          View Details →
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
