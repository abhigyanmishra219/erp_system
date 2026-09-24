"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  BookOpen,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  RotateCw,
  Eye,
  ExternalLink,
  Building2,
  ChevronRight,
  Award,
} from "lucide-react";
import { formatAttendanceDate } from "@/lib/utils/date";
import LockedModuleGate from "@/components/subscription/LockedModuleGate";

interface AcademicYearOption {
  id: string;
  _id?: string;
  name: string;
  status: string;
}

interface ClassOption {
  id: string;
  _id?: string;
  name: string;
  code?: string;
}

interface SectionOption {
  id: string;
  _id?: string;
  name: string;
}

interface SubjectOption {
  id: string;
  _id?: string;
  name: string;
  code?: string;
}

interface TeacherOption {
  id: string;
  _id?: string;
  name: string;
  teacherId?: string;
  firstName?: string;
  lastName?: string;
}

interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  academicYear?: { id: string; name: string } | null;
  class?: { id: string; name: string; code?: string } | null;
  section?: { id: string; name: string } | null;
  subject?: { id: string; name: string; code?: string } | null;
  teacher?: { id: string; name: string } | null;
  assignedDate: string;
  dueDate: string;
  maximumMarks?: number | null;
  attachmentsCount: number;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  submissionStats: {
    total: number;
    submitted: number;
    late: number;
    reviewed: number;
  };
  createdAt: string;
}

