"use client";

import { useEffect, useState, useRef, useTransition, useMemo } from "react";
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

const categoryOptions = [
  "All",
  "Groceries",
  "Restaurants",
  "Fashion & Apparel",
  "Electronics",
  "Pharmacy & Health",
  "Services",
  "Others",
];

const offerTypeOptions = [
  "All",
  "Percentage",
  "Flat Discount",
  "Buy One Get One",
  "Cashback",
  "Free Gift",
  "Combo",
];

export default function CustomerDashboardPage() {
  const { firebaseUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);

  // Firestore DB states
  const [shops, setShops] = useState<Shop[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteOffers, setFavoriteOffers] = useState<string[]>([]);

  // Geolocation states
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locating, setLocating] = useState(false);

  // Manual location search fallback
  const [manualCity, setManualCity] = useState("");
  const [manualPincode, setManualPincode] = useState("");
  const [manualActive, setManualActive] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRadius, setSelectedRadius] = useState<number>(5); // default 5 km
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedOfferType, setSelectedOfferType] = useState("All");
  const [sortBy, setSortBy] = useState<"nearest" | "discount" | "recent">("nearest");
  const [viewTab, setViewTab] = useState<"shops" | "offers">("shops");

  // Google Maps
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const mapsLoaded = useGoogleMapsScript(apiKey);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Toggle favorite transitions
  const [isPending, startTransition] = useTransition();

  // Load user location on start
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationDenied(true);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationDenied(false);
        setManualActive(false);
        setLocating(false);
      },
      (error) => {
        console.warn("Geolocation permission error:", error);
        setLocationDenied(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Fetch verified shops and active offers from Firestore
  useEffect(() => {
    if (!firebaseUser) return;

    async function loadData() {
      try {
        // Fetch favorites lists
        const favsList = await usersService.getFavoriteShops(firebaseUser.uid);
        setFavorites(favsList);

        const favOffers = await usersService.getFavoriteOffers(firebaseUser.uid);
        setFavoriteOffers(favOffers);

        // Load all shops
        const shopsRef = shopsService.getCollectionRef();
        const { getDocs } = await import("firebase/firestore");
        const shopSnap = await getDocs(shopsRef);
        const allShops = shopSnap.docs.map((doc) => doc.data() as Shop);
        // Only verified shops
        setShops(allShops.filter((s) => s.verified === true));

        // Load all active offers
        const offersRef = offersService.getCollectionRef();
        const offerSnap = await getDocs(offersRef);
        const allOffers = offerSnap.docs.map((doc) => doc.data() as Offer);
        
        // Strip offers that are expired
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const activeOffers = allOffers.filter((o) => {
          const end = o.endDate?.toDate ? o.endDate.toDate() : new Date(o.endDate);
          end.setHours(0, 0, 0, 0);
          return o.active === true && end >= today;
        });
        setOffers(activeOffers);
      } catch (err) {
        console.error("Error loading customer dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [firebaseUser]);

  // Handle manual city / pincode search fallback
  const handleManualSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!manualCity.trim() && !manualPincode.trim()) return;
    setManualActive(true);
  };

  const clearManualSearch = () => {
    setManualCity("");
    setManualPincode("");
    setManualActive(false);
    requestLocation();
  };

  // Calculate coordinates center or fallbacks
  const mapCenter = useMemo(() => {
    if (userLocation) {
      return { lat: userLocation.latitude, lng: userLocation.longitude };
    }
    // Default fallback (e.g. Bangalore center)
    return { lat: 12.9716, lng: 77.5946 };
  }, [userLocation]);

  // Filter and compute distance for shops
  const processedShops = useMemo(() => {
    return shops
      .map((shop) => {
        let distance = 99999;
        if (userLocation && shop.latitude && shop.longitude) {
          distance = calculateDistance(
            { latitude: userLocation.latitude, longitude: userLocation.longitude },
            { latitude: shop.latitude, longitude: shop.longitude }
          );
        }
        return { ...shop, distance };
      })
      .filter((shop) => {
        // Category Filter
        if (selectedCategory !== "All" && shop.category !== selectedCategory) {
          return false;
        }

        // Search Filter (Shop name, Category, City, Pincode, or any matching Offer Title)
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchName = shop.shopName.toLowerCase().includes(query);
          const matchCat = shop.category.toLowerCase().includes(query);
          const matchCity = shop.city.toLowerCase().includes(query);
          const matchPin = shop.pincode.toLowerCase().includes(query);
          
          const shopOffers = offers.filter((o) => o.shopId === shop.shopId);
          const matchOffer = shopOffers.some((o) => o.title.toLowerCase().includes(query));

          if (!matchName && !matchCat && !matchCity && !matchPin && !matchOffer) {
            return false;
          }
        }

        // Manual Location Fallback Filter
        if (manualActive) {
          const cityQuery = manualCity.trim().toLowerCase();
          const pinQuery = manualPincode.trim().toLowerCase();
          
          if (cityQuery && !shop.city.toLowerCase().includes(cityQuery)) {
            return false;
          }
          if (pinQuery && !shop.pincode.toLowerCase().includes(pinQuery)) {
            return false;
          }
        } else if (userLocation) {
          // Geolocation Radius Filter (only apply if browser geolocation succeeded)
          if (shop.distance > selectedRadius) {
            return false;
          }
        }

        return true;
      });
  }, [shops, offers, userLocation, selectedCategory, searchQuery, selectedRadius, manualCity, manualPincode, manualActive]);

  // Associate processed shops with their active offers
  const processedOffers = useMemo(() => {
    return offers
      .map((offer) => {
        const parentShop = shops.find((s) => s.shopId === offer.shopId);
        let distance = 99999;
        if (userLocation && parentShop?.latitude && parentShop?.longitude) {
          distance = calculateDistance(
            { latitude: userLocation.latitude, longitude: userLocation.longitude },
            { latitude: parentShop.latitude, longitude: parentShop.longitude }
          );
        }
        return {
          ...offer,
          shop: parentShop ? { ...parentShop, distance } : undefined,
        };
      })
      .filter((o) => {
        if (!o.shop) return false;

        // Radius filter
        if (!manualActive && userLocation && o.shop.distance > selectedRadius) {
          return false;
        }

        // Category Filter
        if (selectedCategory !== "All" && o.shop.category !== selectedCategory) {
          return false;
        }

        // Offer Type Filter
        if (selectedOfferType !== "All" && o.offerType !== selectedOfferType) {
          return false;
        }

        // Search Filter (Shop Name, Offer Title, Category, City)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchOfferName = o.title.toLowerCase().includes(q);
          const matchShopName = o.shop.shopName.toLowerCase().includes(q);
          const matchCategory = o.shop.category.toLowerCase().includes(q);
          const matchCity = o.shop.city.toLowerCase().includes(q);
          if (!matchOfferName && !matchShopName && !matchCategory && !matchCity) {
            return false;
          }
        }

        // Manual Location Search
        if (manualActive) {
          const cityQuery = manualCity.trim().toLowerCase();
          const pinQuery = manualPincode.trim().toLowerCase();
          if (cityQuery && !o.shop.city.toLowerCase().includes(cityQuery)) {
            return false;
          }
          if (pinQuery && !o.shop.pincode.toLowerCase().includes(pinQuery)) {
            return false;
          }
        }

        return true;
      }) as (Offer & { shop: Shop & { distance: number } })[];
  }, [offers, shops, userLocation, selectedRadius, selectedCategory, selectedOfferType, searchQuery, manualActive, manualCity, manualPincode]);

  // Sort shops
  const sortedShops = useMemo(() => {
    return [...processedShops].sort((a, b) => {
      if (sortBy === "nearest") {
        return a.distance - b.distance;
      }
      if (sortBy === "recent") {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      }
      return 0;
    });
  }, [processedShops, sortBy]);

  // Sort offers
  const sortedOffers = useMemo(() => {
    return [...processedOffers].sort((a, b) => {
      if (sortBy === "nearest") {
        return a.shop.distance - b.shop.distance;
      }
      if (sortBy === "discount") {
        return b.discountValue - a.discountValue;
      }
      if (sortBy === "recent") {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      }
      return 0;
    });
  }, [processedOffers, sortBy]);

  const handleToggleOfferFavorite = (offerId: string) => {
    if (!firebaseUser) return;

    const isFav = favoriteOffers.includes(offerId);
    startTransition(async () => {
      try {
        if (isFav) {
          await usersService.removeFavoriteOffer(firebaseUser.uid, offerId);
          setFavoriteOffers((prev) => prev.filter((id) => id !== offerId));
        } else {
          await usersService.addFavoriteOffer(firebaseUser.uid, offerId);
          setFavoriteOffers((prev) => [...prev, offerId]);
        }
      } catch (err) {
        console.error("Error toggling favorite offer:", err);
      }
    });
  };

  // Initialize Map Instance
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || mapInstance) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: mapCenter,
      zoom: userLocation ? 14 : 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: "poi.business",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    setMapInstance(map);
  }, [mapsLoaded, mapCenter, userLocation, mapInstance]);

  // Pan map when center changes
  useEffect(() => {
    if (mapInstance) {
      mapInstance.panTo(mapCenter);
      mapInstance.setZoom(userLocation ? 14 : 12);
    }
  }, [mapCenter, mapInstance, userLocation]);

  // Render / Update Markers on Map
  useEffect(() => {
    if (!mapInstance || !mapsLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // User position marker
    if (userLocation) {
      const userMarker = new window.google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map: mapInstance,
        title: "Your Location",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeWeight: 3,
          strokeColor: "#ffffff",
        },
      });
      markersRef.current.push(userMarker);
    }

    // Shop markers
    processedShops.forEach((shop) => {
      if (!shop.latitude || !shop.longitude) return;

      const marker = new window.google.maps.Marker({
        position: { lat: shop.latitude, lng: shop.longitude },
        map: mapInstance,
        title: shop.shopName,
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        },
      });

      const shopOffers = offers.filter((o) => o.shopId === shop.shopId).length;

      // Custom popup info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="font-family: sans-serif; padding: 6px; min-width: 160px;">
            <h4 style="margin: 0 0 4px; font-weight: 700; color: #1e293b;">${shop.shopName}</h4>
            <p style="margin: 0 0 6px; font-size: 11px; color: #64748b;">${shop.category}</p>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 8px;">
              <span>📍 ${shop.distance < 999 ? `${shop.distance.toFixed(1)} km` : "N/A"}</span>
              <span style="background: #eff6ff; color: #1d4ed8; padding: 1px 6px; border-radius: 4px;">🏷️ ${shopOffers} Offers</span>
            </div>
            <a href="/dashboard/shop/${shop.shopId}" style="display: block; text-align: center; text-decoration: none; background: #2563eb; color: #ffffff; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;">View Details</a>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open(mapInstance, marker);
      });

      markersRef.current.push(marker);
    });
  }, [mapInstance, processedShops, mapsLoaded, userLocation, offers]);

  // Toggle favorite helper
  const handleToggleFavorite = (shopId: string) => {
    if (!firebaseUser) return;
    
    const isFav = favorites.includes(shopId);
    startTransition(async () => {
      try {
        if (isFav) {
          await usersService.removeFavoriteShop(firebaseUser.uid, shopId);
          setFavorites((prev) => prev.filter((id) => id !== shopId));
        } else {
          await usersService.addFavoriteShop(firebaseUser.uid, shopId);
          setFavorites((prev) => [...prev, shopId]);
        }
      } catch (err) {
        console.error("Error updating favorite shop status:", err);
      }
    });
  };

  const getDirectionsLink = (shop: Shop) => {
    if (!shop.latitude || !shop.longitude) return "#";
    return `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
  };

  return (
    <DashboardLayout
      title="Discover Deals"
      description="Find shops and local discounts close to your live position."
      sidebarTitle="Customer"
      links={sidebarLinks}
    >
      {/* Geolocation Denial warning block */}
      {locationDenied && !manualActive && (
        <Card className="border-amber-200 bg-amber-50/50 mb-6">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
            <div>
              <h4 className="font-semibold text-amber-900 text-sm flex items-center gap-1.5">
                <span>📍</span> Location services are disabled
              </h4>
              <p className="text-xs text-amber-700 mt-1">
                Please enable browser geolocation permissions, or search manually by entering your City or Pincode below.
              </p>
            </div>
            <form onSubmit={handleManualSearch} className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="City"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500 w-full sm:w-28"
              />
              <input
                type="text"
                placeholder="Pincode"
                value={manualPincode}
                onChange={(e) => setManualPincode(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500 w-full sm:w-24"
              />
              <Button type="submit" size="sm" className="w-full sm:w-auto text-xs py-1.5">
                Search
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Manual active search badge */}
      {manualActive && (
        <div className="flex items-center justify-between bg-brand-50 border border-brand-100 rounded-xl p-3.5 mb-6 text-sm">
          <span className="text-brand-800 font-medium">
            Filtering manually by:{" "}
            {manualCity && `City: "${manualCity}"`}{" "}
            {manualPincode && `Pincode: "${manualPincode}"`}
          </span>
          <button
            onClick={clearManualSearch}
            className="text-xs font-semibold text-brand-600 hover:underline hover:text-brand-700"
          >
            Clear Search & Retry Geolocation ✕
          </button>
        </div>
      )}

      {/* Controls: Search, Tabs & Sorting */}
      <div className="grid gap-4 md:grid-cols-3 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by shop name, category, offer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 pl-9 text-sm focus:border-brand-500 focus:outline-none"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
        </div>

        {/* Filters: Radius / Tab Toggle */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              onClick={() => setViewTab("shops")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewTab === "shops" ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Shops
            </button>
            <button
              onClick={() => setViewTab("offers")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewTab === "offers" ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Offers
            </button>
          </div>

          {!manualActive && userLocation && (
            <select
              value={selectedRadius}
              onChange={(e) => setSelectedRadius(Number(e.target.value))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-brand-500"
            >
              <option value="1">1 km Radius</option>
              <option value="2">2 km Radius</option>
              <option value="5">5 km Radius</option>
              <option value="10">10 km Radius</option>
              <option value="20">20 km Radius</option>
            </select>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-brand-500"
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>

          {viewTab === "offers" && (
            <select
              value={selectedOfferType}
              onChange={(e) => setSelectedOfferType(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-brand-500"
            >
              {offerTypeOptions.map((type) => (
                <option key={type} value={type}>
                  Type: {type}
                </option>
              ))}
            </select>
          )}

          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-brand-500"
          >
            <option value="nearest">Sort by: Nearest</option>
            {viewTab === "offers" && <option value="discount">Sort by: Discount</option>}
            <option value="recent">Sort by: Newest</option>
          </select>
        </div>
      </div>

      {/* Main split-screen panel */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Listings */}
        <div className="lg:col-span-7 space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          {loading || locating ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse flex p-4 gap-4 bg-slate-50/50">
                  <div className="h-16 w-16 bg-slate-200 rounded-lg shrink-0"></div>
                  <div className="space-y-2.5 flex-1">
                    <div className="h-5 bg-slate-200 rounded w-2/3"></div>
                    <div className="h-3.5 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-200 rounded w-full mt-3"></div>
                  </div>
                </Card>
              ))}
            </div>
          ) : viewTab === "shops" ? (
            // SHOPS LISTING
            sortedShops.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent className="space-y-3">
                  <span className="text-4xl block">🏪</span>
                  <CardTitle className="text-lg">No nearby shops found</CardTitle>
                  <CardDescription>
                    Try expanding your search radius, selecting a different category, or searching manually.
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              sortedShops.map((shop) => {
                const isFav = favorites.includes(shop.shopId);
                const activeOfferCount = offers.filter((o) => o.shopId === shop.shopId).length;
                return (
                  <Card key={shop.shopId} className="hover:shadow-md transition-shadow relative overflow-hidden">
                    <CardContent className="p-4 flex gap-4">
                      {/* Logo */}
                      <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center border overflow-hidden shrink-0 shadow-inner">
                        {shop.logo ? (
                          <img src={shop.logo} alt={shop.shopName} className="object-cover h-full w-full" />
                        ) : (
                          <span className="text-xl">🏪</span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-base truncate pr-6">{shop.shopName}</h4>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">{shop.category}</p>
                        <p className="text-slate-400 text-xs truncate mt-1">📍 {shop.address}, {shop.city}</p>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                            <span>📍 {shop.distance < 999 ? `${shop.distance.toFixed(1)} km` : "N/A"}</span>
                            <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                              🏷️ {activeOfferCount} Active Offers
                            </span>
                          </div>
                          
                          <Link href={`/dashboard/shop/${shop.shopId}`} className="text-xs font-bold text-brand-600 hover:text-brand-700">
                            View Shop Details →
                          </Link>
                        </div>
                      </div>

                      {/* Favorite button top right */}
                      <button
                        onClick={() => handleToggleFavorite(shop.shopId)}
                        disabled={isPending}
                        className="absolute top-3 right-3 text-lg hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                      >
                        {isFav ? "❤️" : "🤍"}
                      </button>
                    </CardContent>
                  </Card>
                );
              })
            )
          ) : (
            // OFFERS LISTING
            sortedOffers.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent className="space-y-3">
                  <span className="text-4xl block">🏷️</span>
                  <CardTitle className="text-lg">No active offers nearby</CardTitle>
                  <CardDescription>
                    There are no promotions in your range at the moment. Try adjusting your filters.
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              sortedOffers.map((offer) => {
                const validUntil = formatDate(offer.endDate);
                const isOfferFav = favoriteOffers.includes(offer.offerId);
                return (
                  <Card key={offer.offerId} className="overflow-hidden hover:shadow-md transition-shadow relative">
                    <div className="flex flex-col sm:flex-row h-full">
                      {/* Banner Image */}
                      <div className="sm:w-1/3 h-32 sm:h-auto bg-slate-100 border-b sm:border-b-0 sm:border-r overflow-hidden flex items-center justify-center shrink-0">
                        {offer.image ? (
                          <img src={offer.image} alt={offer.title} className="object-cover h-full w-full" />
                        ) : (
                          <span className="text-3xl text-slate-300">🏷️</span>
                        )}
                      </div>

                      {/* Card Content */}
                      <CardContent className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-brand-50 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                {offer.offerType === "Percentage" ? `${offer.discountValue}% OFF` : offer.offerType}
                              </span>
                              <button
                                onClick={() => handleToggleOfferFavorite(offer.offerId)}
                                disabled={isPending}
                                className="text-base hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                              >
                                {isOfferFav ? "❤️" : "🤍"}
                              </button>
                            </div>
                            <span className="text-xs text-slate-500 font-semibold">
                              📍 {offer.shop.distance < 999 ? `${offer.shop.distance.toFixed(1)} km` : "N/A"}
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 text-base mt-1.5">{offer.title}</h4>
                          <p className="text-slate-500 text-xs mt-0.5 font-medium">🏪 {offer.shop.shopName} ({offer.shop.category})</p>
                          <p className="text-slate-600 text-xs mt-2 line-clamp-2">{offer.description}</p>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t text-[11px] text-slate-500 font-medium">
                          <span>Valid Until: {validUntil}</span>
                          <div className="flex gap-2">
                            <Link href={`/dashboard/offer/${offer.offerId}`}>
                              <Button size="sm" variant="outline" className="text-[11px] h-7 px-2">
                                Details →
                              </Button>
                            </Link>
                            <a
                              href={getDirectionsLink(offer.shop)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              🗺️ Navigate
                            </a>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })
            )
          )}
        </div>

        {/* Right Column: Google Map Container */}
        <div className="lg:col-span-5 w-full h-[300px] lg:h-[80vh] rounded-xl border border-slate-200 overflow-hidden shadow-inner sticky top-6">
          {!mapsLoaded ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 gap-3">
              <LoadingSpinner />
              <span className="text-xs text-slate-400 font-medium">Loading Google Map...</span>
            </div>
          ) : (
            <div ref={mapRef} className="w-full h-full" />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
