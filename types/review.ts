import type { AuditableDocumentMeta, SerializedTimestamp } from "@/types/common";

/** Firestore `reviews` collection document shape. */
export interface Review extends AuditableDocumentMeta {
  reviewId: string;
  shopId: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5 stars
  comment: string;
}

/** Fields required when creating a review. */
export interface ReviewCreateInput {
  shopId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
}

/** Review document with timestamps converted for client use. */
export interface SerializedReview extends Omit<Review, "createdAt" | "updatedAt"> {
  createdAt: SerializedTimestamp;
  updatedAt: SerializedTimestamp;
}
