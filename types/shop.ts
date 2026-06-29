import type { BaseDocumentMeta, SerializedTimestamp } from "@/types/common";

/** Firestore `shops` collection document shape. */
export interface Shop extends BaseDocumentMeta {
  shopId: string;
  ownerId: string;
  shopName: string;
  category: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  phone: string;
  logo: string | null;
  images: string[];
  verified: boolean;
}

/** Fields required when creating a shop. */
export interface ShopCreateInput {
  shopId: string;
  ownerId: string;
  shopName: string;
  category: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  phone: string;
  logo?: string | null;
  images?: string[];
  verified?: boolean;
}

/** Fields that can be updated on an existing shop. */
export interface ShopUpdateInput {
  shopName?: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  logo?: string | null;
  images?: string[];
  verified?: boolean;
}

/** Shop document with timestamps converted for client use. */
export interface SerializedShop extends Omit<Shop, "createdAt"> {
  createdAt: SerializedTimestamp;
}
