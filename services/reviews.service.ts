import { getFirebaseDb } from "@/firebase/firebase";
import { COLLECTIONS } from "@/constants/collections";
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type { Review, ReviewCreateInput } from "@/types/review";
import type { Shop } from "@/types/shop";

export class ReviewsService {
  private get collection(): CollectionReference<Review> {
    return collection(
      getFirebaseDb(),
      COLLECTIONS.REVIEWS,
    ) as CollectionReference<Review>;
  }

  getCollectionRef(): CollectionReference<Review> {
    return this.collection;
  }

  getDocRef(reviewId: string): DocumentReference<Review> {
    return doc(this.collection, reviewId);
  }

  /**
   * Fetch reviews for a specific shop.
   */
  async getReviewsForShop(shopId: string): Promise<Review[]> {
    const q = query(
      this.collection,
      where("shopId", "==", shopId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  }

  /**
   * Fetch all reviews in the system (for admin moderation).
   */
  async getAllReviews(): Promise<Review[]> {
    const q = query(this.collection, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  }

  /**
   * Submit a review and update shop average rating inside a transaction.
   */
  async addReview(input: ReviewCreateInput): Promise<Review> {
    const db = getFirebaseDb();
    const shopRef = doc(db, COLLECTIONS.SHOPS, input.shopId) as DocumentReference<Shop>;
    const reviewDocRef = doc(collection(db, COLLECTIONS.REVIEWS));
    const reviewId = reviewDocRef.id;

    const newReview: Review = {
      ...input,
      reviewId,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    await runTransaction(db, async (transaction) => {
      const shopSnap = await transaction.get(shopRef);
      if (!shopSnap.exists()) {
        throw new Error("Shop profile does not exist.");
      }

      const shopData = shopSnap.data() as Shop;
      const currentCount = shopData.reviewCount || 0;
      const currentRating = shopData.rating || 0;

      const newCount = currentCount + 1;
      const newRating = (currentRating * currentCount + input.rating) / newCount;

      transaction.set(reviewDocRef, newReview);
      transaction.update(shopRef, {
        rating: Number(newRating.toFixed(2)),
        reviewCount: newCount,
        updatedAt: serverTimestamp(),
      });
    });

    return {
      ...newReview,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  /**
   * Delete a review and update shop average rating inside a transaction.
   */
  async deleteReview(reviewId: string, shopId: string, rating: number): Promise<void> {
    const db = getFirebaseDb();
    const shopRef = doc(db, COLLECTIONS.SHOPS, shopId) as DocumentReference<Shop>;
    const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);

    await runTransaction(db, async (transaction) => {
      const shopSnap = await transaction.get(shopRef);
      if (!shopSnap.exists()) {
        throw new Error("Shop profile does not exist.");
      }

      const shopData = shopSnap.data() as Shop;
      const currentCount = shopData.reviewCount || 0;
      const currentRating = shopData.rating || 0;

      const newCount = Math.max(0, currentCount - 1);
      const newRating = newCount > 0 ? (currentRating * currentCount - rating) / newCount : 0;

      transaction.delete(reviewRef);
      transaction.update(shopRef, {
        rating: Number(newRating.toFixed(2)),
        reviewCount: newCount,
        updatedAt: serverTimestamp(),
      });
    });
  }
}

export const reviewsService = new ReviewsService();
