"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Eye,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  GraduationCap,
  ShieldAlert,
  Heart,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  Sparkles,
} from "lucide-react";

interface StudentItem {
  _id: string;
  admissionNumber: string;
  studentId?: string;
  rollNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  dateOfBirth?: string;
  avatarUrl?: string;
  status: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  academicYearName?: string;
  email?: string;
  phone?: string;
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  } | null;
}

interface FilterOptions {
  classes: Array<{ classId: string; className: string }>;
  sections: Array<{ sectionId: string; sectionName: string; classId: string }>;
}

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ classes: [], sections: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Pagination State
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ACTIVE");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Student Detail Modal State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"profile" | "guardians" | "attendance">("profile");

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedClass) params.set("classId", selectedClass);
      if (selectedSection) params.set("sectionId", selectedSection);
      if (selectedStatus) params.set("status", selectedStatus);
      params.set("page", String(currentPage));
      params.set("limit", "15");

      const res = await fetch(`/api/teacher/students?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setStudents(json.data.students || []);
        setFilterOptions(json.data.filterOptions || { classes: [], sections: [] });
        setTotalPages(json.data.pagination?.totalPages || 1);
        setTotalCount(json.data.pagination?.totalCount || 0);
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, selectedClass, selectedSection, selectedStatus, currentPage]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStudents();
  };

  const handleOpenDetail = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsDetailLoading(true);
    setDetailError(null);
    setModalTab("profile");

    try {
      const res = await fetch(`/api/teacher/students/${studentId}`);
      const json = await res.json();
      if (json.success) {
        setDetailData(json.data);
      } else {
        setDetailError(json.error || "Failed to load student details.");
      }
    } catch (err: any) {
      setDetailError(err.message || "Failed to load student details.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedStudentId(null);
    setDetailData(null);
  };

  // Filter sections when class is selected
  const availableSections = selectedClass
    ? filterOptions.sections.filter((s) => s.classId === selectedClass)
    : filterOptions.sections;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            <span>My Students</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Student directory restricted strictly to your assigned classes and sections
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{totalCount} Scoped Student{totalCount === 1 ? "" : "s"}</span>
          </span>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-card hover:bg-surface-2 border border-border text-foreground transition cursor-pointer"
            title="Refresh student roster"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-500" : "text-muted-foreground"}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, roll, admission no..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection("");
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">All Assigned Classes</option>
              {filterOptions.classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">All Assigned Sections</option>
              {availableSections.map((s) => (
                <option key={s.sectionId} value={s.sectionId}>
                  {s.sectionName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ACTIVE">Active Students Only</option>
              <option value="INACTIVE">Inactive Students</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="GRADUATED">Graduated</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>
        </div>

        {/* Filter tags summary */}
        {(search || selectedClass || selectedSection || selectedStatus !== "ACTIVE") && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border text-xs text-muted-foreground">
            <span>Active Filters:</span>
            {search && (
              <span className="px-2 py-0.5 rounded-lg bg-surface-2 border border-border text-foreground flex items-center gap-1">
                Keyword: &quot;{search}&quot;
                <button onClick={() => setSearch("")} className="hover:text-destructive">
                  &times;
                </button>
              </span>
            )}
            {selectedClass && (
              <span className="px-2 py-0.5 rounded-lg bg-surface-2 border border-border text-foreground flex items-center gap-1">
                Class: {filterOptions.classes.find((c) => c.classId === selectedClass)?.className || "Selected"}
                <button onClick={() => setSelectedClass("")} className="hover:text-destructive">
                  &times;
                </button>
              </span>
            )}
            {selectedSection && (
              <span className="px-2 py-0.5 rounded-lg bg-surface-2 border border-border text-foreground flex items-center gap-1">
                Section: {filterOptions.sections.find((s) => s.sectionId === selectedSection)?.sectionName || "Selected"}
                <button onClick={() => setSelectedSection("")} className="hover:text-destructive">
                  &times;
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearch("");
                setSelectedClass("");
                setSelectedSection("");
                setSelectedStatus("ACTIVE");
                setCurrentPage(1);
              }}
              className="text-primary hover:underline font-bold text-[11px] ml-auto"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Student List */}
      {isLoading ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center text-xs text-muted-foreground">
          Loading student roster...
        </div>
      ) : students.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-dashed border-border text-center space-y-2">
          <Users className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-sm text-foreground">No Students Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {filterOptions.classes.length === 0
              ? "You do not have any active class allocations assigned to your teacher profile yet."
              : "No student records matched your selected search keyword or filter criteria."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-2/60 border-b border-border text-muted-foreground font-semibold">
                  <th className="p-3 pl-4">Student</th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3">Roll No</th>
                  <th className="p-3">Class & Section</th>
                  <th className="p-3">Gender</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Emergency Contact</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {students.map((st) => (
                  <tr key={st._id} className="hover:bg-surface-2/40 transition">
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                          {st.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={st.avatarUrl} alt={st.fullName} className="w-full h-full object-cover" />
                          ) : (
                            `${st.firstName?.[0] || "S"}${st.lastName?.[0] || ""}`
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{st.fullName}</p>
                          {st.email && <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{st.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-foreground font-semibold">
                      {st.admissionNumber}
                    </td>
                    <td className="p-3 font-mono text-foreground">
                      {st.rollNumber}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-lg bg-surface-2 border border-border text-foreground font-semibold">
                        {st.className} - {st.sectionName}
                      </span>
                    </td>
                    <td className="p-3 capitalize text-muted-foreground">
                      {st.gender?.toLowerCase() || "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          st.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-surface-3 text-muted-foreground border border-border"
                        }`}
                      >
                        {st.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {st.emergencyContact?.phone ? (
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Phone className="w-3 h-3 text-primary" />
                          <span className="font-mono text-[11px]">{st.emergencyContact.phone}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(st._id)}
                        className="px-2.5 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground font-semibold text-xs flex items-center gap-1.5 ml-auto transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span>Profile</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-muted-foreground">
                Showing Page <strong className="text-foreground">{currentPage}</strong> of{" "}
                <strong className="text-foreground">{totalPages}</strong> ({totalCount} total students)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground disabled:opacity-40 hover:bg-surface-2 transition flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground disabled:opacity-40 hover:bg-surface-2 transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STUDENT DETAIL MODAL */}
      {selectedStudentId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-popover border border-border rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-lg shrink-0 overflow-hidden">
                  {detailData?.student?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={detailData.student.avatarUrl}
                      alt={detailData.student.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    `${detailData?.student?.firstName?.[0] || "S"}${detailData?.student?.lastName?.[0] || ""}`
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-foreground">
                      {detailData?.student?.fullName || "Student Profile"}
                    </h2>
                    {detailData?.student?.status && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          detailData.student.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-surface-3 text-muted-foreground border border-border"
                        }`}
                      >
                        {detailData.student.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Class: <strong className="text-foreground">{detailData?.student?.className} - {detailData?.student?.sectionName}</strong> • Admission No: <strong className="font-mono text-foreground">{detailData?.student?.admissionNumber}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseDetail}
                className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-muted-foreground hover:text-foreground cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isDetailLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Loading student profile details...
              </div>
            ) : detailError ? (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{detailError}</span>
              </div>
            ) : detailData?.student ? (
              <div className="space-y-5">
                {/* Modal Navigation Tabs */}
                <div className="flex border-b border-border gap-2 text-xs">
                  <button
                    onClick={() => setModalTab("profile")}
                    className={`pb-2 font-bold border-b-2 transition cursor-pointer ${
                      modalTab === "profile" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Academic & Personal
                  </button>
                  <button
                    onClick={() => setModalTab("guardians")}
                    className={`pb-2 font-bold border-b-2 transition cursor-pointer ${
                      modalTab === "guardians" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Guardians & Contacts ({detailData.guardians?.length || 0})
                  </button>
                  <button
                    onClick={() => setModalTab("attendance")}
                    className={`pb-2 font-bold border-b-2 transition cursor-pointer ${
                      modalTab === "attendance" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Attendance Record
                  </button>
                </div>

                {/* TAB 1: Profile */}
                {modalTab === "profile" && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
                        <span className="text-[10px] text-muted-foreground">Roll Number</span>
                        <p className="font-bold text-foreground font-mono">{detailData.student.rollNumber || "—"}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
                        <span className="text-[10px] text-muted-foreground">Gender</span>
                        <p className="font-bold text-foreground capitalize">{detailData.student.gender?.toLowerCase() || "—"}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
                        <span className="text-[10px] text-muted-foreground">Blood Group</span>
                        <p className="font-bold text-foreground">{detailData.student.bloodGroup || "—"}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
                        <span className="text-[10px] text-muted-foreground">Date of Birth</span>
                        <p className="font-bold text-foreground">
                          {detailData.student.dateOfBirth ? new Date(detailData.student.dateOfBirth).toLocaleDateString() : "—"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
                        <span className="text-[10px] text-muted-foreground">Admission Date</span>
                        <p className="font-bold text-foreground">
                          {detailData.student.admissionDate ? new Date(detailData.student.admissionDate).toLocaleDateString() : "—"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
                        <span className="text-[10px] text-muted-foreground">Academic Term</span>
                        <p className="font-bold text-foreground">{detailData.student.academicYearName || "Current"}</p>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    {detailData.student.emergencyContact && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Emergency Contact</span>
                        </span>
                        <div className="flex flex-wrap items-center gap-4 text-foreground pt-1">
                          {detailData.student.emergencyContact.name && (
                            <span>Name: <strong>{detailData.student.emergencyContact.name}</strong></span>
                          )}
                          {detailData.student.emergencyContact.relationship && (
                            <span>Relationship: <strong>{detailData.student.emergencyContact.relationship}</strong></span>
                          )}
                          {detailData.student.emergencyContact.phone && (
                            <span>Phone: <strong className="font-mono">{detailData.student.emergencyContact.phone}</strong></span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Address */}
                    {detailData.student.address && (detailData.student.address.street || detailData.student.address.city) && (
                      <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          <span>Residential Address</span>
                        </span>
                        <p className="font-medium text-foreground">
                          {[
                            detailData.student.address.street,
                            detailData.student.address.city,
                            detailData.student.address.state,
                            detailData.student.address.postalCode,
                            detailData.student.address.country,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    )}

                    {/* Medical Info */}
                    {detailData.student.medicalInfo && (
                      <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-500" />
                          <span>Medical Information</span>
                        </span>
                        <p className="text-muted-foreground">
                          Allergies: {detailData.student.medicalInfo.allergies?.join(", ") || "None recorded"} • Conditions: {detailData.student.medicalInfo.conditions?.join(", ") || "None recorded"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Guardians */}
                {modalTab === "guardians" && (
                  <div className="space-y-3 text-xs">
                    {!detailData.guardians || detailData.guardians.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                        No linked guardian records found for this student.
                      </div>
                    ) : (
                      detailData.guardians.map((g: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-xl bg-surface-2 border border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-foreground">{g.parentName}</h4>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-3 border border-border capitalize">
                                {g.relationship?.toLowerCase() || "Guardian"}
                              </span>
                              {g.isPrimaryGuardian && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  Primary
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground pt-1">
                            {g.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-primary" />
                                <span className="font-mono text-foreground">{g.phone}</span>
                              </div>
                            )}
                            {g.email && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-primary" />
                                <span>{g.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 3: Attendance */}
                {modalTab === "attendance" && (
                  <div className="space-y-4 text-xs">
                    <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">Cumulative Attendance</span>
                        <span className="text-lg font-black text-primary">
                          {detailData.attendanceStats?.attendancePercentage || 0}%
                        </span>
                      </div>

                      <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${detailData.attendanceStats?.attendancePercentage || 0}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center">
                        <div className="p-2 rounded-lg bg-card border border-border">
                          <span className="text-[10px] text-muted-foreground">Present</span>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">{detailData.attendanceStats?.presentDays || 0}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-card border border-border">
                          <span className="text-[10px] text-muted-foreground">Late</span>
                          <p className="font-bold text-amber-600 dark:text-amber-400">{detailData.attendanceStats?.lateDays || 0}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-card border border-border">
                          <span className="text-[10px] text-muted-foreground">Absent</span>
                          <p className="font-bold text-destructive">{detailData.attendanceStats?.absentDays || 0}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-card border border-border">
                          <span className="text-[10px] text-muted-foreground">Leaves</span>
                          <p className="font-bold text-blue-600 dark:text-blue-400">{detailData.attendanceStats?.leaveDays || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="pt-2 border-t border-border flex justify-end">
              <button
                onClick={handleCloseDetail}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground font-semibold text-xs transition cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
