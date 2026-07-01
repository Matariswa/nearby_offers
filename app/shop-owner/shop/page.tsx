"use client";

import { useEffect, useState, useTransition, ChangeEvent, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { shopsService } from "@/services/shops.service";
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
import { validateShopForm, ShopFormValues } from "@/lib/validators/shop";
import type { Shop } from "@/types/shop";
import Link from "next/link";

const sidebarLinks = [
  { label: "Overview", href: "/shop-owner", icon: "📊" },
  { label: "My Shop", href: "/shop-owner/shop", icon: "🏪" },
  { label: "Offers", href: "/shop-owner/offers", icon: "🏷️" },
  { label: "Reviews", href: "/shop-owner/reviews", icon: "⭐" },
  { label: "Analytics", href: "/shop-owner/analytics", icon: "📈" },
];

const categories = [
  "Groceries",
  "Restaurants",
  "Fashion & Apparel",
  "Electronics",
  "Pharmacy & Health",
  "Services",
  "Others",
];

interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

export default function ShopProfilePage() {
  const { firebaseUser, userProfile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [formValues, setFormValues] = useState<ShopFormValues>({
    shopName: "",
    category: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    openingTime: "",
    closingTime: "",
    description: "",
    logo: null,
    shopImages: [],
    latitude: "",
    longitude: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

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
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.visible]);

  // Load shop profile
  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    async function loadShop() {
      try {
        const data = await shopsService.getShopByOwner(uid);
        if (data) {
          setShop(data);
          setExistingImages(data.shopImages || []);
          setFormValues({
            shopName: data.shopName,
            category: data.category,
            phone: data.phone,
            address: data.address,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            openingTime: data.openingTime,
            closingTime: data.closingTime,
            description: data.description || "",
            logo: data.logo,
            shopImages: data.shopImages || [],
            latitude: data.latitude !== undefined && data.latitude !== 0 ? String(data.latitude) : "",
            longitude: data.longitude !== undefined && data.longitude !== 0 ? String(data.longitude) : "",
          });
        }
      } catch (error: any) {
        console.error("Error loading shop profile:", error);
        showToast("Failed to load shop profile.", "error");
      } finally {
        setLoadingProfile(false);
      }
    }

    loadShop();
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

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleImagesChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setNewImageFiles((prev) => [...prev, ...files]);
      const urls = files.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...urls]);
    }
  };

  const removeNewImage = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setLogoFile(null);
    setLogoPreview(null);
    setNewImageFiles([]);
    setImagePreviews([]);
    if (shop) {
      setExistingImages(shop.shopImages || []);
    }
  };

  const handleCancelClick = () => {
    if (!shop) {
      // If we don't have a shop profile yet, cancel doesn't do anything other than clearing form
      return;
    }
    setIsEditing(false);
    setLogoFile(null);
    setLogoPreview(null);
    setNewImageFiles([]);
    setImagePreviews([]);
    setExistingImages(shop.shopImages || []);
    setFormValues({
      shopName: shop.shopName,
      category: shop.category,
      phone: shop.phone,
      address: shop.address,
      city: shop.city,
      state: shop.state,
      pincode: shop.pincode,
      openingTime: shop.openingTime,
      closingTime: shop.closingTime,
      description: shop.description || "",
      logo: shop.logo,
      shopImages: shop.shopImages || [],
      latitude: shop.latitude !== undefined && shop.latitude !== 0 ? String(shop.latitude) : "",
      longitude: shop.longitude !== undefined && shop.longitude !== 0 ? String(shop.longitude) : "",
    });
    setErrors({});
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    const validationErrors = validateShopForm(formValues);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast("Please correct the errors in the form.", "error");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    startTransition(async () => {
      try {
        let uploadedLogoUrl = formValues.logo;
        if (logoFile) {
          uploadedLogoUrl = await shopsService.uploadLogo(firebaseUser.uid, logoFile);
        }

        const uploadedShopImages: string[] = [...existingImages];
        for (const file of newImageFiles) {
          const url = await shopsService.uploadShopImage(firebaseUser.uid, file);
          uploadedShopImages.push(url);
        }

        const shopData = {
          ownerId: firebaseUser.uid,
          ownerName: userProfile?.name || firebaseUser.displayName || "Shop Owner",
          email: firebaseUser.email || userProfile?.email || "",
          shopName: formValues.shopName.trim(),
          category: formValues.category,
          description: formValues.description.trim(),
          phone: formValues.phone.trim(),
          address: formValues.address.trim(),
          city: formValues.city.trim(),
          state: formValues.state.trim(),
          pincode: formValues.pincode.trim(),
          openingTime: formValues.openingTime,
          closingTime: formValues.closingTime,
          logo: uploadedLogoUrl,
          shopImages: uploadedShopImages,
          latitude: formValues.latitude ? Number(formValues.latitude) : 0,
          longitude: formValues.longitude ? Number(formValues.longitude) : 0,
        };

        if (shop) {
          await shopsService.updateShop(shop.shopId, {
            ...shopData,
            verified: shop.verified,
          });
          const updatedShop: Shop = {
            ...shop,
            ...shopData,
            updatedAt: new Date(),
          };
          setShop(updatedShop);
          showToast("Shop profile updated successfully!", "success");
        } else {
          const createdShop = await shopsService.createShop(shopData);
          setShop(createdShop);
          showToast("Shop profile created successfully!", "success");
        }

        setIsEditing(false);
        setLogoFile(null);
        setLogoPreview(null);
        setNewImageFiles([]);
        setImagePreviews([]);
      } catch (error: any) {
        console.error("Error saving shop profile:", error);
        showToast(error.message || "Failed to save shop profile. Please try again.", "error");
      }
    });
  };

  if (loadingProfile) {
    return (
      <DashboardLayout
        title="My Shop"
        description="Manage your shop profile details"
        sidebarTitle="Shop Owner"
        links={sidebarLinks}
      >
        <PageLoader />
      </DashboardLayout>
    );
  }

  const showForm = !shop || isEditing;

  return (
    <DashboardLayout
      title="My Shop"
      description="Manage your shop profile and publish offers to nearby customers."
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

      {showForm ? (
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>{shop ? "Edit Shop Profile" : "Create Shop Profile"}</CardTitle>
            <CardDescription>
              {shop
                ? "Update your shop details, location, and operational parameters below."
                : "Fill in the required information below to register your shop and start publishing offers."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Shop Name */}
                <div className="space-y-2">
                  <label htmlFor="shopName" className="text-sm font-medium text-slate-700">
                    Shop Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="shopName"
                    name="shopName"
                    value={formValues.shopName}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                      errors.shopName ? "border-red-500 focus:border-red-500" : "border-slate-200"
                    }`}
                    placeholder="Enter shop name"
                  />
                  {errors.shopName && (
                    <p className="text-xs font-medium text-red-500">{errors.shopName}</p>
                  )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium text-slate-700">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formValues.category}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none bg-white ${
                      errors.category ? "border-red-500 focus:border-red-500" : "border-slate-200"
                    }`}
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-xs font-medium text-red-500">{errors.category}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formValues.phone}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                      errors.phone ? "border-red-500 focus:border-red-500" : "border-slate-200"
                    }`}
                    placeholder="Enter shop contact number"
                  />
                  {errors.phone && (
                    <p className="text-xs font-medium text-red-500">{errors.phone}</p>
                  )}
                </div>

                {/* Opening Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="openingTime" className="text-sm font-medium text-slate-700">
                      Opening Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      id="openingTime"
                      name="openingTime"
                      value={formValues.openingTime}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                        errors.openingTime ? "border-red-500 focus:border-red-500" : "border-slate-200"
                      }`}
                    />
                    {errors.openingTime && (
                      <p className="text-xs font-medium text-red-500">{errors.openingTime}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="closingTime" className="text-sm font-medium text-slate-700">
                      Closing Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      id="closingTime"
                      name="closingTime"
                      value={formValues.closingTime}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                        errors.closingTime ? "border-red-500 focus:border-red-500" : "border-slate-200"
                      }`}
                    />
                    {errors.closingTime && (
                      <p className="text-xs font-medium text-red-500">{errors.closingTime}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formValues.description}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  placeholder="Tell customers about your shop, specialties, etc."
                />
              </div>

              {/* Address Fields */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Location & Address</h4>
                
                <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-medium text-slate-700">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formValues.address}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                      errors.address ? "border-red-500 focus:border-red-500" : "border-slate-200"
                    }`}
                    placeholder="Enter building number and street name"
                  />
                  {errors.address && (
                    <p className="text-xs font-medium text-red-500">{errors.address}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label htmlFor="city" className="text-sm font-medium text-slate-700">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formValues.city}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                        errors.city ? "border-red-500 focus:border-red-500" : "border-slate-200"
                      }`}
                      placeholder="Enter city"
                    />
                    {errors.city && (
                      <p className="text-xs font-medium text-red-500">{errors.city}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="state" className="text-sm font-medium text-slate-700">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formValues.state}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                        errors.state ? "border-red-500 focus:border-red-500" : "border-slate-200"
                      }`}
                      placeholder="Enter state"
                    />
                    {errors.state && (
                      <p className="text-xs font-medium text-red-500">{errors.state}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="pincode" className="text-sm font-medium text-slate-700">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="pincode"
                      name="pincode"
                      value={formValues.pincode}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                        errors.pincode ? "border-red-500 focus:border-red-500" : "border-slate-200"
                      }`}
                      placeholder="Enter pincode"
                    />
                    {errors.pincode && (
                      <p className="text-xs font-medium text-red-500">{errors.pincode}</p>
                    )}
                  </div>
                </div>

                {/* Coordinates */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="latitude" className="text-sm font-medium text-slate-700">
                      Latitude <span className="text-xs text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="latitude"
                      name="latitude"
                      value={formValues.latitude}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                        errors.latitude ? "border-red-500 focus:border-red-500" : "border-slate-200"
                      }`}
                      placeholder="e.g. 12.9716"
                    />
                    {errors.latitude && (
                      <p className="text-xs font-medium text-red-500">{errors.latitude}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="longitude" className="text-sm font-medium text-slate-700">
                      Longitude <span className="text-xs text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="longitude"
                      name="longitude"
                      value={formValues.longitude}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ${
                        errors.longitude ? "border-red-500 focus:border-red-500" : "border-slate-200"
                      }`}
                      placeholder="e.g. 77.5946"
                    />
                    {errors.longitude && (
                      <p className="text-xs font-medium text-red-500">{errors.longitude}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Logo Upload */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-semibold text-slate-900">Branding & Media</h4>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="relative h-24 w-24 rounded-lg bg-slate-100 flex items-center justify-center border overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="object-cover h-full w-full" />
                    ) : formValues.logo ? (
                      <img src={formValues.logo} alt="Logo" className="object-cover h-full w-full" />
                    ) : (
                      <span className="text-xs text-slate-400">No Logo</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 block">Shop Logo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Shop Images Upload */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 block">Shop Images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesChange}
                  className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />

                {/* Previews grid */}
                {(existingImages.length > 0 || imagePreviews.length > 0) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                    {/* Existing saved images */}
                    {existingImages.map((url, idx) => (
                      <div key={`existing-${idx}`} className="relative group h-28 border rounded-lg overflow-hidden bg-slate-50">
                        <img src={url} alt="Shop" className="object-cover h-full w-full" />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(idx)}
                          className="absolute top-1.5 right-1.5 rounded-full bg-red-600 text-white p-1 hover:bg-red-700 focus:outline-none transition-colors opacity-90"
                        >
                          ✕
                        </button>
                        <span className="absolute bottom-1 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Saved</span>
                      </div>
                    ))}

                    {/* New local image previews */}
                    {imagePreviews.map((url, idx) => (
                      <div key={`new-${idx}`} className="relative group h-28 border rounded-lg overflow-hidden bg-slate-50 border-brand-300">
                        <img src={url} alt="New Preview" className="object-cover h-full w-full" />
                        <button
                          type="button"
                          onClick={() => removeNewImage(idx)}
                          className="absolute top-1.5 right-1.5 rounded-full bg-red-600 text-white p-1 hover:bg-red-700 focus:outline-none transition-colors opacity-90"
                        >
                          ✕
                        </button>
                        <span className="absolute bottom-1 left-1.5 bg-brand-600 text-white text-[10px] px-1.5 py-0.5 rounded">New</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 border-t pt-6">
                {shop && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelClick}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" isLoading={isPending}>
                  Save Shop Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="max-w-4xl">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-xl bg-slate-100 border overflow-hidden flex items-center justify-center shadow-inner">
                  {shop.logo ? (
                    <img src={shop.logo} alt={shop.shopName} className="object-cover h-full w-full" />
                  ) : (
                    <span className="text-2xl">🏪</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl font-bold">{shop.shopName}</CardTitle>
                    {shop.verified ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        Verified ✓
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                        Pending Verification
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm">{shop.category}</p>
                </div>
              </div>
              <Button onClick={handleEditClick} variant="outline" className="w-full sm:w-auto">
                Edit Profile
              </Button>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6 sm:grid-cols-2">
              {/* Profile Details */}
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Description</span>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">
                    {shop.description || "No description provided."}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Phone</span>
                  <p className="text-sm font-medium text-slate-900 mt-1">{shop.phone}</p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Operating Hours</span>
                  <p className="text-sm font-medium text-slate-900 mt-1">
                    {shop.openingTime} - {shop.closingTime}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Email Contact</span>
                  <p className="text-sm font-medium text-slate-900 mt-1">{shop.email}</p>
                </div>
              </div>

              <div className="space-y-4 border-t sm:border-t-0 sm:border-l sm:pl-6 pt-6 sm:pt-0">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Street Address</span>
                  <p className="text-sm text-slate-900 mt-1">{shop.address}</p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">City & Pincode</span>
                  <p className="text-sm text-slate-900 mt-1">
                    {shop.city}, {shop.state} - {shop.pincode}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Geolocation Coordinates</span>
                  <p className="text-sm text-slate-900 mt-1">
                    {shop.latitude !== undefined && shop.longitude !== undefined && shop.latitude !== 0
                      ? `${shop.latitude}, ${shop.longitude}`
                      : "Not set"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shop Images Gallery */}
          {shop.shopImages && shop.shopImages.length > 0 && (
            <Card className="max-w-4xl">
              <CardHeader>
                <CardTitle>Shop Gallery</CardTitle>
                <CardDescription>Visuals showcase of your storefront and interior.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {shop.shopImages.map((url, idx) => (
                    <div key={idx} className="h-32 rounded-lg border overflow-hidden bg-slate-50">
                      <img src={url} alt={`Gallery ${idx + 1}`} className="object-cover h-full w-full hover:scale-105 transition-transform duration-300" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
