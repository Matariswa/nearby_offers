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
import { shopsService } from "@/services/shops.service";
import type { Shop } from "@/types/shop";

const sidebarLinks = [
  { label: "Overview", href: "/admin", icon: "📊" },
  { label: "Users", href: "/admin/users", icon: "👤" },
  { label: "Shops", href: "/admin/shops", icon: "🏪" },
  { label: "Offers", href: "/admin/offers", icon: "🏷️" },
  { label: "Reviews", href: "/admin/reviews", icon: "⭐" },
  { label: "Import Shops", href: "/admin/import", icon: "📥" },
];

const categoryOptions = [
  "Groceries",
  "Restaurants",
  "Fashion & Apparel",
  "Electronics",
  "Pharmacy & Health",
  "Services",
  "Others",
];

export default function AdminShopsPage() {
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all");

  // Selection states for detail viewer, edit modal, delete confirmation
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [deletingShopId, setDeletingShopId] = useState<string | null>(null);
  
  // Edit Form Fields
  const [formValues, setFormValues] = useState({
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
  });

  const [isPending, startTransition] = useTransition();

  const loadShops = async () => {
    try {
      setLoading(true);
      const data = await shopsService.getAllShops();
      setShops(data);
    } catch (err) {
      console.error("Failed to load shops:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, []);

  const handleToggleVerification = (shopId: string, currentVerified: boolean) => {
    startTransition(async () => {
      try {
        const nextVerified = !currentVerified;
        await shopsService.updateShop(shopId, { verified: nextVerified });
        setShops((prev) =>
          prev.map((s) => (s.shopId === shopId ? { ...s, verified: nextVerified } : s))
        );
        if (selectedShop?.shopId === shopId) {
          setSelectedShop((prev) => (prev ? { ...prev, verified: nextVerified } : null));
        }
      } catch (err) {
        console.error("Failed to update verification status:", err);
      }
    });
  };

  const handleOpenEdit = (shop: Shop) => {
    setEditingShop(shop);
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
    });
  };

  const handleSaveEdit = () => {
    if (!editingShop) return;

    startTransition(async () => {
      try {
        await shopsService.updateShop(editingShop.shopId, formValues);
        setShops((prev) =>
          prev.map((s) =>
            s.shopId === editingShop.shopId ? { ...s, ...formValues } : s
          )
        );
        setEditingShop(null);
      } catch (err) {
        console.error("Failed to edit shop:", err);
      }
    });
  };

  const handleDeleteShop = (shopId: string) => {
    startTransition(async () => {
      try {
        await shopsService.deleteShop(shopId);
        setShops((prev) => prev.filter((s) => s.shopId !== shopId));
        setDeletingShopId(null);
      } catch (err) {
        console.error("Failed to delete shop:", err);
      }
    });
  };

  // Filters & Search
  const filteredShops = shops.filter((s) => {
    const matchesVerification =
      verificationFilter === "all"
        ? true
        : verificationFilter === "verified"
        ? s.verified
        : !s.verified;
    const matchesSearch =
      s.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesVerification && matchesSearch;
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
      title="Shop Management"
      description="Approve/reject verify status, edit details, and delete shops."
      sidebarTitle="Administration"
      links={sidebarLinks}
    >
      <div className="space-y-6">
        {/* Controls Panel */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm justify-between">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by shop or owner name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 pl-9 text-sm focus:border-brand-500 focus:outline-none"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
          </div>

          <div className="flex gap-2">
            <select
              value={verificationFilter}
              onChange={(e: any) => setVerificationFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-brand-500"
            >
              <option value="all">All Verification Status</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified Only</option>
            </select>
          </div>
        </div>

        {/* Shops Listing Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <LoadingSpinner className="h-8 w-8 text-brand-600 animate-spin" />
                <span className="text-xs text-slate-400 font-medium">Fetching shops list...</span>
              </div>
            ) : filteredShops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <span className="text-4xl">🏪</span>
                <p className="text-sm font-medium">No shops found matching filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-500">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b">
                    <tr>
                      <th className="px-6 py-3.5">Shop Name / Category</th>
                      <th className="px-6 py-3.5">City</th>
                      <th className="px-6 py-3.5">Verification</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredShops.map((shop) => (
                      <tr key={shop.shopId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center border overflow-hidden shrink-0">
                              {shop.logo ? (
                                <img src={shop.logo} alt={shop.shopName} className="object-cover h-full w-full" />
                              ) : (
                                <span className="text-lg">🏪</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{shop.shopName}</p>
                              <p className="text-xs text-slate-400 font-medium">{shop.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {shop.city}
                        </td>
                        <td className="px-6 py-4">
                          {shop.verified ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                              Pending / Unverified
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 px-2"
                              onClick={() => setSelectedShop(shop)}
                            >
                              Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              className="text-xs h-8 px-2"
                              onClick={() => handleToggleVerification(shop.shopId, shop.verified)}
                            >
                              {shop.verified ? "Reject" : "Verify"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 px-2"
                              onClick={() => handleOpenEdit(shop)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 px-2 border-rose-200 text-rose-600 hover:bg-rose-50"
                              onClick={() => setDeletingShopId(shop.shopId)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shop Details Modal Overlay */}
        {selectedShop && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex justify-between items-start border-b pb-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Shop Profile Details</CardTitle>
                  <CardDescription>Verification and profile details.</CardDescription>
                </div>
                <button
                  onClick={() => setSelectedShop(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
                >
                  ✕
                </button>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  {selectedShop.logo ? (
                    <img
                      src={selectedShop.logo}
                      alt={selectedShop.shopName}
                      className="h-16 w-16 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 text-xl font-bold border">
                      🏪
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-lg text-slate-900">{selectedShop.shopName}</h4>
                    <p className="text-sm text-slate-500 font-medium">{selectedShop.category}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                        selectedShop.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {selectedShop.verified ? "Verified Shop" : "Pending Verification"}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-slate-600 text-xs italic bg-slate-50 p-2.5 rounded-lg border">
                  "{selectedShop.description || "No description provided."}"
                </p>

                <div className="border-t pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Shop ID</span>
                    <span className="font-mono text-xs text-slate-700">{selectedShop.shopId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Owner Name (UID)</span>
                    <span className="text-slate-700 font-medium">{selectedShop.ownerName} ({selectedShop.ownerId.substring(0, 6)}...)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone Contact</span>
                    <span className="text-slate-700 font-medium">{selectedShop.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email Address</span>
                    <span className="text-slate-700 font-medium">{selectedShop.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Address Location</span>
                    <span className="text-slate-700 text-right font-medium max-w-[250px] truncate">{selectedShop.address}, {selectedShop.city}, {selectedShop.state} - {selectedShop.pincode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Map Coordinates</span>
                    <span className="text-slate-700 font-medium">{selectedShop.latitude?.toFixed(5)}, {selectedShop.longitude?.toFixed(5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Business Hours</span>
                    <span className="text-slate-700 font-medium">{selectedShop.openingTime} – {selectedShop.closingTime}</span>
                  </div>
                </div>

                {selectedShop.shopImages && selectedShop.shopImages.length > 0 && (
                  <div className="border-t pt-4">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Shop Gallery Photos</span>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedShop.shopImages.map((img, i) => (
                        <div key={i} className="h-16 rounded bg-slate-100 overflow-hidden border">
                          <img src={img} alt="Shop interior" className="object-cover h-full w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t gap-2">
                  <Button onClick={() => setSelectedShop(null)} className="w-full">
                    Close Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Shop Modal Overlay */}
        {editingShop && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-bold text-slate-900">Edit Shop Profile</CardTitle>
                <CardDescription>Modify shop details as an administrator.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Shop Name</label>
                  <input
                    type="text"
                    value={formValues.shopName}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, shopName: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Category</label>
                    <select
                      value={formValues.category}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm bg-white focus:border-brand-500 focus:outline-none"
                    >
                      {categoryOptions.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Phone</label>
                    <input
                      type="text"
                      value={formValues.phone}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Address</label>
                  <input
                    type="text"
                    value={formValues.address}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">City</label>
                    <input
                      type="text"
                      value={formValues.city}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, city: e.target.value }))}
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">State</label>
                    <input
                      type="text"
                      value={formValues.state}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, state: e.target.value }))}
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Pincode</label>
                    <input
                      type="text"
                      value={formValues.pincode}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, pincode: e.target.value }))}
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Opening Time</label>
                    <input
                      type="time"
                      value={formValues.openingTime}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, openingTime: e.target.value }))}
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Closing Time</label>
                    <input
                      type="time"
                      value={formValues.closingTime}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, closingTime: e.target.value }))}
                      className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>
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

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setEditingShop(null)} disabled={isPending}>
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
        {deletingShopId && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-sm w-full shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-900">Delete Shop Profile</CardTitle>
                <CardDescription>This action cannot be undone. All active offers linked to this shop will lose their parent shop identity.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeletingShopId(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={() => handleDeleteShop(deletingShopId)}
                  disabled={isPending}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  Delete Shop
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
