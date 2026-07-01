import type { AuditableDocumentMeta, SerializedTimestamp } from "@/types/common";

/** Firestore `shops` collection document shape. */
export interface Shop extends AuditableDocumentMeta {
  shopId: string;
  ownerId: string;
  shopName: string;
  ownerName: string;
  category: string;
  mainCategory?: string;
  subcategory?: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  openingTime: string;
  closingTime: string;
  logo: string | null;
  shopImages: string[];
  verified: boolean;
  rating?: number;
  reviewCount?: number;
  googleMapsLink?: string;
}

/** Fields required when creating a shop. */
export interface ShopCreateInput {
  shopName: string;
  category: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  openingTime: string;
  closingTime: string;
  description?: string;
  logo?: string | null;
  shopImages?: string[];
  latitude?: number;
  longitude?: number;
  mainCategory?: string;
  subcategory?: string;
  googleMapsLink?: string;
}

/** Fields that can be updated on an existing shop. */
export interface ShopUpdateInput {
  shopName?: string;
  category?: string;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  openingTime?: string;
  closingTime?: string;
  logo?: string | null;
  shopImages?: string[];
  latitude?: number;
  longitude?: number;
  verified?: boolean;
  mainCategory?: string;
  subcategory?: string;
  googleMapsLink?: string;
}

/** Shop document with timestamps converted for client use. */
export interface SerializedShop extends Omit<Shop, "createdAt" | "updatedAt"> {
  createdAt: SerializedTimestamp;
  updatedAt: SerializedTimestamp;
}

