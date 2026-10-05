"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Calendar,
  CheckCircle2,
  XCircle,
  Plus,
  KeyRound,
  Edit2,
  UserCheck,
  UserX,
  X,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  ShieldAlert,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface SystemAdminAccount {
  id: string;
  name?: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SystemAdminsPage() {
  const { user: currentUser } = useUser();
  const [admins, setAdmins] = useState<SystemAdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SystemAdminAccount | null>(null);
  const [resetPasswordAdmin, setResetPasswordAdmin] = useState<SystemAdminAccount | null>(null);

  // Create Form State
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createFormError, setCreateFormError] = useState<string | null>(null);

  // Edit Name Form State
  const [editName, setEditName] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Reset Password Form State
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetFormError, setResetFormError] = useState<string | null>(null);

  // Action in-flight tracking
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Fetch System Admins
  const fetchAdmins = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const queryParams = new URLSearchParams({
        search: search.trim(),
        status: statusFilter,
      });

      const res = await fetch(`/api/system-admin/admins?${queryParams}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load System Admins");
      }

      setAdmins(json.data || []);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error fetching System Admins"
      );
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const queryParams = new URLSearchParams({
          search: search.trim(),
          status: statusFilter,
        });

        const res = await fetch(`/api/system-admin/admins?${queryParams}`);
        const json = await res.json();

        if (isMounted) {
          if (res.ok && json.success) {
            setAdmins(json.data || []);
          } else {
            setErrorMessage(json.error?.message || "Failed to load System Admins");
          }
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(
            err instanceof Error ? err.message : "Error fetching System Admins"
          );
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [search, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = admins.length;
    const active = admins.filter((a) => a.isActive).length;
    const disabled = total - active;
    return { total, active, disabled };
  }, [admins]);

  // Password Strength for Create Modal
  const isCreateEmailValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail.trim());
  }, [createEmail]);

  const createPasswordScore = useMemo(() => {
    let score = 0;
    if (createPassword.length >= 8) score++;
    if (/[A-Z]/.test(createPassword)) score++;
    if (/[a-z]/.test(createPassword)) score++;
    if (/[0-9]/.test(createPassword)) score++;
    if (/[^A-Za-z0-9]/.test(createPassword)) score++;
    return score;
  }, [createPassword]);

  // Handle Create Admin Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFormError(null);

    if (!isCreateEmailValid) {
      setCreateFormError("Please enter a valid email address.");
      return;
    }

    if (createPassword.length < 8) {
      setCreateFormError("Password must be at least 8 characters long.");
      return;
    }

    if (createPassword !== createConfirmPassword) {
      setCreateFormError("Passwords do not match.");
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const res = await fetch("/api/system-admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail.trim(),
          name: createName.trim(),
          password: createPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.error || "Failed to create System Admin");
      }

      setSuccessMessage(`System Admin "${json.data.email}" created successfully!`);
      setIsCreateModalOpen(false);
      // Reset form
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateConfirmPassword("");
      fetchAdmins();
    } catch (err: unknown) {
      setCreateFormError(
        err instanceof Error ? err.message : "Error creating System Admin"
      );
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle Edit Name Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setEditFormError(null);

    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/system-admin/admins/${editingAdmin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update System Admin");
      }

      setSuccessMessage(`Admin "${editingAdmin.email}" updated successfully.`);
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err: unknown) {
      setEditFormError(
        err instanceof Error ? err.message : "Error updating System Admin"
      );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordAdmin) return;
    setResetFormError(null);

    if (newPassword.length < 8) {
      setResetFormError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setResetFormError("Passwords do not match.");
      return;
    }

    setIsSubmittingReset(true);
    try {
      const res = await fetch(`/api/system-admin/admins/${resetPasswordAdmin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to reset password");
      }

      setSuccessMessage(
        `Password for "${resetPasswordAdmin.email}" was reset successfully.`
      );
      setResetPasswordAdmin(null);
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: unknown) {
      setResetFormError(
        err instanceof Error ? err.message : "Error resetting password"
      );
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Handle Toggle Active/Inactive Status
  const handleToggleStatus = async (admin: SystemAdminAccount) => {
    const isSelf =
      currentUser?.id === admin.id || currentUser?.email === admin.email;
    if (isSelf && admin.isActive) {
      setErrorMessage("You cannot deactivate your own System Admin account.");
      return;
    }

    const nextState = !admin.isActive;
    setActionInProgressId(admin.id);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/system-admin/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextState }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update account status");
      }

      setSuccessMessage(
        `Account "${admin.email}" has been ${nextState ? "activated" : "deactivated"}.`
      );
      fetchAdmins();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error updating account status"
      );
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span>System Administration</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage platform-level System Administrator accounts with full infrastructure authority.
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreateModalOpen(true);
            setCreateFormError(null);
          }}
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-xs flex items-center gap-2 shadow-lg shadow-primary/25 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New System Admin</span>
        </button>
      </div>

      {/* Feedback Alerts */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-destructive hover:opacity-80 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-success/10 border border-success/20 text-success text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-success hover:opacity-80 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Administrators</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Active Accounts</p>
            <p className="text-2xl font-extrabold text-success mt-1">{stats.active}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Deactivated</p>
            <p className="text-2xl font-extrabold text-muted-foreground mt-1">{stats.disabled}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-surface-3 text-muted-foreground flex items-center justify-center">
            <UserX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="p-4 rounded-2xl bg-card border border-border flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admins by name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-input border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-input border border-input-border rounded-xl px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="DISABLED">Deactivated Only</option>
            </select>
          </div>

          <button
            onClick={fetchAdmins}
            disabled={isLoading}
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50 cursor-pointer border border-border shadow-sm"
            title="Reload directory"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Admins Table */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-2/60 border-b border-border text-muted-foreground uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 font-semibold">Administrator</th>
                <th className="py-3.5 px-4 font-semibold">Email</th>
                <th className="py-3.5 px-4 font-semibold">Platform Role</th>
                <th className="py-3.5 px-4 font-semibold">Account Status</th>
                <th className="py-3.5 px-4 font-semibold">Created Date</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading platform system administrators...</span>
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center space-y-2">
                    <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-foreground font-medium">No System Admins found</p>
                    <p className="text-muted-foreground text-[11px]">
                      Try changing your search query or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                admins.map((admin) => {
                  const isSelf =
                    currentUser?.id === admin.id ||
                    currentUser?.email === admin.email;
                  const isActionLoading = actionInProgressId === admin.id;

                  return (
                    <tr
                      key={admin.id}
                      className="hover:bg-surface-2/50 transition-colors"
                    >
                      {/* Name & Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {admin.name?.[0]?.toUpperCase() ||
                              admin.email[0]?.toUpperCase() ||
                              "A"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">
                                {admin.name || "System Admin"}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold text-[9px] uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {admin.id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {admin.email}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider bg-rose-500/10 text-rose-500 border-rose-500/20">
                          SYSTEM_ADMIN
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center gap-1 ${
                            admin.isActive
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          }`}
                        >
                          {admin.isActive ? (
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          ) : (
                            <XCircle className="w-2.5 h-2.5" />
                          )}
                          <span>{admin.isActive ? "Active" : "Deactivated"}</span>
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                        <div className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground/60" />
                          <span>
                            {new Date(admin.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Edit Name */}
                          <button
                            onClick={() => {
                              setEditingAdmin(admin);
                              setEditName(admin.name || "");
                              setEditFormError(null);
                            }}
                            className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-all border border-border cursor-pointer"
                            title="Edit details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setResetPasswordAdmin(admin);
                              setNewPassword("");
                              setConfirmNewPassword("");
                              setResetFormError(null);
                            }}
                            className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-all border border-border cursor-pointer"
                            title="Reset password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active/Inactive */}
                          <button
                            onClick={() => handleToggleStatus(admin)}
                            disabled={isSelf && admin.isActive}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              isSelf && admin.isActive
                                ? "opacity-30 cursor-not-allowed bg-surface-2 text-muted-foreground border-border"
                                : admin.isActive
                                ? "bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20"
                            }`}
                            title={
                              isSelf && admin.isActive
                                ? "Cannot deactivate your own session"
                                : admin.isActive
                                ? "Deactivate account"
                                : "Activate account"
                            }
                          >
                            {isActionLoading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : admin.isActive ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE SYSTEM ADMIN MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Create System Administrator
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Add a new platform-level administrator account
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createFormError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              {/* Name */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Name (Optional)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Alexander Vance"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="admin@enterprise.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Initial Password (min. 8 characters) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    required
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showCreatePassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                {/* Strength Meter */}
                {createPassword.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <div className="w-full bg-surface-3 rounded-full h-1">
                      <div
                        className={`h-full rounded-full transition-all ${
                          createPasswordScore <= 2
                            ? "bg-destructive w-1/3"
                            : createPasswordScore <= 4
                            ? "bg-amber-500 w-2/3"
                            : "bg-success w-full"
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    required
                    value={createConfirmPassword}
                    onChange={(e) => setCreateConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs font-medium text-muted-foreground hover:text-foreground border border-border cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-xs font-medium text-primary-foreground shadow-md shadow-primary/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isSubmittingCreate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create System Admin</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADMIN NAME MODAL */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-primary" />
                <span>Edit Administrator</span>
              </h3>
              <button
                onClick={() => setEditingAdmin(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editFormError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {editFormError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Email (Immutable)
                </label>
                <input
                  type="text"
                  disabled
                  value={editingAdmin.email}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-border text-muted-foreground cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-3.5 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs text-muted-foreground hover:text-foreground border border-border cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-xs font-medium text-primary-foreground shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetPasswordAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>Reset Admin Password</span>
              </h3>
              <button
                onClick={() => setResetPasswordAdmin(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Setting new credentials for{" "}
              <span className="font-mono text-foreground font-semibold">
                {resetPasswordAdmin.email}
              </span>
            </p>

            {resetFormError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {resetFormError}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  New Password (min 8 chars)
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 pr-9 py-2 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showResetPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showResetPassword ? "text" : "password"}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordAdmin(null)}
                  className="px-3.5 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs text-muted-foreground hover:text-foreground border border-border cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-medium text-white shadow-md shadow-amber-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReset ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
