import type {
  BaseDocumentMeta,
  FirestoreTimestamp,
  SerializedTimestamp,
} from "@/types/common";

export type UserRole = "customer" | "shop_owner" | "admin";

/** Roles allowed during public registration. */
export type RegisterableRole = Extract<UserRole, "customer" | "shop_owner">;

/** Firestore `users` collection document shape. */
export interface User extends BaseDocumentMeta {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL: string | null;
  phone: string | null;
  lastLogin: FirestoreTimestamp;
  isVerified: boolean;
  favorites?: string[];
  favoriteOffers?: string[];
  disabled?: boolean;
}

/** Fields required when creating a user profile. */
export interface UserCreateInput {
  uid: string;
  name: string;
  email: string;
  role: RegisterableRole;
  photoURL?: string | null;
  phone?: string | null;
  isVerified?: boolean;
  favorites?: string[];
  favoriteOffers?: string[];
}

/** Fields that can be updated on an existing user profile. */
export interface UserUpdateInput {
  name?: string;
  photoURL?: string | null;
  phone?: string | null;
  lastLogin?: Date;
  isVerified?: boolean;
  favorites?: string[];
  favoriteOffers?: string[];
  disabled?: boolean;
}

/** User document with timestamps converted for client use. */
export interface SerializedUser extends Omit<User, "createdAt" | "lastLogin"> {
  createdAt: SerializedTimestamp;
  lastLogin: SerializedTimestamp;
}
