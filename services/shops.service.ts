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
  limit,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Shop } from "@/types/shop";

export class ShopsService {
  private get collection(): CollectionReference<Shop> {
    return collection(
      getFirebaseDb(),
      COLLECTIONS.SHOPS,
    ) as CollectionReference<Shop>;
  }

  getCollectionRef(): CollectionReference<Shop> {
    return this.collection;
  }

  getDocRef(shopId: string): DocumentReference<Shop> {
    return doc(this.collection, shopId);
  }

  /**
   * Fetch shop profile by its owner's UID.
   */
  async getShopByOwner(ownerId: string): Promise<Shop | null> {
    const q = query(this.collection, where("ownerId", "==", ownerId), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    return snapshot.docs[0].data();
  }

  /**
   * Create a new shop profile.
   */
  async createShop(input: Omit<Shop, "shopId" | "verified" | "createdAt" | "updatedAt">): Promise<Shop> {
    const docRef = doc(this.collection); // Auto-generates document ID
    const shopId = docRef.id;

    const newShop: Shop = {
      ...input,
      shopId,
      verified: false,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    await setDoc(docRef, newShop);

    return {
      ...newShop,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  /**
   * Update an existing shop profile.
   */
  async updateShop(
    shopId: string,
    updates: Partial<Omit<Shop, "shopId" | "ownerId" | "createdAt" | "updatedAt">>
  ): Promise<void> {
    const docRef = this.getDocRef(shopId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Upload logo to Firebase Storage.
   */
  async uploadLogo(ownerId: string, file: File): Promise<string> {
    const storage = getFirebaseStorage();
    const fileExtension = file.name.split(".").pop();
    const logoRef = ref(storage, `shops/${ownerId}/logo.${fileExtension}`);
    await uploadBytes(logoRef, file);
    return getDownloadURL(logoRef);
  }

  /**
   * Upload general shop images to Firebase Storage.
   */
  async uploadShopImage(ownerId: string, file: File): Promise<string> {
    const storage = getFirebaseStorage();
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const fileExtension = file.name.split(".").pop();
    const imageRef = ref(storage, `shops/${ownerId}/images/${uniqueId}.${fileExtension}`);
    await uploadBytes(imageRef, file);
    return getDownloadURL(imageRef);
  }
}

export const shopsService = new ShopsService();

