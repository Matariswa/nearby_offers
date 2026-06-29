import type {
  AuditableDocumentMeta,
  FirestoreTimestamp,
  SerializedTimestamp,
} from "@/types/common";

export type OfferType =
  | "Percentage"
  | "Flat Discount"
  | "Buy One Get One"
  | "Cashback"
  | "Free Gift"
  | "Combo";

/** Firestore `offers` collection document shape. */
export interface Offer extends AuditableDocumentMeta {
  offerId: string;
  shopId: string;
  ownerId: string;
  title: string;
  description: string;
  offerType: OfferType;
  discountValue: number;
  couponCode?: string;
  image: string | null;
  startDate: FirestoreTimestamp;
  endDate: FirestoreTimestamp;
  termsAndConditions: string;
  active: boolean;
  featured: boolean;
}

/** Fields required when creating an offer. */
export interface OfferCreateInput {
  shopId: string;
  ownerId: string;
  title: string;
  description: string;
  offerType: OfferType;
  discountValue: number;
  couponCode?: string;
  image?: string | null;
  startDate: Date | FirestoreTimestamp;
  endDate: Date | FirestoreTimestamp;
  termsAndConditions: string;
  active?: boolean;
  featured?: boolean;
}

/** Fields that can be updated on an existing offer. */
export interface OfferUpdateInput {
  title?: string;
  description?: string;
  offerType?: OfferType;
  discountValue?: number;
  couponCode?: string;
  image?: string | null;
  startDate?: Date | FirestoreTimestamp;
  endDate?: Date | FirestoreTimestamp;
  termsAndConditions?: string;
  active?: boolean;
  featured?: boolean;
}

/** Offer document with timestamps converted for client use. */
export interface SerializedOffer
  extends Omit<
    Offer,
    "createdAt" | "updatedAt" | "startDate" | "endDate"
  > {
  createdAt: SerializedTimestamp;
  updatedAt: SerializedTimestamp;
  startDate: SerializedTimestamp;
  endDate: SerializedTimestamp;
}

