import { getFirebaseDb } from "@/firebase/firebase";
import { COLLECTIONS } from "@/constants/collections";
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import type { Notification, NotificationCreateInput } from "@/types/notification";
import type { Offer } from "@/types/offer";
import type { Shop } from "@/types/shop";

export class NotificationsService {
  private get collection(): CollectionReference<Notification> {
    return collection(
      getFirebaseDb(),
      COLLECTIONS.NOTIFICATIONS,
    ) as CollectionReference<Notification>;
  }

  getCollectionRef(): CollectionReference<Notification> {
    return this.collection;
  }

  getDocRef(notificationId: string): DocumentReference<Notification> {
    return doc(this.collection, notificationId);
  }

  /**
   * Fetch all notifications for a user, sorted by creation date in memory to avoid composite index requirements.
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const q = query(this.collection, where("userId", "==", userId));
    const snap = await getDocs(q);
    const list = snap.docs.map((doc) => doc.data() as Notification);
    
    return list.sort((a, b) => {
      const aTime = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : new Date(a.createdAt as any).getTime();
      const bTime = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : new Date(b.createdAt as any).getTime();
      return bTime - aTime;
    });
  }

  /**
   * Create a new notification document.
   */
  async createNotification(input: NotificationCreateInput): Promise<Notification> {
    const docRef = doc(this.collection);
    const notificationId = docRef.id;

    const newNotification: Notification = {
      ...input,
      notificationId,
      read: false,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    await setDoc(docRef, newNotification);

    return {
      ...newNotification,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId: string): Promise<void> {
    const docRef = this.getDocRef(notificationId);
    await updateDoc(docRef, {
      read: true,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Mark all user notifications as read.
   */
  async markAllAsRead(userId: string): Promise<void> {
    const q = query(this.collection, where("userId", "==", userId), where("read", "==", false));
    const snap = await getDocs(q);
    
    if (snap.empty) return;

    const db = getFirebaseDb();
    const batch = writeBatch(db);

    snap.docs.forEach((d) => {
      batch.update(d.ref, {
        read: true,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }

  /**
   * Delete a notification document.
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const docRef = this.getDocRef(notificationId);
    await deleteDoc(docRef);
  }

  /**
   * Scan for new nearby offers or expiring saved offers and generate alert documents.
   */
  async checkAndGenerateNotifications(
    userId: string,
    userLocation: { latitude: number; longitude: number } | null,
    favoritesList: string[],
    activeOffers: Offer[],
    shops: Shop[]
  ): Promise<void> {
    const db = getFirebaseDb();

    // 1. Fetch current notification logs to avoid duplicates
    const snap = await getDocs(query(this.collection, where("userId", "==", userId)));
    const existing = snap.docs.map((doc) => doc.data() as Notification);

    const newOfferAlerts = new Set(
      existing.filter((n) => n.type === "new_offer" && n.offerId).map((n) => n.offerId)
    );
    const expiringAlerts = new Set(
      existing.filter((n) => n.type === "expiring_soon" && n.offerId).map((n) => n.offerId)
    );

    const today = new Date();
    const newNotificationsBatch: { ref: DocumentReference<Notification>; data: Notification }[] = [];

    // Import distance utility
    const { calculateDistance } = await import("@/utils/distance");

    for (const offer of activeOffers) {
      const parentShop = shops.find((s) => s.shopId === offer.shopId);
      if (!parentShop) continue;

      // Check Option A: New nearby offer (active offer created within past 7 days and within 10km radius)
      let distance = 99999;
      if (userLocation && parentShop.latitude && parentShop.longitude) {
        distance = calculateDistance(
          userLocation,
          { latitude: parentShop.latitude, longitude: parentShop.longitude }
        );
      }

      const offerCreatedAt = (offer.createdAt as any)?.toDate ? (offer.createdAt as any).toDate() : new Date(offer.createdAt as any);
      const isNew = (today.getTime() - offerCreatedAt.getTime()) < 7 * 24 * 60 * 60 * 1000;
      const isNearby = distance <= 10;

      if (isNew && isNearby && !newOfferAlerts.has(offer.offerId) && userLocation) {
        const docRef = doc(this.collection);
        const newNotif: Notification = {
          notificationId: docRef.id,
          userId,
          type: "new_offer",
          title: "New Nearby Offer!",
          message: `"${offer.title}" is now available at ${parentShop.shopName} (${distance.toFixed(1)} km away).`,
          offerId: offer.offerId,
          shopId: offer.shopId,
          read: false,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
        };
        newNotificationsBatch.push({ ref: docRef, data: newNotif });
        newOfferAlerts.add(offer.offerId);
      }

      // Check Option B: Saved offer expiring soon (saved in favorites, active, expires in < 48 hours)
      const offerEndDate = (offer.endDate as any)?.toDate ? (offer.endDate as any).toDate() : new Date(offer.endDate as any);
      const diffMs = offerEndDate.getTime() - today.getTime();
      const isExpiringSoon = diffMs > 0 && diffMs < 48 * 60 * 60 * 1000;
      const isSaved = favoritesList.includes(offer.offerId);

      if (isSaved && isExpiringSoon && !expiringAlerts.has(offer.offerId)) {
        const docRef = doc(this.collection);
        const newNotif: Notification = {
          notificationId: docRef.id,
          userId,
          type: "expiring_soon",
          title: "Saved Offer Expiring Soon!",
          message: `Your saved offer "${offer.title}" at ${parentShop.shopName} expires on ${offerEndDate.toLocaleDateString()}.`,
          offerId: offer.offerId,
          shopId: offer.shopId,
          read: false,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
        };
        newNotificationsBatch.push({ ref: docRef, data: newNotif });
        expiringAlerts.add(offer.offerId);
      }
    }

    if (newNotificationsBatch.length > 0) {
      const batch = writeBatch(db);
      newNotificationsBatch.forEach((item) => {
        batch.set(item.ref, item.data);
      });
      await batch.commit();
    }
  }
}

export const notificationsService = new NotificationsService();
