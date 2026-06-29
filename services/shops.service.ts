import { getFirebaseDb } from "@/firebase/firebase";
import { COLLECTIONS } from "@/constants/collections";
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from "firebase/firestore";
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
}

export const shopsService = new ShopsService();
