"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users as UsersIcon,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { USER_ROLES } from "@/lib/constants/roles";

interface PlatformUser {
  id: string;
  name?: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchUsers = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const queryParams = new URLSearchParams({
          page: pageToLoad.toString(),
          limit: "10",
          search: search.trim(),
          role: roleFilter,
        });

        const res = await fetch(`/api/system-admin/users?${queryParams}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to fetch users");
        }

        setUsers(json.data);
        setPagination(json.pagination);
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : "Error fetching platform users"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [search, roleFilter]
  );

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SYSTEM_ADMIN":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "ADMIN":
        return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      case "TEACHER":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "STUDENT":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "PARENT":
        return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
      default:
        return "bg-surface-3 text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <UsersIcon className="w-5 h-5 text-primary" />
          <span>Platform Users Directory</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          View and inspect user accounts registered across the SaaS platform.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-destructive hover:opacity-80 font-bold cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email address..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-input border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Filter & Refresh */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-input border border-input-border rounded-xl px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Roles</option>
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchUsers(pagination.page)}
            disabled={isLoading}
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50 cursor-pointer border border-border shadow-sm"
            title="Reload users"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-2/60 border-b border-border text-muted-foreground uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 font-semibold">User</th>
                <th className="py-3.5 px-4 font-semibold">Email</th>
                <th className="py-3.5 px-4 font-semibold">Role</th>
                <th className="py-3.5 px-4 font-semibold">Tenant School</th>
                <th className="py-3.5 px-4 font-semibold">Account Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    <span>Querying users from MongoDB collection...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center space-y-2">
                    <UsersIcon className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-foreground font-medium">No users found</p>
                    <p className="text-muted-foreground text-[11px]">
                      Try changing your search term or role filter.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-surface-2/50 transition-colors"
                  >
                    {/* User Name & Initial */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {u.name?.[0]?.toUpperCase() || u.email[0]?.toUpperCase() || "U"}
                        </div>
                        <span className="font-semibold text-foreground">
                          {u.name || "N/A"}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {u.email}
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getRoleBadge(
                          u.role
                        )}`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Tenant School */}
                    <td className="py-3.5 px-4 text-muted-foreground text-[11px] italic">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-muted-foreground/60" />
                        <span>Not assigned (Phase 2 feature)</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center gap-1 ${
                          u.isActive
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>{u.isActive ? "Active" : "Disabled"}</span>
                      </span>
                    </td>

                    {/* Joined Date */}
                    <td className="py-3.5 px-4 text-right text-muted-foreground text-[11px]">
                      <div className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground/60" />
                        <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="p-4 bg-surface-1/50 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {users.length} of {pagination.total} registered users
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => fetchUsers(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-border shadow-sm"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-foreground font-medium">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => fetchUsers(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-border shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
