import type {
  BaseDocumentMeta,
  FirestoreTimestamp,
  SerializedTimestamp,
} from "@/types/common";

/** Firestore `offers` collection document shape. */
export interface Offer extends BaseDocumentMeta {
  offerId: string;
  shopId: string;
  title: string;
  description: string;
  discount: number;
  startDate: FirestoreTimestamp;
  endDate: FirestoreTimestamp;
  image: string | null;
  active: boolean;
}

/** Fields required when creating an offer. */
export interface OfferCreateInput {
  offerId: string;
  shopId: string;
  title: string;
  description: string;
  discount: number;
  startDate: Date;
  endDate: Date;
  image?: string | null;
  active?: boolean;
}

/** Fields that can be updated on an existing offer. */
export interface OfferUpdateInput {
  title?: string;
  description?: string;
  discount?: number;
  startDate?: Date;
  endDate?: Date;
  image?: string | null;
  active?: boolean;
}

/** Offer document with timestamps converted for client use. */
export interface SerializedOffer
  extends Omit<Offer, "createdAt" | "startDate" | "endDate"> {
  createdAt: SerializedTimestamp;
  startDate: SerializedTimestamp;
  endDate: SerializedTimestamp;
}
