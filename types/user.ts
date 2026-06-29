import type { AuditableDocumentMeta, SerializedTimestamp } from "@/types/common";

export type UserRole = "customer" | "shop_owner" | "admin";

/** Firestore `users` collection document shape. */
export interface User extends AuditableDocumentMeta {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL: string | null;
  phone: string | null;
}

/** Fields required when creating a user profile. */
export interface UserCreateInput {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string | null;
  phone?: string | null;
}

/** Fields that can be updated on an existing user profile. */
export interface UserUpdateInput {
  name?: string;
  photoURL?: string | null;
  phone?: string | null;
}

/** User document with timestamps converted for client use. */
export interface SerializedUser
  extends Omit<User, "createdAt" | "updatedAt"> {
  createdAt: SerializedTimestamp;
  updatedAt: SerializedTimestamp;
}