export default function AdminAssignmentsPage() {
  // Filter states
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [filterTeachers, setFilterTeachers] = useState<TeacherOption[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data states
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createModalError, setCreateModalError] = useState<string | null>(null);
  const [availableTeachers, setAvailableTeachers] = useState<TeacherOption[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    academicYearId: "",
    classId: "",
    sectionId: "",
    subjectId: "",
    teacherId: "",
    title: "",
    description: "",
    assignedDate: formatAttendanceDate(new Date()),
    dueDate: formatAttendanceDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    maximumMarks: "100",
    attachmentName: "",
    attachmentUrl: "",
  });

  // 1. Initial Load Academic Years & School Teachers for filter bar
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [yearRes, teacherRes] = await Promise.all([
          fetch("/api/admin/academic-years"),
          fetch("/api/admin/teachers?limit=100"),
        ]);
        const yearJson = await yearRes.json();
        const teacherJson = await teacherRes.json();

        if (yearJson.success && yearJson.data) {
          const list: AcademicYearOption[] = yearJson.data.academicYears || yearJson.data;
          setAcademicYears(list);
          const active = list.find((y) => y.status === "ACTIVE") || list[0];
          if (active) {
            setSelectedYearId(active.id || active._id || "");
            setCreateForm((prev) => ({ ...prev, academicYearId: active.id || active._id || "" }));
          }
        }

        if (teacherJson.success && teacherJson.data) {
          const tList: any[] = teacherJson.data.teachers || teacherJson.data;
          setFilterTeachers(
            tList.map((t) => ({
              id: t._id || t.id,
              name: `${t.firstName} ${t.lastName}`.trim(),
              teacherId: t.teacherId,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    }
    loadInitialData();
  }, []);

  // 2. Load Classes when Academic Year changes
  useEffect(() => {
    async function loadClasses() {
      if (!selectedYearId) {
        setClasses([]);
        setSelectedClassId("");
        setSections([]);
        setSelectedSectionId("");
        return;
      }
      try {
        const res = await fetch(`/api/admin/classes?academicYearId=${selectedYearId}`);
        const json = await res.json();
        if (json.success && json.data) {
          const list: ClassOption[] = json.data.classes || json.data;
          setClasses(list);
          if (list.length > 0) {
            setSelectedClassId(list[0].id || list[0]._id || "");
            setCreateForm((prev) => ({ ...prev, classId: list[0].id || list[0]._id || "" }));
          } else {
            setSelectedClassId("");
            setSections([]);
            setSelectedSectionId("");
          }
        }
      } catch (err) {
        console.error("Failed to load classes:", err);
      }
    }
    loadClasses();
  }, [selectedYearId]);

  // 3. Load Sections and Subjects when Class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId("");
      setSubjects([]);
      setSelectedSubjectId("");
      return;
    }
    async function loadSectionsAndSubjects() {
      try {
        const [secRes, subRes] = await Promise.all([
          fetch(`/api/admin/sections?academicYearId=${selectedYearId}&classId=${selectedClassId}`),
          fetch(`/api/admin/classes/${selectedClassId}/subjects?academicYearId=${selectedYearId}`),
        ]);
        const secJson = await secRes.json();
        const subJson = await subRes.json();

        if (secJson.success && secJson.data) {
          const secList: SectionOption[] = secJson.data.sections || secJson.data;
          setSections(secList);
          if (secList.length > 0) {
            setSelectedSectionId(secList[0].id || secList[0]._id || "");
            setCreateForm((prev) => ({ ...prev, sectionId: secList[0].id || secList[0]._id || "" }));
          } else {
            setSelectedSectionId("");
          }
        }

        if (subJson.success && subJson.data) {
          const subList: SubjectOption[] = (subJson.data.subjects || subJson.data).map((s: any) => ({
            id: s.subjectId || s.subject?._id || s._id || s.id,
            name: s.name || s.subject?.name || "Unnamed Subject",
            code: s.code || s.subject?.code || "",
          }));
          setSubjects(subList);
          if (subList.length > 0) {
            setSelectedSubjectId(subList[0].id || "");
            setCreateForm((prev) => ({ ...prev, subjectId: subList[0].id || "" }));
          } else {
            setSelectedSubjectId("");
            setCreateForm((prev) => ({ ...prev, subjectId: "" }));
          }
        }
      } catch (err) {
        console.error("Failed to load sections/subjects:", err);
      }
    }
    loadSectionsAndSubjects();
  }, [selectedClassId, selectedYearId]);

  // 4. Fetch Assignments List
  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (selectedYearId) params.append("academicYearId", selectedYearId);
      if (selectedClassId) params.append("classId", selectedClassId);
      if (selectedSectionId) params.append("sectionId", selectedSectionId);
      if (selectedSubjectId) params.append("subjectId", selectedSubjectId);
      if (selectedTeacherId) params.append("teacherId", selectedTeacherId);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/admin/assignments?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load assignments");
      }
      setAssignments(json.data.assignments || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to fetch assignments");
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYearId, selectedClassId, selectedSectionId, selectedSubjectId, selectedTeacherId, statusFilter, searchQuery]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // 5. Load Available Teachers for assignment creation when class/section/subject changes
  useEffect(() => {
    const yrId = createForm.academicYearId || selectedYearId;
    const clsId = createForm.classId || selectedClassId;
    const secId = createForm.sectionId || selectedSectionId;
    const subId = createForm.subjectId || selectedSubjectId;

    if (!yrId || !clsId || !secId) {
      setAvailableTeachers([]);
      setCreateForm((prev) => ({ ...prev, teacherId: "" }));
      return;
    }

    let isMounted = true;
    async function loadAvailableTeachers() {
      setIsLoadingTeachers(true);
      try {
        const queryParams = new URLSearchParams({
          academicYearId: yrId,
          classId: clsId,
          sectionId: secId,
        });
        if (subId) queryParams.append("subjectId", subId);

        const res = await fetch(`/api/admin/teachers/available-for-assignment?${queryParams.toString()}`);
        const json = await res.json();
        if (isMounted) {
          if (json.success && json.data?.teachers) {
            const list: TeacherOption[] = json.data.teachers;
            setAvailableTeachers(list);
            // If current teacherId is not in list, auto-select if 1 teacher, else reset
            setCreateForm((prev) => {
              const stillValid = list.some((t) => (t.id || t._id) === prev.teacherId);
              if (stillValid) return prev;
              if (list.length === 1) return { ...prev, teacherId: list[0].id || list[0]._id || "" };
              return { ...prev, teacherId: "" };
            });
          } else {
            setAvailableTeachers([]);
            setCreateForm((prev) => ({ ...prev, teacherId: "" }));
          }
        }
      } catch (err) {
        console.error("Failed to load available teachers:", err);
        if (isMounted) {
          setAvailableTeachers([]);
          setCreateForm((prev) => ({ ...prev, teacherId: "" }));
        }
      } finally {
        if (isMounted) setIsLoadingTeachers(false);
      }
    }

    loadAvailableTeachers();
    return () => {
      isMounted = false;
    };
  }, [
    createForm.academicYearId,
    createForm.classId,
    createForm.sectionId,
    createForm.subjectId,
    selectedYearId,
    selectedClassId,
    selectedSectionId,
    selectedSubjectId,
  ]);

  // Handle Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCreateModalError(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const effectiveTeacherId = createForm.teacherId;
      if (!effectiveTeacherId) {
        throw new Error("Please select an assigned teacher for this assignment.");
      }

      const attachments =
        createForm.attachmentName && createForm.attachmentUrl
          ? [
              {
                name: createForm.attachmentName,
                url: createForm.attachmentUrl,
                type: "EXTERNAL_LINK" as const,
              },
            ]
          : [];

      const payload = {
        academicYearId: createForm.academicYearId || selectedYearId,
        classId: createForm.classId || selectedClassId,
        sectionId: createForm.sectionId || selectedSectionId,
        subjectId: createForm.subjectId || selectedSubjectId,
        teacherId: effectiveTeacherId,
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        assignedDate: createForm.assignedDate,
        dueDate: createForm.dueDate,
        maximumMarks: createForm.maximumMarks ? Number(createForm.maximumMarks) : null,
        attachments,
        status: "PUBLISHED",
      };

      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create assignment");
      }

      setSuccessMessage("Assignment created and published successfully!");
      setIsCreateModalOpen(false);
      setCreateModalError(null);
      setCreateForm({
        academicYearId: selectedYearId,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        subjectId: selectedSubjectId,
        teacherId: "",
        title: "",
        description: "",
        assignedDate: formatAttendanceDate(new Date()),
        dueDate: formatAttendanceDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        maximumMarks: "100",
        attachmentName: "",
        attachmentUrl: "",
      });
      fetchAssignments();
    } catch (err: any) {
      setCreateModalError(err.message || "Failed to create assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // KPIs
  const totalCount = assignments.length;
  const publishedCount = assignments.filter((a) => a.status === "PUBLISHED").length;
  const totalSubmissions = assignments.reduce((acc, a) => acc + a.submissionStats.total, 0);
  const reviewedSubmissions = assignments.reduce((acc, a) => acc + a.submissionStats.reviewed, 0);

  return (
    <LockedModuleGate moduleKey="ASSIGNMENTS">
      <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-primary" />
            <span>Assignments</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Create, manage, and review academic coursework and student submissions across classes and subjects.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:opacity-90 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Assignment</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Total Assignments
          </span>
          <span className="text-2xl font-extrabold text-foreground">{totalCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Active / Published
          </span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {publishedCount}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
            Submissions Received
          </span>
          <span className="text-2xl font-extrabold text-primary">{totalSubmissions}</span>
        </div>
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
            Reviewed Submissions
          </span>
          <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
            {reviewedSubmissions}
          </span>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Academic Session */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Academic Session
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {academicYears.map((yr) => (
                <option key={yr.id || yr._id} value={yr.id || yr._id}>
                  {yr.name} {yr.status === "ACTIVE" ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Section
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Sections</option>
              {sections.map((s) => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  Section {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id || sub._id} value={sub.id || sub._id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Teacher */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Teacher
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Teachers</option>
              {filterTeachers.map((t) => (
                <option key={t.id || t._id} value={t.id || t._id}>
                  {t.name} {t.teacherId ? `(${t.teacherId})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assignments by title or instructions..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-2 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Assignments List Table / Empty State */}
      {isLoading ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <RotateCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading assignments coursework roster...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No assignments found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No assignments match your selected class, section, or search filters. Create your first assignment to assign tasks to students.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Assignment
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Title & Subject</th>
                  <th className="py-3 px-4">Class & Section</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Teacher</th>
                  <th className="py-3 px-4">Submissions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assignments.map((item) => {
                  const isDuePast = new Date(item.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);

                  return (
                    <tr key={item.id} className="hover:bg-surface-2/40 transition-colors">
                      {/* Title & Subject */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <Link
                            href={`/admin/assignments/${item.id}`}
                            className="font-bold text-foreground hover:text-primary transition-colors block"
                          >
                            {item.title}
                          </Link>
                          <span className="inline-block text-[10px] text-muted-foreground font-semibold">
                            {item.subject?.name || "General"}
                            {item.maximumMarks ? ` • Max: ${item.maximumMarks} marks` : ""}
                          </span>
                        </div>
                      </td>

                      {/* Class & Section */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-foreground">
                          {item.class?.name || "—"}
                        </span>
                        {item.section?.name && (
                          <span className="text-muted-foreground"> - Sec {item.section.name}</span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className={isDuePast ? "text-rose-600 dark:text-rose-400 font-bold" : "text-foreground"}>
                            {formatAttendanceDate(new Date(item.dueDate))}
                          </span>
                        </div>
                      </td>

                      {/* Teacher */}
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {item.teacher?.name || "Administrator"}
                      </td>

                      {/* Submissions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                            {item.submissionStats.submitted + item.submissionStats.late + item.submissionStats.reviewed} submitted
                          </span>
                          {item.submissionStats.reviewed > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {item.submissionStats.reviewed} reviewed
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === "PUBLISHED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : item.status === "DRAFT"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-surface-2 text-muted-foreground"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Action View Detail */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/assignments/${item.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground text-xs font-semibold transition-colors"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border">
            {assignments.map((item) => (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/admin/assignments/${item.id}`}
                      className="font-bold text-xs text-foreground hover:text-primary block"
                    >
                      {item.title}
                    </Link>
                    <span className="text-[10px] text-muted-foreground">
                      {item.class?.name} - Sec {item.section?.name} • {item.subject?.name}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {item.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Due: {formatAttendanceDate(new Date(item.dueDate))}</span>
                  <Link
                    href={`/admin/assignments/${item.id}`}
                    className="text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    View Submissions <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE ASSIGNMENT MODAL                                                    */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span>Create New Assignment</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Chapter 4 Polynomials Worksheet"
                  className="w-full p-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Instructions / Description *</label>
                <textarea
                  required
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Write clear instructions for students..."
                  className="w-full p-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Class, Section, Subject Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Class *</label>
                  <select
                    required
                    value={createForm.classId || selectedClassId}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, classId: e.target.value });
                      setSelectedClassId(e.target.value);
                    }}
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {classes.map((c) => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Section *</label>
                  <select
                    required
                    value={createForm.sectionId || selectedSectionId}
                    onChange={(e) => setCreateForm({ ...createForm, sectionId: e.target.value })}
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {sections.map((s) => (
                      <option key={s.id || s._id} value={s.id || s._id}>
                        Section {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Subject *</label>
                  <select
                    required
                    value={createForm.subjectId || selectedSubjectId}
                    onChange={(e) => setCreateForm({ ...createForm, subjectId: e.target.value })}
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id || sub._id} value={sub.id || sub._id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Responsible Teacher Selection */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-muted-foreground">Assigned Teacher *</label>
                  {isLoadingTeachers && (
                    <span className="text-[10px] text-primary animate-pulse font-medium">Checking assignments...</span>
                  )}
                </div>
                {availableTeachers.length === 0 && !isLoadingTeachers ? (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>No teacher is assigned to this class, section and subject.</span>
                  </div>
                ) : (
                  <select
                    required
                    value={createForm.teacherId}
                    onChange={(e) => setCreateForm({ ...createForm, teacherId: e.target.value })}
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {availableTeachers.length > 1 && <option value="">-- Select Responsible Teacher --</option>}
                    {availableTeachers.map((t) => (
                      <option key={t.id || t._id} value={t.id || t._id}>
                        {t.name} {t.teacherId ? `(${t.teacherId})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Dates & Maximum Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Assigned Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.assignedDate}
                    onChange={(e) => setCreateForm({ ...createForm, assignedDate: e.target.value })}
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Max Marks (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.maximumMarks}
                    onChange={(e) => setCreateForm({ ...createForm, maximumMarks: e.target.value })}
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Attachment / Reference Resource */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-surface-2/60 border border-border">
                <span className="text-xs font-bold text-foreground block">Reference Material / External Resource</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={createForm.attachmentName}
                    onChange={(e) => setCreateForm({ ...createForm, attachmentName: e.target.value })}
                    placeholder="Resource title (e.g. Problem Set PDF)"
                    className="w-full p-2 rounded-xl bg-card border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="url"
                    value={createForm.attachmentUrl}
                    onChange={(e) => setCreateForm({ ...createForm, attachmentUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full p-2 rounded-xl bg-card border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Modal Error Message */}
              {createModalError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createModalError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || availableTeachers.length === 0 || !createForm.teacherId}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <RotateCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Publish Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </LockedModuleGate>
  );
}
