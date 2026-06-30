"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { notificationsService } from "@/services/notifications.service";
import type { Notification } from "@/types/notification";
import Link from "next/link";
import { query, collection, where, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/firebase/firebase";
import { COLLECTIONS } from "@/constants/collections";

const sidebarLinks = [
  { label: "Overview", href: "/dashboard", icon: "📊" },
  { label: "Favorites", href: "/dashboard/favorites", icon: "❤️" },
  { label: "Notifications", href: "/dashboard/notifications", icon: "🔔" },
  { label: "Profile", href: "/dashboard/profile", icon: "👤" },
];

export default function CustomerNotificationsPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Listen to user notifications in real-time
  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      router.push("/login");
      return;
    }

    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.NOTIFICATIONS),
      where("userId", "==", firebaseUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => doc.data() as Notification);
      const sorted = list.sort((a, b) => {
        const aTime = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : new Date(a.createdAt as any).getTime();
        const bTime = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : new Date(b.createdAt as any).getTime();
        return bTime - aTime;
      });
      setNotifications(sorted);
      setLoading(false);
    }, (error) => {
      console.error("Firestore listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseUser, authLoading, router]);

  const handleMarkRead = (notificationId: string) => {
    startTransition(async () => {
      try {
        await notificationsService.markAsRead(notificationId);
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    });
  };

  const handleMarkAllRead = () => {
    if (!firebaseUser) return;
    startTransition(async () => {
      try {
        await notificationsService.markAllAsRead(firebaseUser.uid);
      } catch (err) {
        console.error("Failed to mark all as read:", err);
      }
    });
  };

  const handleDelete = (notificationId: string) => {
    startTransition(async () => {
      try {
        await notificationsService.deleteNotification(notificationId);
      } catch (err) {
        console.error("Failed to delete notification:", err);
      }
    });
  };

  const formatDate = (ts: any) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (authLoading || loading) {
    return (
      <DashboardLayout
        title="Notifications"
        description="Stay updated with the latest nearby offers and saved deals."
        sidebarTitle="Customer"
        links={sidebarLinks}
      >
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-xl border border-slate-200 shadow-sm w-full">
          <LoadingSpinner className="h-10 w-10 text-brand-600 animate-spin" />
          <span className="text-sm text-slate-500 font-medium">Loading notifications...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Notifications"
      description="Stay updated with the latest nearby offers and saved deals."
      sidebarTitle="Customer"
      links={sidebarLinks}
    >
      <div className="space-y-6 max-w-4xl">
        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
            ← Back to Finder
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="text-xs"
            >
              Mark all as read ✓
            </Button>
          )}
        </div>

        {/* Overview banner */}
        <div className="bg-gradient-to-r from-brand-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Alert Feed</h3>
            <p className="text-sm text-brand-100 mt-1">
              {unreadCount === 0
                ? "You have read all your alerts."
                : `You have ${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}.`}
            </p>
          </div>
          <span className="text-4xl">🔔</span>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent className="space-y-4">
              <span className="text-5xl block">✨</span>
              <CardTitle>All caught up!</CardTitle>
              <CardDescription>
                No notifications logged for your account yet. We will alert you here when new deals emerge.
              </CardDescription>
              <Link href="/dashboard" className="inline-block mt-2">
                <Button>Browse Shops</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <Card
                key={notif.notificationId}
                className={`transition-shadow hover:shadow-sm border relative overflow-hidden ${
                  !notif.read ? "border-brand-100 bg-brand-50/10" : "border-slate-200"
                }`}
              >
                {!notif.read && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-brand-600" />
                )}
                <CardContent className="p-4 sm:p-5 flex gap-4 items-start">
                  <span className="text-2xl mt-0.5 shrink-0">
                    {notif.type === "new_offer" ? "🏷️" : "⌛"}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className={`text-sm text-slate-900 truncate ${!notif.read ? "font-bold" : "font-semibold"}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {formatDate(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-3">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                      {notif.offerId && (
                        <Link href={`/dashboard/offer/${notif.offerId}`}>
                          <Button size="sm" className="text-[10px] h-7 px-2.5">
                            View Offer
                          </Button>
                        </Link>
                      )}
                      {!notif.offerId && notif.shopId && (
                        <Link href={`/dashboard/shop/${notif.shopId}`}>
                          <Button size="sm" className="text-[10px] h-7 px-2.5">
                            View Shop
                          </Button>
                        </Link>
                      )}
                      {!notif.read && (
                        <button
                          onClick={() => handleMarkRead(notif.notificationId)}
                          disabled={isPending}
                          className="text-[11px] font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notif.notificationId)}
                        disabled={isPending}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
