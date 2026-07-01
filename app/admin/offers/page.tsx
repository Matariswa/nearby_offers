"use client";

import { useEffect, useState, useTransition } from "react";
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
import { offersService } from "@/services/offers.service";
import { shopsService } from "@/services/shops.service";
import type { Offer, OfferType } from "@/types/offer";
import type { Shop } from "@/types/shop";

const sidebarLinks = [
  { label: "Overview", href: "/admin", icon: "📊" },
  { label: "Users", href: "/admin/users", icon: "👤" },
  { label: "Shops", href: "/admin/shops", icon: "🏪" },
  { label: "Offers", href: "/admin/offers", icon: "🏷️" },
  { label: "Reviews", href: "/admin/reviews", icon: "⭐" },
  { label: "Import Shops", href: "/admin/import", icon: "📥" },
];

const offerTypes = [
  "Percentage",
  "Flat Discount",
  "Buy One Get One",
  "Cashback",
  "Free Gift",
  "Combo",
];

export default function AdminOffersPage() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired">("all");

  // Selection states for popup dialogs
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);

  // Edit Form Fields
  const [formValues, setFormValues] = useState({
    title: "",
    description: "",
    offerType: "" as OfferType,
    discountValue: 0,
    couponCode: "",
    termsAndConditions: "",
    active: false,
    featured: false,
  });

  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    try {
      setLoading(true);
      const [allOffers, allShops] = await Promise.all([
        offersService.getAllOffers(),
        shopsService.getAllShops(),
      ]);
      setOffers(allOffers);
      setShops(allShops);
    } catch (err) {
      console.error("Failed to load offers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleFeatured = (offerId: string, currentFeatured: boolean) => {
    startTransition(async () => {
      try {
        const nextFeatured = !currentFeatured;
        await offersService.updateOffer(offerId, { featured: nextFeatured });
        setOffers((prev) =>
          prev.map((o) => (o.offerId === offerId ? { ...o, featured: nextFeatured } : o))
        );
        if (selectedOffer?.offerId === offerId) {
          setSelectedOffer((prev) => (prev ? { ...prev, featured: nextFeatured } : null));
        }
      } catch (err) {
        console.error("Failed to toggle featured status:", err);
      }
    });
  };

  const handleOpenEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormValues({
      title: offer.title,
      description: offer.description,
      offerType: offer.offerType,
      discountValue: offer.discountValue,
      couponCode: offer.couponCode || "",
      termsAndConditions: offer.termsAndConditions,
      active: offer.active,
      featured: offer.featured || false,
    });
  };

  const handleSaveEdit = () => {
    if (!editingOffer) return;

    startTransition(async () => {
      try {
        await offersService.updateOffer(editingOffer.offerId, formValues);
        setOffers((prev) =>
          prev.map((o) =>
            o.offerId === editingOffer.offerId ? { ...o, ...formValues } : o
          )
        );
        setEditingOffer(null);
      } catch (err) {
        console.error("Failed to update offer:", err);
      }
    });
  };

  const handleDeleteOffer = (offerId: string) => {
    startTransition(async () => {
      try {
        await offersService.deleteOffer(offerId);
        setOffers((prev) => prev.filter((o) => o.offerId !== offerId));
        setDeletingOfferId(null);
      } catch (err) {
        console.error("Failed to delete offer:", err);
      }
    });
  };

  const getShopName = (shopId: string) => {
    const s = shops.find((shop) => shop.shopId === shopId);
    return s ? s.shopName : "Unknown Shop";
  };

  // Filter & Search
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredOffers = offers.filter((o) => {
    const parentShopName = getShopName(o.shopId).toLowerCase();
    const matchesSearch =
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parentShopName.includes(searchQuery.toLowerCase());

    const end = (o.endDate as any)?.toDate ? (o.endDate as any).toDate() : new Date(o.endDate as any);
    end.setHours(0, 0, 0, 0);
    const isExpired = end < today;
    const isOfferActive = o.active && !isExpired;

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? isOfferActive
        : !isOfferActive;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (ts: any) => {
    if (!ts) return "N/A";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <DashboardLayout
      title="Offer Management"
      description="Feature promotions, edit values, and moderate platform offers."
      sidebarTitle="Administration"
      links={sidebarLinks}
    >
      <div className="space-y-6">
        {/* Controls Panel */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm justify-between">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by offer title or shop name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 pl-9 text-sm focus:border-brand-500 focus:outline-none"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-brand-500"
            >
              <option value="all">All Offers Status</option>
              <option value="active">Active Only</option>
              <option value="expired">Expired / Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Offers Listing Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <LoadingSpinner className="h-8 w-8 text-brand-600 animate-spin" />
                <span className="text-xs text-slate-400 font-medium">Fetching offers list...</span>
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <span className="text-4xl">🏷️</span>
                <p className="text-sm font-medium">No offers found matching filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-500">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b">
                    <tr>
                      <th className="px-6 py-3.5">Offer Title</th>
                      <th className="px-6 py-3.5">Shop Name</th>
                      <th className="px-6 py-3.5">Discount / Type</th>
                      <th className="px-6 py-3.5">Featured</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredOffers.map((offer) => {
                      const shopName = getShopName(offer.shopId);
                      const end = (offer.endDate as any)?.toDate ? (offer.endDate as any).toDate() : new Date(offer.endDate as any);
                      end.setHours(0, 0, 0, 0);
                      const isExpired = end < today;
                      const isOfferActive = offer.active && !isExpired;

                      return (
                        <tr key={offer.offerId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center border overflow-hidden shrink-0">
                                {offer.image ? (
                                  <img src={offer.image} alt={offer.title} className="object-cover h-full w-full" />
                                ) : (
                                  <span className="text-lg">🏷️</span>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{offer.title}</p>
                                <p className="text-[10px] text-slate-400 font-medium">Expires: {formatDate(offer.endDate)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                            {shopName}
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-brand-50 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                              {offer.offerType === "Percentage"
                                ? `${offer.discountValue}% OFF`
                                : offer.offerType === "Flat Discount"
                                ? `Flat $${offer.discountValue} OFF`
                                : `${offer.offerType}`}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleFeatured(offer.offerId, offer.featured ?? false)}
                              disabled={isPending}
                              className="text-base hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                            >
                              {offer.featured ? "⭐" : "☆"}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            {isOfferActive ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                                {isExpired ? "Expired" : "Inactive"}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 px-2"
                                onClick={() => setSelectedOffer(offer)}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 px-2"
                                onClick={() => handleOpenEdit(offer)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 px-2 border-rose-200 text-rose-600 hover:bg-rose-50"
                                onClick={() => setDeletingOfferId(offer.offerId)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offer Details Modal Overlay */}
        {selectedOffer && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex justify-between items-start border-b pb-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Offer details</CardTitle>
                  <CardDescription>Visual parameters & status indicators.</CardDescription>
                </div>
                <button
                  onClick={() => setSelectedOffer(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
                >
                  ✕
                </button>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  {selectedOffer.image ? (
                    <img
                      src={selectedOffer.image}
                      alt={selectedOffer.title}
                      className="h-16 w-16 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 text-xl font-bold border">
                      🏷️
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-lg text-slate-900">{selectedOffer.title}</h4>
                    <p className="text-sm text-slate-500 font-medium">🏪 {getShopName(selectedOffer.shopId)}</p>
                    <div className="mt-1 flex gap-1.5 items-center">
                      <span className="bg-brand-50 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {selectedOffer.offerType === "Percentage"
                          ? `${selectedOffer.discountValue}% OFF`
                          : selectedOffer.offerType === "Flat Discount"
                          ? `Flat $${selectedOffer.discountValue} OFF`
                          : `${selectedOffer.offerType}`}
                      </span>
                      {selectedOffer.featured && (
                        <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded">
                          Featured ⭐
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-slate-600 text-xs italic bg-slate-50 p-2.5 rounded-lg border">
                  "{selectedOffer.description || "No description provided."}"
                </p>

                <div className="border-t pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Offer ID</span>
                    <span className="font-mono text-xs text-slate-700">{selectedOffer.offerId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coupon Code</span>
                    <span className="text-slate-700 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-xs">{selectedOffer.couponCode || "No Code Needed"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Start Date</span>
                    <span className="text-slate-700 font-medium">{formatDate(selectedOffer.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">End Date</span>
                    <span className="text-slate-700 font-medium">{formatDate(selectedOffer.endDate)}</span>
                  </div>
                  <div className="flex justify-between flex-col gap-1 border-t pt-3 mt-1">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Terms & Conditions</span>
                    <p className="text-slate-600 text-xs mt-0.5 whitespace-pre-wrap">{selectedOffer.termsAndConditions}</p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t gap-2">
                  <Button onClick={() => setSelectedOffer(null)} className="w-full">
                    Close Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Offer Modal Overlay */}
        {editingOffer && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-bold text-slate-900">Edit Offer</CardTitle>
                <CardDescription>Modify offer settings as an administrator.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Offer Title</label>
                  <input
                    type="text"
                    value={formValues.title}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Offer Type</label>
                    <select
                      value={formValues.offerType}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, offerType: e.target.value as OfferType }))}
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm bg-white focus:border-brand-500 focus:outline-none"
                    >
                      {offerTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Discount Value</label>
                    <input
                      type="number"
                      value={formValues.discountValue}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, discountValue: Number(e.target.value) }))}
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Coupon Code</label>
                  <input
                    type="text"
                    value={formValues.couponCode}
                    placeholder="e.g. SAVE20 (Optional)"
                    onChange={(e) => setFormValues((prev) => ({ ...prev, couponCode: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formValues.description}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Terms & Conditions</label>
                  <textarea
                    rows={2}
                    value={formValues.termsAndConditions}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, termsAndConditions: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formValues.active}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, active: e.target.checked }))}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-xs font-medium text-slate-600">Active</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formValues.featured}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, featured: e.target.checked }))}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-xs font-medium text-slate-600">Featured Offer</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setEditingOffer(null)} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={isPending}>
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal Overlay */}
        {deletingOfferId && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-sm w-full shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-900">Delete Offer</CardTitle>
                <CardDescription>This action will permanently delete this offer and remove it from all users' favorite lists.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeletingOfferId(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={() => handleDeleteOffer(deletingOfferId)}
                  disabled={isPending}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  Delete Offer
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
