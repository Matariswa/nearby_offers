import { getFirebaseDb } from "@/firebase/firebase";
import { COLLECTIONS } from "@/constants/collections";
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
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
}

export const usersService = new UsersService();
