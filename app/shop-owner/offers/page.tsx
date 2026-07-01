"use client";

import { useEffect, useState, useTransition, ChangeEvent, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { shopsService } from "@/services/shops.service";
import { offersService } from "@/services/offers.service";
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
import { validateOfferForm, OfferFormValues } from "@/lib/validators/offer";
import type { Shop } from "@/types/shop";
import type { Offer, OfferType } from "@/types/offer";
import Link from "next/link";

const sidebarLinks = [
  { label: "Overview", href: "/shop-owner", icon: "📊" },
  { label: "My Shop", href: "/shop-owner/shop", icon: "🏪" },
  { label: "Offers", href: "/shop-owner/offers", icon: "🏷️" },
  { label: "Reviews", href: "/shop-owner/reviews", icon: "⭐" },
  { label: "Analytics", href: "/shop-owner/analytics", icon: "📈" },
];

const offerTypes: OfferType[] = [
  "Percentage",
  "Flat Discount",
  "Buy One Get One",
  "Cashback",
  "Free Gift",
  "Combo",
];

interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

export default function OffersPage() {
  const { firebaseUser } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isPending, startTransition] = useTransition();

  // Search, Filter, Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "featured">("all");
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "discount">("latest");

  // Form state
  const [formValues, setFormValues] = useState<OfferFormValues>({
    title: "",
    description: "",
    offerType: "",
    discountValue: "",
    couponCode: "",
    image: null,
    startDate: "",
    endDate: "",
    termsAndConditions: "",
    active: true,
    featured: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Delete Confirmation Modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Toast notification state
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
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.visible]);

  // Load shop profile and offers
  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    async function loadData() {
      try {
        const shopProfile = await shopsService.getShopByOwner(uid);
        if (shopProfile) {
          setShop(shopProfile);
          const shopOffers = await offersService.getOffersByShop(shopProfile.shopId, uid);
          setOffers(shopOffers);
        }
      } catch (err: any) {
        console.error("Error loading offers dashboard:", err);
        showToast("Failed to load dashboard data.", "error");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [firebaseUser]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: checked }));
  };

  const handleBannerChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const openCreateMode = () => {
    setSelectedOffer(null);
    setIsEditing(true);
    setErrors({});
    setBannerFile(null);
    setBannerPreview(null);
    setFormValues({
      title: "",
      description: "",
      offerType: "",
      discountValue: "",
      couponCode: "",
      image: null,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      termsAndConditions: "",
      active: true,
      featured: false,
    });
  };

  const openEditMode = (offer: Offer) => {
    setSelectedOffer(offer);
    setIsEditing(true);
    setErrors({});
    setBannerFile(null);
    setBannerPreview(null);

    const startStr = (offer.startDate as any)?.toDate
      ? (offer.startDate as any).toDate().toISOString().split("T")[0]
      : new Date(offer.startDate as any).toISOString().split("T")[0];
    const endStr = (offer.endDate as any)?.toDate
      ? (offer.endDate as any).toDate().toISOString().split("T")[0]
      : new Date(offer.endDate as any).toISOString().split("T")[0];

    setFormValues({
      title: offer.title,
      description: offer.description,
      offerType: offer.offerType,
      discountValue: String(offer.discountValue),
      couponCode: offer.couponCode || "",
      image: offer.image,
      startDate: startStr,
      endDate: endStr,
      termsAndConditions: offer.termsAndConditions || "",
      active: offer.active,
      featured: offer.featured || false,
    });
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setSelectedOffer(null);
    setBannerFile(null);
    setBannerPreview(null);
    setErrors({});
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !shop) return;

    const validationErrors = validateOfferForm(formValues);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast("Please correct the errors in the form.", "error");
      return;
    }

    startTransition(async () => {
      try {
        let uploadedImageUrl = formValues.image;
        if (bannerFile) {
          uploadedImageUrl = await offersService.uploadOfferImage(firebaseUser.uid, bannerFile);
        }

        const offerData = {
          shopId: shop.shopId,
          ownerId: firebaseUser.uid,
          title: formValues.title.trim(),
          description: formValues.description.trim(),
          offerType: formValues.offerType as OfferType,
          discountValue: Number(formValues.discountValue),
          couponCode: formValues.couponCode.trim() || undefined,
          image: uploadedImageUrl,
          startDate: new Date(formValues.startDate),
          endDate: new Date(formValues.endDate),
          termsAndConditions: formValues.termsAndConditions.trim(),
          active: formValues.active,
          featured: formValues.featured,
        };

        if (selectedOffer) {
          await offersService.updateOffer(selectedOffer.offerId, offerData);
          setOffers((prev) =>
            prev.map((o) =>
              o.offerId === selectedOffer.offerId
                ? ({ ...o, ...offerData, updatedAt: new Date() } as any)
                : o
            )
          );
          showToast("Offer updated successfully!", "success");
        } else {
          const created = await offersService.createOffer(offerData);
          setOffers((prev) => [created, ...prev]);
          showToast("Offer published successfully!", "success");
        }

        setIsEditing(false);
        setSelectedOffer(null);
        setBannerFile(null);
        setBannerPreview(null);
      } catch (err: any) {
        console.error("Error saving offer:", err);
        showToast(err.message || "Failed to save offer. Please try again.", "error");
      }
    });
  };

  const handleDeleteClick = (offerId: string) => {
    setDeleteConfirmId(offerId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await offersService.deleteOffer(deleteConfirmId);
      setOffers((prev) => prev.filter((o) => o.offerId !== deleteConfirmId));
      showToast("Offer deleted successfully.", "success");
    } catch (err: any) {
      console.error("Error deleting offer:", err);
      showToast("Failed to delete offer. Please try again.", "error");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // Helper date formatter
  const formatDate = (ts: any) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const checkIsExpired = (endDateTs: any) => {
    const end = endDateTs?.toDate ? endDateTs.toDate() : new Date(endDateTs);
    // strip time for date-only comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return today > end;
  };

  // Summary logic
  const totalCount = offers.length;
  const activeCount = offers.filter((o) => o.active && !checkIsExpired(o.endDate)).length;
  const expiredCount = offers.filter((o) => checkIsExpired(o.endDate)).length;
  const featuredCount = offers.filter((o) => o.featured).length;

  // Filter & Sort implementation
  const filteredAndSortedOffers = offers
    .filter((o) => {
      const matchesSearch = o.title.toLowerCase().includes(searchQuery.toLowerCase());
      const isExpired = checkIsExpired(o.endDate);
      const isActive = o.active && !isExpired;

      let matchesFilter = true;
      if (statusFilter === "active") {
        matchesFilter = isActive;
      } else if (statusFilter === "expired") {
        matchesFilter = isExpired;
      } else if (statusFilter === "featured") {
        matchesFilter = o.featured || false;
      }

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "latest") {
        const aTime = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : new Date(a.createdAt as any).getTime();
        const bTime = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : new Date(b.createdAt as any).getTime();
        return bTime - aTime;
      } else if (sortBy === "oldest") {
        const aTime = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : new Date(a.createdAt as any).getTime();
        const bTime = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : new Date(b.createdAt as any).getTime();
        return aTime - bTime;
      } else if (sortBy === "discount") {
        return b.discountValue - a.discountValue;
      }
      return 0;
    });

  if (loading) {
    return (
      <DashboardLayout
        title="Offers"
        description="Manage promotional deals and discounts."
        sidebarTitle="Shop Owner"
        links={sidebarLinks}
      >
        <PageLoader />
      </DashboardLayout>
    );
  }

  if (!shop) {
    return (
      <DashboardLayout
        title="Offers"
        description="Manage promotional deals and discounts."
        sidebarTitle="Shop Owner"
        links={sidebarLinks}
      >
        <Card className="max-w-xl mx-auto mt-10">
          <CardHeader className="text-center">
            <span className="text-5xl block mb-4">🏪</span>
            <CardTitle>Create your Shop Profile first</CardTitle>
            <CardDescription>
              You need to complete your shop details profile before you can publish offers to customers.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Link href="/shop-owner/shop">
              <Button>Configure Shop Profile</Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Offers Dashboard"
      description={`Manage promotional deals and discounts for ${shop.shopName}.`}
      sidebarTitle="Shop Owner"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="max-w-md w-full shadow-2xl">
            <CardHeader>
              <CardTitle>Delete Offer?</CardTitle>
              <CardDescription>
                Are you sure you want to delete this offer? This action is permanent and cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                Delete
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {isEditing ? (
        // FORM VIEW
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>{selectedOffer ? "Edit Offer" : "Publish New Offer"}</CardTitle>
            <CardDescription>
              Fill out the details to configure the deal. It will be published immediately to users within your shop's discovery range.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Title */}
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium text-slate-700">
                    Offer Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formValues.title}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                      errors.title ? "border-red-500 focus:border-red-500" : "border-slate-200"
                    }`}
                    placeholder="e.g. Special Weekend discount"
                  />
                  {errors.title && (
                    <p className="text-xs font-medium text-red-500">{errors.title}</p>
                  )}
                </div>

                {/* Offer Type */}
                <div className="space-y-2">
                  <label htmlFor="offerType" className="text-sm font-medium text-slate-700">
                    Offer Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="offerType"
                    name="offerType"
                    value={formValues.offerType}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none bg-white ${
                      errors.offerType ? "border-red-500 focus:border-red-500" : "border-slate-200"
                    }`}
                  >
                    <option value="">Select offer type</option>
                    {offerTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {errors.offerType && (
                    <p className="text-xs font-medium text-red-500">{errors.offerType}</p>
                  )}
                </div>

                {/* Discount Value */}
                <div className="space-y-2">
                  <label htmlFor="discountValue" className="text-sm font-medium text-slate-700">
                    Discount Value <span className="text-red-500">*</span>{" "}
                    <span className="text-xs text-slate-400">
                      (percentage number or amount)
                    </span>
                  </label>
                  <input
                    type="number"
                    id="discountValue"
                    name="discountValue"
                    min="0.1"
                    step="any"
                    value={formValues.discountValue}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                      errors.discountValue ? "border-red-500 focus:border-red-500" : "border-slate-200"
                    }`}
                    placeholder="e.g. 20 (for 20% or Flat 20)"
                  />
                  {errors.discountValue && (
                    <p className="text-xs font-medium text-red-500">{errors.discountValue}</p>
                  )}
                </div>

                {/* Coupon Code */}
                <div className="space-y-2">
                  <label htmlFor="couponCode" className="text-sm font-medium text-slate-700">
                    Coupon Code <span className="text-xs text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="couponCode"
                    name="couponCode"
                    value={formValues.couponCode}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder="e.g. SAVE20"
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <label htmlFor="startDate" className="text-sm font-medium text-slate-700">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formValues.startDate}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                      errors.startDate ? "border-red-500 focus:border-red-500" : "border-slate-200"
                    }`}
                  />
                  {errors.startDate && (
                    <p className="text-xs font-medium text-red-500">{errors.startDate}</p>
                  )}
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <label htmlFor="endDate" className="text-sm font-medium text-slate-700">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formValues.endDate}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                      errors.endDate ? "border-red-500 focus:border-red-500" : "border-slate-200"
                    }`}
                  />
                  {errors.endDate && (
                    <p className="text-xs font-medium text-red-500">{errors.endDate}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium text-slate-700">
                  Offer Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formValues.description}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                    errors.description ? "border-red-500 focus:border-red-500" : "border-slate-200"
                  }`}
                  placeholder="Detail the parameters of your offer"
                />
                {errors.description && (
                  <p className="text-xs font-medium text-red-500">{errors.description}</p>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-2">
                <label htmlFor="termsAndConditions" className="text-sm font-medium text-slate-700">
                  Terms & Conditions <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="termsAndConditions"
                  name="termsAndConditions"
                  rows={2}
                  value={formValues.termsAndConditions}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                    errors.termsAndConditions ? "border-red-500 focus:border-red-500" : "border-slate-200"
                  }`}
                  placeholder="e.g. One redemption per customer. Cannot combine with other codes."
                />
                {errors.termsAndConditions && (
                  <p className="text-xs font-medium text-red-500">{errors.termsAndConditions}</p>
                )}
              </div>

              {/* Checkboxes */}
              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formValues.active}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Mark Active (visible on maps immediately)
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={formValues.featured}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Feature this Offer (premium highlighted card)
                </label>
              </div>

              {/* Banner Upload */}
              <div className="space-y-3 border-t pt-4">
                <label className="text-sm font-medium text-slate-700 block">Offer Banner Image</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="relative h-28 w-48 rounded-lg bg-slate-100 flex items-center justify-center border overflow-hidden">
                    {bannerPreview ? (
                      <img src={bannerPreview} alt="Banner preview" className="object-cover h-full w-full" />
                    ) : formValues.image ? (
                      <img src={formValues.image} alt="Banner" className="object-cover h-full w-full" />
                    ) : (
                      <span className="text-xs text-slate-400">No Banner Uploaded</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 border-t pt-6">
                <Button type="button" variant="outline" onClick={handleCancelClick} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isPending}>
                  {selectedOffer ? "Save Changes" : "Publish Offer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        // DASHBOARD & LIST VIEW
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-brand-50 to-white border-brand-100">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-brand-800 font-semibold text-xs uppercase">Total Offers</CardDescription>
                <CardTitle className="text-3xl text-brand-900 font-bold">{totalCount}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-emerald-800 font-semibold text-xs uppercase">Active Offers</CardDescription>
                <CardTitle className="text-3xl text-emerald-900 font-bold">{activeCount}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-rose-800 font-semibold text-xs uppercase">Expired Offers</CardDescription>
                <CardTitle className="text-3xl text-rose-900 font-bold">{expiredCount}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-amber-800 font-semibold text-xs uppercase">Featured Offers</CardDescription>
                <CardTitle className="text-3xl text-amber-900 font-bold">{featuredCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search offers by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 pl-9 text-sm focus:border-brand-500 focus:outline-none"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none bg-white min-w-[120px]"
              >
                <option value="all">All Offers</option>
                <option value="active">Active Status</option>
                <option value="expired">Expired Status</option>
                <option value="featured">Featured Only</option>
              </select>

              {/* Sorting */}
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none bg-white min-w-[140px]"
              >
                <option value="latest">Sort by: Latest</option>
                <option value="oldest">Sort by: Oldest</option>
                <option value="discount">Sort by: Highest Value</option>
              </select>
            </div>

            <Button onClick={openCreateMode} className="w-full md:w-auto shadow-sm">
              Create New Offer
            </Button>
          </div>

          {/* List display grid */}
          {filteredAndSortedOffers.length === 0 ? (
            <Card className="text-center p-12">
              <CardContent className="space-y-4">
                <span className="text-5xl block">🏷️</span>
                <CardTitle className="text-xl">No offers found</CardTitle>
                <CardDescription>
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search query or filters to show results."
                    : "You haven't published any offers yet. Click 'Create New Offer' to get started."}
                </CardDescription>
                {!searchQuery && statusFilter === "all" && (
                  <Button onClick={openCreateMode} className="mt-2">
                    Publish First Offer
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedOffers.map((offer) => {
                const isExpired = checkIsExpired(offer.endDate);
                return (
                  <Card
                    key={offer.offerId}
                    className={`flex flex-col overflow-hidden h-full transition-all duration-300 hover:shadow-md ${
                      offer.featured ? "border-brand-300 ring-2 ring-brand-100" : ""
                    }`}
                  >
                    {/* Card Banner */}
                    <div className="relative h-40 bg-slate-100 border-b overflow-hidden flex items-center justify-center">
                      {offer.image ? (
                        <img
                          src={offer.image}
                          alt={offer.title}
                          className="object-cover h-full w-full hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-slate-400">
                          <span className="text-4xl">🏷️</span>
                          <span className="text-xs">No Banner Image</span>
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {offer.featured && (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-500/20 shadow-sm">
                            ★ Featured
                          </span>
                        )}
                        {isExpired ? (
                          <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-bold text-red-800 ring-1 ring-inset ring-red-500/20 shadow-sm">
                            Expired
                          </span>
                        ) : offer.active ? (
                          <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800 ring-1 ring-inset ring-emerald-500/20 shadow-sm">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-800 ring-1 ring-inset ring-slate-500/20 shadow-sm">
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Type & Discount Overlay */}
                      <div className="absolute bottom-3 right-3 bg-slate-900/90 text-white rounded-lg px-2.5 py-1 text-xs font-bold shadow-md">
                        {offer.offerType === "Percentage"
                          ? `${offer.discountValue}% OFF`
                          : offer.offerType === "Flat Discount"
                          ? `Flat $${offer.discountValue} OFF`
                          : `${offer.offerType}`}
                      </div>
                    </div>

                    {/* Card Content */}
                    <CardContent className="p-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-lg font-bold line-clamp-1 text-slate-900">
                          {offer.title}
                        </CardTitle>
                        <p className="text-slate-600 text-sm line-clamp-2 min-h-[40px]">
                          {offer.description}
                        </p>
                        
                        {offer.couponCode && (
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Code</span>
                            <span className="text-xs font-mono font-bold text-slate-800">{offer.couponCode}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 pt-4 border-t mt-4">
                        {/* Dates */}
                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                          <span>Start: {formatDate(offer.startDate)}</span>
                          <span>End: {formatDate(offer.endDate)}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => openEditMode(offer)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteClick(offer.offerId)}
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
