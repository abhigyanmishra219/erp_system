"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Plus,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  UserCheck,
  UserX,
  RefreshCw,
  Eye,
  Key,
  X,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Briefcase,
} from "lucide-react";

interface ParentItem {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  relationship: string;
  occupation?: string;
  status: "ACTIVE" | "INACTIVE";
  hasLoginAccount: boolean;
  childrenCount: number;
  createdAt: string;
}

interface CredentialsInfo {
  email: string;
  temporaryPassword: string;
  role: string;
  name: string;
}

export default function ParentsDirectoryPage() {
  const [parents, setParents] = useState<ParentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  // Create Parent Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    relationship: "FATHER" as "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER",
    occupation: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    createLoginAccount: true,
  });

  // Generated credentials modal
  const [createdCredentials, setCreatedCredentials] = useState<CredentialsInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchParents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (search) params.set("search", search);
      if (status !== "ALL") params.set("status", status);

      const res = await fetch(`/api/admin/parents?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to fetch parents directory");
      }

      setParents(json.data.parents || []);
      setTotalPages(json.data.pagination?.totalPages || 1);
      setTotalCount(json.data.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading parents");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, status]);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchParents();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFormError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setCreateFormError("First name and last name are required.");
      return;
    }
    if (!formData.email.trim() || !formData.phone.trim()) {
      setCreateFormError("Valid email and phone number are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          relationship: formData.relationship,
          occupation: formData.occupation.trim(),
          address: {
            street: formData.street.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            postalCode: formData.postalCode.trim(),
          },
          status: "ACTIVE",
          createLoginAccount: formData.createLoginAccount,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create parent profile");
      }

      setIsCreateModalOpen(false);
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        relationship: "FATHER",
        occupation: "",
        street: "",
        city: "",
        state: "",
        postalCode: "",
        createLoginAccount: true,
      });

      if (json.data?.credentials) {
        setCreatedCredentials(json.data.credentials);
      }

      fetchParents();
    } catch (err) {
      setCreateFormError(err instanceof Error ? err.message : "Error creating parent");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-500" />
            Parent & Guardian Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage parent profiles, linked children relationships, and parent portal access.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateFormError(null);
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Parent / Guardian
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by parent name, email, phone, occupation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </form>

        <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
          <span>Showing {parents.length} of {totalCount} parents & guardians</span>
          {(search || status !== "ALL") && (
            <button
              onClick={() => {
                setSearch("");
                setStatus("ALL");
                setPage(1);
              }}
              className="text-indigo-600 hover:text-indigo-500 font-medium underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Parents Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Parent / Guardian</th>
                <th className="px-4 py-3.5">Contact Details</th>
                <th className="px-4 py-3.5">Relationship</th>
                <th className="px-4 py-3.5">Linked Children</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Portal Account</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading parent directory...
                  </td>
                </tr>
              ) : parents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <ShieldCheck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="font-semibold text-foreground">No parents found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search
                        ? "No results matching your query."
                        : "Parents are automatically registered when enrolling students, or you can add them directly."}
                    </p>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add First Parent
                    </button>
                  </td>
                </tr>
              ) : (
                parents.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {p.firstName[0]}
                          {p.lastName[0]}
                        </div>
                        <div>
                          <Link
                            href={`/admin/parents/${p.id}`}
                            className="font-medium text-foreground hover:text-indigo-600 transition-colors"
                          >
                            {p.fullName}
                          </Link>
                          {p.occupation && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              {p.occupation}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-xs space-y-0.5">
                        <div className="text-foreground">{p.email}</div>
                        <div className="text-muted-foreground font-mono">{p.phone}</div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{p.relationship}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-muted rounded-full text-xs font-semibold text-foreground">
                        <Users className="w-3 h-3 text-indigo-500" />
                        {p.childrenCount} {p.childrenCount === 1 ? "child" : "children"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {p.hasLoginAccount ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <UserCheck className="w-3.5 h-3.5" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <UserX className="w-3.5 h-3.5" />
                          Not created
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/admin/parents/${p.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-500" />
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <div className="text-xs text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span> of{" "}
              <span className="font-semibold text-foreground">{totalPages}</span> ({totalCount} total)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Parent */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Add New Parent / Guardian</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createFormError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Verma"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="parent@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Relationship</label>
                  <select
                    value={formData.relationship}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        relationship: e.target.value as "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER",
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  >
                    <option value="FATHER">Father</option>
                    <option value="MOTHER">Mother</option>
                    <option value="GUARDIAN">Legal Guardian</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Occupation (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Doctor, Merchant"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="parentPortalAccount"
                  checked={formData.createLoginAccount}
                  onChange={(e) => setFormData({ ...formData, createLoginAccount: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-border"
                />
                <label htmlFor="parentPortalAccount" className="font-semibold text-foreground cursor-pointer">
                  Create Parent Portal Account (PARENT Role)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                >
                  {isSubmitting ? "Creating..." : "Save Parent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Display Created Credentials */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-7 h-7 flex-shrink-0" />
              <div>
                <h3 className="text-base font-bold text-foreground">Parent Account Created!</h3>
                <p className="text-xs text-muted-foreground">
                  Login credentials generated. Copy and share with parent.
                </p>
              </div>
            </div>

            <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {createdCredentials.name} (PARENT)
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.temporaryPassword}`
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div>
                <span className="text-muted-foreground">Login Email: </span>
                <span className="font-mono font-medium text-foreground">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Temporary Password: </span>
                <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border">
                  {createdCredentials.temporaryPassword}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCreatedCredentials(null)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
              >
                I have saved these credentials
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
