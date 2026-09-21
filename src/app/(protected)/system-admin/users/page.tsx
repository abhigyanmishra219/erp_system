"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users as UsersIcon,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
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
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "ADMIN":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "TEACHER":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "STUDENT":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "PARENT":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <UsersIcon className="w-5 h-5 text-indigo-400" />
          <span>Platform Users Directory</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
          View and inspect user accounts registered across the SaaS platform.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-300 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email address..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filter & Refresh */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
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
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            title="Reload users"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 font-semibold">User</th>
                <th className="py-3.5 px-4 font-semibold">Email</th>
                <th className="py-3.5 px-4 font-semibold">Role</th>
                <th className="py-3.5 px-4 font-semibold">Tenant School</th>
                <th className="py-3.5 px-4 font-semibold">Account Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Querying users from MongoDB collection...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center space-y-2">
                    <UsersIcon className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-zinc-400 font-medium">No users found</p>
                    <p className="text-zinc-500 text-[11px]">
                      Try changing your search term or role filter.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* User Name & Initial */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {u.name?.[0]?.toUpperCase() || u.email[0]?.toUpperCase() || "U"}
                        </div>
                        <span className="font-semibold text-zinc-200">
                          {u.name || "N/A"}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-mono text-zinc-300">
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
                    <td className="py-3.5 px-4 text-zinc-500 text-[11px] italic">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-zinc-600" />
                        <span>Not assigned (Phase 2 feature)</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center gap-1 ${
                          u.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>{u.isActive ? "Active" : "Disabled"}</span>
                      </span>
                    </td>

                    {/* Joined Date */}
                    <td className="py-3.5 px-4 text-right text-zinc-400 text-[11px]">
                      <div className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-600" />
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
          <div className="p-4 bg-zinc-950/40 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>
              Showing {users.length} of {pagination.total} registered users
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => fetchUsers(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-mono">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => fetchUsers(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
