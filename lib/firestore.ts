import { getFirebaseDb } from "@/firebase/firebase";
import { COLLECTIONS, type CollectionName } from "@/constants/collections";
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from "firebase/firestore";

export function getCollectionRef<T>(
  collectionName: CollectionName,
): CollectionReference<T> {
  return collection(
    getFirebaseDb(),
    collectionName,
  ) as CollectionReference<T>;
}

export function getDocumentRef<T>(
  collectionName: CollectionName,
  documentId: string,
): DocumentReference<T> {
  return doc(getCollectionRef<T>(collectionName), documentId);
}

export { COLLECTIONS };
