"use client";

import { useEffect, useState, useTransition } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { usersService } from "@/services/users.service";
import type { User, UserRole } from "@/types/user";

const sidebarLinks = [
  { label: "Overview", href: "/admin", icon: "📊" },
  { label: "Users", href: "/admin/users", icon: "👤" },
  { label: "Shops", href: "/admin/shops", icon: "🏪" },
  { label: "Offers", href: "/admin/offers", icon: "🏷️" },
  { label: "Reviews", href: "/admin/reviews", icon: "⭐" },
];

export default function AdminUsersPage() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  
  // Selected user for details modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [isPending, startTransition] = useTransition();

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersService.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChangeRole = (uid: string, newRole: UserRole) => {
    if (firebaseUser?.uid === uid) {
      alert("You cannot change your own role!");
      return;
    }

    startTransition(async () => {
      try {
        await usersService.updateUserRole(uid, newRole);
        // Refresh local list state
        setUsers((prev) =>
          prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
        );
        if (selectedUser?.uid === uid) {
          setSelectedUser((prev) => prev ? { ...prev, role: newRole } : null);
        }
      } catch (err) {
        console.error("Failed to update user role:", err);
      }
    });
  };

  const handleToggleStatus = (uid: string, currentStatus: boolean) => {
    if (firebaseUser?.uid === uid) {
      alert("You cannot disable your own account!");
      return;
    }

    startTransition(async () => {
      try {
        const nextDisabledState = !currentStatus;
        await usersService.updateUserStatus(uid, nextDisabledState);
        // Refresh local list state
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === uid ? { ...u, disabled: nextDisabledState } : u
          )
        );
        if (selectedUser?.uid === uid) {
          setSelectedUser((prev) =>
            prev ? { ...prev, disabled: nextDisabledState } : null
          );
        }
      } catch (err) {
        console.error("Failed to update user status:", err);
      }
    });
  };

  // Filter & Search users
  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === "all" ? true : u.role === roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const formatDate = (ts: any) => {
    if (!ts) return "N/A";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <DashboardLayout
      title="User Management"
      description="View details, change user roles, and activate/deactivate accounts."
      sidebarTitle="Administration"
      links={sidebarLinks}
    >
      <div className="space-y-6">
        {/* Controls Panel */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm justify-between">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 pl-9 text-sm focus:border-brand-500 focus:outline-none"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
          </div>

          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e: any) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-brand-500"
            >
              <option value="all">All Roles</option>
              <option value="customer">Customer</option>
              <option value="shop_owner">Shop Owner</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <LoadingSpinner className="h-8 w-8 text-brand-600 animate-spin" />
                <span className="text-xs text-slate-400 font-medium">Fetching users list...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <span className="text-4xl">👥</span>
                <p className="text-sm font-medium">No users found matching filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-500">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b">
                    <tr>
                      <th className="px-6 py-3.5">Name / Email</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">Registered</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredUsers.map((user) => {
                      const isSelf = firebaseUser?.uid === user.uid;
                      return (
                        <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.photoURL ? (
                                <img
                                  src={user.photoURL}
                                  alt={user.name}
                                  className="h-9 w-9 rounded-full object-cover border border-slate-100"
                                />
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                  {user.name}
                                  {isSelf && (
                                    <span className="bg-brand-50 text-brand-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                      YOU
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-slate-400 font-medium">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={user.role}
                              disabled={isSelf || isPending}
                              onChange={(e) => handleChangeRole(user.uid, e.target.value as UserRole)}
                              className="rounded border border-slate-200 px-2 py-1 text-xs bg-white text-slate-700 focus:outline-none focus:border-brand-500 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <option value="customer">Customer</option>
                              <option value="shop_owner">Shop Owner</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            {user.disabled ? (
                              <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                                Disabled
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8"
                                onClick={() => setSelectedUser(user)}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant={user.disabled ? "primary" : "outline"}
                                disabled={isSelf || isPending}
                                className={`text-xs h-8 ${
                                  !user.disabled &&
                                  "border-rose-200 text-rose-600 hover:bg-rose-50"
                                }`}
                                onClick={() => handleToggleStatus(user.uid, user.disabled ?? false)}
                              >
                                {user.disabled ? "Enable" : "Disable"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Details Modal Overlay */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-xl">
              <CardHeader className="flex justify-between items-start border-b pb-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">User Profile Details</CardTitle>
                  <CardDescription>Internal user record metadata.</CardDescription>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
                >
                  ✕
                </button>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  {selectedUser.photoURL ? (
                    <img
                      src={selectedUser.photoURL}
                      alt={selectedUser.name}
                      className="h-16 w-16 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xl font-bold border">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-lg text-slate-900">{selectedUser.name}</h4>
                    <p className="text-sm text-slate-500 font-medium">{selectedUser.email}</p>
                    <span className="inline-block bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded mt-1.5 capitalize">
                      {selectedUser.role}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">User UID</span>
                    <span className="font-mono text-xs text-slate-700 truncate max-w-[200px]" title={selectedUser.uid}>
                      {selectedUser.uid}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone Contact</span>
                    <span className="text-slate-700">{selectedUser.phone || "Not provided"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email Verified</span>
                    <span className="text-slate-700">{selectedUser.isVerified ? "Yes ✅" : "No ❌"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registration Date</span>
                    <span className="text-slate-700">{formatDate(selectedUser.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Login Activity</span>
                    <span className="text-slate-700">{formatDate(selectedUser.lastLogin)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account status</span>
                    <span className={`font-semibold ${selectedUser.disabled ? "text-rose-600" : "text-emerald-600"}`}>
                      {selectedUser.disabled ? "Disabled" : "Active / Enabled"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t gap-2">
                  <Button onClick={() => setSelectedUser(null)} className="w-full">
                    Close Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
