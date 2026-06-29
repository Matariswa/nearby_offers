import { getFirebaseDb } from "@/firebase/firebase";
import { COLLECTIONS } from "@/constants/collections";
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";
import type { User } from "@/types/user";

export class UsersService {
  private get collection(): CollectionReference<User> {
    return collection(
      getFirebaseDb(),
      COLLECTIONS.USERS,
    ) as CollectionReference<User>;
  }

  getCollectionRef(): CollectionReference<User> {
    return this.collection;
  }

  getDocRef(uid: string): DocumentReference<User> {
    return doc(this.collection, uid);
  }

  /**
   * Add a shop to the user's favorites list.
   */
  async addFavoriteShop(userId: string, shopId: string): Promise<void> {
    const docRef = this.getDocRef(userId);
    await updateDoc(docRef, {
      favorites: arrayUnion(shopId),
    });
  }

  /**
   * Remove a shop from the user's favorites list.
   */
  async removeFavoriteShop(userId: string, shopId: string): Promise<void> {
    const docRef = this.getDocRef(userId);
    await updateDoc(docRef, {
      favorites: arrayRemove(shopId),
    });
  }

  /**
   * Retrieve the list of favorite shop IDs for a user.
   */
  async getFavoriteShops(userId: string): Promise<string[]> {
    const docRef = this.getDocRef(userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return [];
    return snap.data().favorites || [];
  }

  /**
   * Add an offer to the user's favorite offers list.
   */
  async addFavoriteOffer(userId: string, offerId: string): Promise<void> {
    const docRef = this.getDocRef(userId);
    await updateDoc(docRef, {
      favoriteOffers: arrayUnion(offerId),
    });
  }

  /**
   * Remove an offer from the user's favorite offers list.
   */
  async removeFavoriteOffer(userId: string, offerId: string): Promise<void> {
    const docRef = this.getDocRef(userId);
    await updateDoc(docRef, {
      favoriteOffers: arrayRemove(offerId),
    });
  }

  /**
   * Retrieve the list of favorite offer IDs for a user.
   */
  async getFavoriteOffers(userId: string): Promise<string[]> {
    const docRef = this.getDocRef(userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return [];
    return snap.data().favoriteOffers || [];
  }

  /**
   * Fetch all users from Firestore.
   */
  async getAllUsers(): Promise<User[]> {
    const { getDocs } = await import("firebase/firestore");
    const snapshot = await getDocs(this.collection);
    return snapshot.docs.map((doc) => doc.data());
  }

  /**
   * Update a user's role.
   */
  async updateUserRole(uid: string, role: User["role"]): Promise<void> {
    const docRef = this.getDocRef(uid);
    await updateDoc(docRef, { role });
  }

  /**
   * Enable or disable a user account.
   */
  async updateUserStatus(uid: string, disabled: boolean): Promise<void> {
    const docRef = this.getDocRef(uid);
    await updateDoc(docRef, { disabled });
  }
}

export const usersService = new UsersService();

