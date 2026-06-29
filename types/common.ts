import type { Timestamp } from "firebase/firestore";

/** Firestore-backed document timestamps. */
export type FirestoreTimestamp = Timestamp | Date;

/** Client-safe date values after serialization. */
export type SerializedTimestamp = string | Date;

export interface BaseDocumentMeta {
  createdAt: FirestoreTimestamp;
}

export interface AuditableDocumentMeta extends BaseDocumentMeta {
  updatedAt: FirestoreTimestamp;
}
