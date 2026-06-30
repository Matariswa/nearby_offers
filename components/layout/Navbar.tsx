"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { getDashboardPathForRole, getRoleLabel } from "@/lib/auth/redirects";
import { cn } from "@/lib/utils";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/firebase/firebase";
import { COLLECTIONS } from "@/constants/collections";
import { notificationsService } from "@/services/notifications.service";
import type { Notification } from "@/types/notification";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { firebaseUser, userProfile, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dashboardHref = userProfile
    ? getDashboardPathForRole(userProfile.role)
    : "/dashboard";

  // Real-time user notifications listener
  useEffect(() => {
    if (loading || !firebaseUser) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.NOTIFICATIONS),
      where("userId", "==", firebaseUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => doc.data() as Notification);
        const sorted = list.sort((a, b) => {
          const aTime = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : new Date(a.createdAt as any).getTime();
          const bTime = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : new Date(b.createdAt as any).getTime();
          return bTime - aTime;
        });
        setNotifications(sorted);
      },
      (error) => {
        console.warn("Notifications listener error (transient):", error);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser, loading]);

  // Click outside to close notifications dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadNotifications = notifications.filter((n) => !n.read);
  const unreadCount = unreadNotifications.length;

  const handleMarkAllRead = async () => {
    if (!firebaseUser) return;
    try {
      await notificationsService.markAllAsRead(firebaseUser.uid);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    try {
      await notificationsService.markAsRead(notif.notificationId);
      setShowNotifications(false);
      if (notif.offerId) {
        router.push(`/dashboard/offer/${notif.offerId}`);
      } else if (notif.shopId) {
        router.push(`/dashboard/shop/${notif.shopId}`);
      }
    } catch (err) {
      console.error("Failed to handle notification click:", err);
    }
  };

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      router.replace("/");
    } finally {
      setIsLoggingOut(false);
      setMobileOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <nav className="container-app flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            NO
          </span>
          <span className="text-lg font-bold text-slate-900">
            Nearby Offers
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-brand-600",
                pathname === link.href
                  ? "text-brand-600"
                  : "text-slate-600",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {!loading && firebaseUser && userProfile ? (
            <>
              {/* Notifications bell icon with dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none cursor-pointer"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black/5">
                    <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                      <span className="text-xs font-bold text-slate-800">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          <span>🔔</span>
                          <p className="mt-1">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <div
                            key={n.notificationId}
                            onClick={() => handleNotificationClick(n)}
                            className={cn(
                              "flex gap-2.5 rounded-lg px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors relative pr-6",
                              !n.read && "bg-brand-50/30"
                            )}
                          >
                            <div className="text-base mt-0.5">
                              {n.type === "new_offer" ? "🏷️" : "⌛"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className={cn("text-xs text-slate-900 truncate", !n.read ? "font-bold" : "font-medium")}>
                                {n.title}
                              </h5>
                              <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                                {n.message}
                              </p>
                            </div>
                            {!n.read && (
                              <span className="absolute top-4 right-3 h-1.5 w-1.5 rounded-full bg-brand-600" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="border-t border-slate-100 pt-1 text-center">
                      <Link
                        href="/dashboard/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="block py-1.5 text-[11px] font-bold text-brand-600 hover:text-brand-700"
                      >
                        View all notifications
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <Link href={dashboardHref}>
                <Button variant="ghost" size="sm">
                  {getRoleLabel(userProfile.role)} Dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                isLoading={isLoggingOut}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {/* Mobile Notifications Bell (just redirects to notifications page directly) */}
          {!loading && firebaseUser && userProfile && (
            <Link
              href="/dashboard/notifications"
              className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          )}

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="container-app flex flex-col gap-2 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium",
                  pathname === link.href
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50",
                )}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-4">
              {!loading && firebaseUser && userProfile ? (
                <>
                  <Link href={dashboardHref} onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full">
                      {getRoleLabel(userProfile.role)} Dashboard
                    </Button>
                  </Link>
                  <Button
                    className="w-full"
                    variant="ghost"
                    onClick={handleLogout}
                    isLoading={isLoggingOut}
                  >
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Log in
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full">Get started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
