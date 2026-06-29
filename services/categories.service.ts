import { getFirebaseDb } from "@/firebase/firebase";
import { COLLECTIONS } from "@/constants/collections";
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from "firebase/firestore";
import type { Category } from "@/types/category";

export class CategoriesService {
  private get collection(): CollectionReference<Category> {
    return collection(
      getFirebaseDb(),
      COLLECTIONS.CATEGORIES,
    ) as CollectionReference<Category>;
  }

  getCollectionRef(): CollectionReference<Category> {
    return this.collection;
  }

  getDocRef(categoryId: string): DocumentReference<Category> {
    return doc(this.collection, categoryId);
  }
}

export const categoriesService = new CategoriesService();
