import type { AuditableDocumentMeta, SerializedTimestamp } from "@/types/common";

export type NotificationType = "new_offer" | "expiring_soon";

/** Firestore `notifications` collection document shape. */
export interface Notification extends AuditableDocumentMeta {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  offerId?: string;
  shopId?: string;
  read: boolean;
}

/** Fields required when creating a notification. */
export interface NotificationCreateInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  offerId?: string;
  shopId?: string;
  read?: boolean;
}

/** Notification document with timestamps converted for client use. */
export interface SerializedNotification extends Omit<Notification, "createdAt" | "updatedAt"> {
  createdAt: SerializedTimestamp;
  updatedAt: SerializedTimestamp;
}
