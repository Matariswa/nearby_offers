"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
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

interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

export default function OfferDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const offerId = params.offerId as string;

  const { firebaseUser } = useAuth();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Geolocation
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Google Maps
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const mapsLoaded = useGoogleMapsScript(apiKey);
  const mapRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // Toast
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, visible: true });
  };

  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.visible]);

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
        () => console.log("Geolocation blocked or unavailable.")
      );
    }
  }, []);

  // Load offer, shop details, and favorite list
  useEffect(() => {
    if (!firebaseUser || !offerId) return;
    const uid = firebaseUser.uid;

    async function loadData() {
      try {
        const { getDoc } = await import("firebase/firestore");
        
        // Load favorite offers
        const favOffers = await usersService.getFavoriteOffers(uid);
        setFavorites(favOffers);

        // Fetch Offer Doc
        const offerRef = offersService.getDocRef(offerId);
        const offerSnap = await getDoc(offerRef);

        if (!offerSnap.exists()) {
          setOffer(null);
          setLoading(false);
          return;
        }

        const offerData = offerSnap.data() as Offer;

        // Check if offer is active and not expired
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = (offerData.endDate as any)?.toDate ? (offerData.endDate as any).toDate() : new Date(offerData.endDate as any);
        end.setHours(0, 0, 0, 0);

        if (offerData.active !== true || end < today) {
          setOffer(null);
          setLoading(false);
          return;
        }

        setOffer(offerData);

        // Fetch parent shop doc
        const shopRef = shopsService.getDocRef(offerData.shopId);
        const shopSnap = await getDoc(shopRef);

        if (shopSnap.exists()) {
          const shopData = shopSnap.data() as Shop;
          if (shopData.verified === true) {
            setShop(shopData);
          }
        }
      } catch (err) {
        console.error("Error loading offer details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [firebaseUser, offerId]);

  // Map Initialization
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
    if (!firebaseUser || !offer) return;

    const isFav = favorites.includes(offer.offerId);
    startTransition(async () => {
      try {
        if (isFav) {
          await usersService.removeFavoriteOffer(firebaseUser.uid, offer.offerId);
          setFavorites((prev) => prev.filter((id) => id !== offer.offerId));
          showToast("Offer removed from favorites.", "success");
        } else {
          await usersService.addFavoriteOffer(firebaseUser.uid, offer.offerId);
          setFavorites((prev) => [...prev, offer.offerId]);
          showToast("Offer added to favorites!", "success");
        }
      } catch (err) {
        console.error("Error toggling favorite offer:", err);
        showToast("Failed to update favorites.", "error");
      }
    });
  };

  const handleShare = async () => {
    if (!offer) return;

    const shareData = {
      title: offer.title,
      text: `${offer.title} - Active deal at ${shop?.shopName || "nearby shop"}!`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.warn("Share API dismissed or failed:", err);
      }
    } else {
      // Fallback: Copy link
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast("Offer link copied to clipboard!", "success");
      } catch (err) {
        console.error("Clipboard copy failed:", err);
        showToast("Failed to copy link.", "error");
      }
    }
  };

  const copyCouponCode = async () => {
    if (!offer?.couponCode) return;
    try {
      await navigator.clipboard.writeText(offer.couponCode);
      showToast("Coupon code copied!", "success");
    } catch (err) {
      console.error("Failed to copy coupon code:", err);
    }
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

  // Distance computation
  const distance = (() => {
    if (userLocation && shop?.latitude && shop?.longitude) {
      return calculateDistance(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: shop.latitude, longitude: shop.longitude }
      );
    }
    return null;
  })();

  const getDirectionsLink = () => {
    if (!shop || !shop.latitude || !shop.longitude) return "#";
    return `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Offer Details"
        description="View details of this active promotion."
        sidebarTitle="Customer"
        links={sidebarLinks}
      >
        <PageLoader />
      </DashboardLayout>
    );
  }

  if (!offer || !shop) {
    return (
      <DashboardLayout
        title="Offer Unobtainable"
        description="We couldn't retrieve this offer details."
        sidebarTitle="Customer"
        links={sidebarLinks}
      >
        <Card className="max-w-md mx-auto mt-10 text-center p-8">
          <CardContent className="space-y-4">
            <span className="text-5xl block">⚠️</span>
            <CardTitle>Offer Expired or Disabled</CardTitle>
            <CardDescription>
              This promotion might have reached its end date, been deactivated by the owner, or does not exist.
            </CardDescription>
            <Button onClick={() => router.push("/dashboard")}>Back to Finder</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const isFav = favorites.includes(offer.offerId);

  return (
    <DashboardLayout
      title="Offer Details"
      description="Claim this promotional deal in-store."
      sidebarTitle="Customer"
      links={sidebarLinks}
    >
      {/* Custom Toast Alert */}
      {toast.visible && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl px-5 py-3 shadow-lg transition-all duration-300 transform translate-y-0 opacity-100 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          <span className="text-xl font-bold">
            {toast.type === "success" ? "✓" : "⚠"}
          </span>
          <p className="text-sm font-semibold">{toast.message}</p>
        </div>
      )}

      <div className="space-y-6 max-w-4xl">
        {/* Navigation back and favorites/share controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            ← Back
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShare} className="flex items-center gap-1">
              📤 Share
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
        </div>

        {/* Offer Main Info Card */}
        <Card className="overflow-hidden">
          {/* Banner */}
          <div className="relative h-64 sm:h-80 bg-slate-100 flex items-center justify-center border-b overflow-hidden shadow-inner">
            {offer.image ? (
              <img src={offer.image} alt={offer.title} className="object-cover h-full w-full" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <span className="text-6xl">🏷️</span>
                <span className="text-sm font-semibold">No Banner Image</span>
              </div>
            )}

            {/* Type Overlay */}
            <div className="absolute bottom-4 right-4 bg-brand-600 text-white text-sm font-extrabold px-3 py-1.5 rounded-lg shadow-lg">
              {offer.offerType === "Percentage"
                ? `${offer.discountValue}% OFF`
                : offer.offerType === "Flat Discount"
                ? `Flat $${offer.discountValue} OFF`
                : `${offer.offerType}`}
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Header info */}
            <div>
              <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded uppercase tracking-wider">
                {offer.offerType}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{offer.title}</h2>
              <p className="text-slate-600 text-sm mt-3 whitespace-pre-wrap leading-relaxed">{offer.description}</p>
            </div>

            {/* Coupon and Validity Grid */}
            <div className="grid gap-4 sm:grid-cols-2 border-t border-b py-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Validity Interval</span>
                <p className="text-sm font-bold text-slate-800">
                  {formatDate(offer.startDate)} – {formatDate(offer.endDate)}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Coupon Code</span>
                {offer.couponCode ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono font-bold text-sm bg-slate-100 border border-slate-200 px-3 py-1 rounded-md text-slate-800 tracking-wider">
                      {offer.couponCode}
                    </span>
                    <button
                      onClick={copyCouponCode}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                    >
                      Copy 📋
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic mt-1">No coupon code required. Show this page to redeem.</p>
                )}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Terms & Conditions</h4>
              <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap leading-normal">
                {offer.termsAndConditions || "No special terms specified."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Parent Shop Details Card */}
        <Card className="grid gap-6 md:grid-cols-12 overflow-hidden p-6 items-start">
          <div className="md:col-span-7 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-lg border-b pb-2 flex items-center gap-2">
              <span>🏪</span> Shop Information
            </h3>
            
            <div className="flex gap-4">
              <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center border overflow-hidden shrink-0 shadow-inner">
                {shop.logo ? (
                  <img src={shop.logo} alt={shop.shopName} className="object-cover h-full w-full" />
                ) : (
                  <span className="text-2xl">🏪</span>
                )}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  <Link href={`/dashboard/shop/${shop.shopId}`} className="hover:underline hover:text-brand-600">
                    {shop.shopName}
                  </Link>
                </h4>
                <p className="text-slate-500 text-xs mt-0.5">{shop.category}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 pt-2 text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-400 block uppercase tracking-wider">Phone</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{shop.phone}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase tracking-wider">Hours</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">🕒 {shop.openingTime} - {shop.closingTime}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-bold text-slate-400 block uppercase tracking-wider font-semibold">Address</span>
                <span className="text-slate-900 mt-0.5 block">{shop.address}, {shop.city}, {shop.state} - {shop.pincode}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <span className="text-xs font-semibold text-slate-600">
                📍 Distance: {distance !== null ? `${distance.toFixed(1)} km` : "Unavailable"}
              </span>

              <a
                href={getDirectionsLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow"
              >
                🗺️ Get Directions
              </a>
            </div>
          </div>

          {/* Embedded Google Map */}
          <div className="md:col-span-5 w-full h-[220px] rounded-xl border border-slate-200 overflow-hidden shadow-inner">
            {!mapsLoaded ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 gap-2">
                <LoadingSpinner />
                <span className="text-xs text-slate-400 font-semibold">Loading Map...</span>
              </div>
            ) : (
              <div ref={mapRef} className="w-full h-full" />
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
