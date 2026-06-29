import { getFirebaseDb } from "@/firebase/firebase";
import { COLLECTIONS } from "@/constants/collections";
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from "firebase/firestore";
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
}

export const offersService = new OffersService();
