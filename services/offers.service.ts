import { getFirebaseDb, getFirebaseStorage } from "@/firebase/firebase";
import { COLLECTIONS } from "@/constants/collections";
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Offer } from "@/types/offer";

export class OffersService {
  private get collection(): CollectionReference<Offer> {
    return collection(
      getFirebaseDb(),
      COLLECTIONS.OFFERS,
    ) as CollectionReference<Offer>;
  }

  getCollectionRef(): CollectionReference<Offer> {
    return this.collection;
  }

  getDocRef(offerId: string): DocumentReference<Offer> {
    return doc(this.collection, offerId);
  }

  /**
   * Fetch all offers for a specific shop.
   */
  async getOffersByShop(shopId: string, ownerId?: string): Promise<Offer[]> {
    let q = query(this.collection, where("shopId", "==", shopId));
    if (ownerId) {
      q = query(q, where("ownerId", "==", ownerId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data());
  }

  /**
   * Create a new offer document.
   */
  async createOffer(
    input: Omit<Offer, "offerId" | "createdAt" | "updatedAt">,
  ): Promise<Offer> {
    const docRef = doc(this.collection); // Auto-generate ID
    const offerId = docRef.id;

    const newOffer: Offer = {
      ...input,
      offerId,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    await setDoc(docRef, newOffer);

    return {
      ...newOffer,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  /**
   * Update an existing offer.
   */
  async updateOffer(
    offerId: string,
    updates: Partial<Omit<Offer, "offerId" | "shopId" | "ownerId" | "createdAt" | "updatedAt">>,
  ): Promise<void> {
    const docRef = this.getDocRef(offerId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete an existing offer.
   */
  async deleteOffer(offerId: string): Promise<void> {
    const docRef = this.getDocRef(offerId);
    await deleteDoc(docRef);
  }

  /**
   * Search offers in a shop by title.
   */
  async searchOffers(shopId: string, queryText: string): Promise<Offer[]> {
    const all = await this.getOffersByShop(shopId);
    if (!queryText.trim()) {
      return all;
    }
    const term = queryText.toLowerCase();
    return all.filter((o) => o.title.toLowerCase().includes(term));
  }

  /**
   * Upload offer banner image to Firebase Storage.
   */
  async uploadOfferImage(ownerId: string, file: File): Promise<string> {
    const storage = getFirebaseStorage();
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const fileExtension = file.name.split(".").pop();
    const imageRef = ref(
      storage,
      `shops/${ownerId}/offers/${uniqueId}.${fileExtension}`,
    );
    await uploadBytes(imageRef, file);
    return getDownloadURL(imageRef);
  }

  /**
   * Fetch all offers from Firestore.
   */
  async getAllOffers(): Promise<Offer[]> {
    const { getDocs } = await import("firebase/firestore");
    const snapshot = await getDocs(this.collection);
    return snapshot.docs.map((doc) => doc.data());
  }
}

export const offersService = new OffersService();

