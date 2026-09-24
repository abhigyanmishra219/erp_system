"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Filter,
  Users,
  BookOpen,
  Building2,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  RefreshCw,
  Eye,
  CalendarCheck,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import LockedModuleGate from "@/components/subscription/LockedModuleGate";

interface AcademicYear {
  id: string;
  _id?: string;
  name: string;
  status?: string;
  isCurrent?: boolean;
}

interface ClassItem {
  id: string;
  _id?: string;
  name: string;
  code?: string;
  academicYearId: string;
  sections?: SectionItem[];
}

interface SectionItem {
  id: string;
  _id?: string;
  name: string;
  classId: string;
}

interface SubjectItem {
  id: string;
  _id?: string;
  subjectId?: string;
  name: string;
  code: string;
}

interface TeacherItem {
  id: string;
  _id?: string;
  name: string;
  email?: string;
}

interface TimetableEntry {
  _id: string;
  academicYearId: { _id: string; name: string };
  classId: { _id: string; name: string; code?: string };
  sectionId: { _id: string; name: string };
  subjectId: { _id: string; name: string; code?: string };
  teacherId: { _id: string; name: string; email?: string; phone?: string };
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  startTime: string;
  endTime: string;
  room?: string;
  isActive: boolean;
}

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export default function AdminTimetablePage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectItem[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeacherItem[]>([]);

  // Selection & Filter states
  const [viewMode, setViewMode] = useState<"CLASS" | "TEACHER">("CLASS");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [activeMobileDay, setActiveMobileDay] = useState<string>("MONDAY");

  // Timetable Entries & Loading states
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [modalFormData, setModalFormData] = useState({
    academicYearId: "",
    classId: "",
    sectionId: "",
    subjectId: "",
    teacherId: "",
    dayOfWeek: "MONDAY",
    startTime: "09:00",
    endTime: "10:00",
    room: "",
  });

  // Modal dynamic options
  const [modalClasses, setModalClasses] = useState<ClassItem[]>([]);
  const [modalSections, setModalSections] = useState<SectionItem[]>([]);
  const [modalSubjects, setModalSubjects] = useState<SubjectItem[]>([]);
  const [modalTeachers, setModalTeachers] = useState<TeacherItem[]>([]);
  const [assignedTeachers, setAssignedTeachers] = useState<TeacherItem[]>([]);
  const [conflictWarning, setConflictWarning] = useState<{ hasConflict: boolean; message?: string } | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Initial Metadata Loading
  useEffect(() => {
    async function fetchInitialMetadata() {
      try {
        setLoading(true);
        const [yearsRes, classesRes, teachersRes, subjectsRes] = await Promise.all([
          fetch("/api/admin/academic-years"),
          fetch("/api/admin/classes"),
          fetch("/api/admin/teachers?limit=500&status=ACTIVE"),
          fetch("/api/admin/subjects"),
        ]);

        const [yearsData, classesData, teachersData, subjectsData] = await Promise.all([
          yearsRes.json(),
          classesRes.json(),
          teachersRes.json(),
          subjectsRes.json(),
        ]);

        let activeYearId = "";
        if (yearsData.success && yearsData.data?.academicYears) {
          const list: AcademicYear[] = yearsData.data.academicYears.map((y: any) => ({
            id: y.id || y._id,
            name: y.name,
            status: y.status,
            isCurrent: y.status === "ACTIVE" || y.isCurrent,
          }));
          setAcademicYears(list);

          const current = list.find((y) => y.isCurrent || y.status === "ACTIVE") || list[0];
          if (current) {
            activeYearId = current.id;
            setSelectedYearId(current.id);
          }
        }

        let loadedClasses: ClassItem[] = [];
        if (classesData.success && classesData.data?.classes) {
          loadedClasses = classesData.data.classes.map((c: any) => ({
            id: c.id || c._id,
            name: c.name,
            code: c.code,
            academicYearId: (c.academicYearId as any)?.id || c.academicYearId?.toString() || c.academicYearId,
            sections: (c.sections || []).map((s: any) => ({
              id: s.id || s._id,
              name: s.name,
              classId: c.id || c._id,
            })),
          }));
          setClasses(loadedClasses);
        }

        if (teachersData.success && teachersData.data?.teachers) {
          const loadedTeachers: TeacherItem[] = teachersData.data.teachers.map((t: any) => ({
            id: t.id || t._id,
            name:
              t.fullName ||
              [t.firstName, t.middleName, t.lastName].filter(Boolean).join(" ") ||
              t.name ||
              "Teacher",
            email: t.email,
          }));
          setAllTeachers(loadedTeachers);
          setModalTeachers(loadedTeachers);
        }

        if (subjectsData.success && subjectsData.data?.subjects) {
          const loadedSubjects: SubjectItem[] = subjectsData.data.subjects.map((s: any) => ({
            id: s.id || s._id,
            name: s.name,
            code: s.code,
          }));
          setAllSubjects(loadedSubjects);
          setModalSubjects(loadedSubjects);
        }

        // Set initial default class and section for view
        if (loadedClasses.length > 0) {
          const yearClasses = activeYearId
            ? loadedClasses.filter((c) => c.academicYearId === activeYearId)
            : loadedClasses;
          const initialCls = yearClasses[0] || loadedClasses[0];
          if (initialCls) {
            setSelectedClassId(initialCls.id);
            if (initialCls.sections && initialCls.sections.length > 0) {
              setSections(initialCls.sections);
              setSelectedSectionId(initialCls.sections[0].id);
            }
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load timetable metadata");
      } finally {
        setLoading(false);
      }
    }

    fetchInitialMetadata();
  }, []);

  // Update section dropdown when selected class in filter bar changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId("");
      return;
    }

    const cls = classes.find((c) => c.id === selectedClassId);
    if (cls && cls.sections && cls.sections.length > 0) {
      setSections(cls.sections);
      setSelectedSectionId(cls.sections[0].id);
    } else {
      setSections([]);
      setSelectedSectionId("");
    }
  }, [selectedClassId, classes]);

  // Fetch Timetable Entries when filters change
  const fetchEntries = useCallback(async () => {
    if (!selectedYearId) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("academicYearId", selectedYearId);

      if (viewMode === "CLASS") {
        if (selectedClassId) params.append("classId", selectedClassId);
        if (selectedSectionId) params.append("sectionId", selectedSectionId);
      } else if (viewMode === "TEACHER") {
        if (selectedTeacherId) params.append("teacherId", selectedTeacherId);
      }

      const res = await fetch(`/api/admin/timetable?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.data) {
        setEntries(data.data.entries || []);
      } else {
        setError(data.error?.message || "Failed to fetch timetable");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, selectedClassId, selectedSectionId, selectedTeacherId, viewMode]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Load class-specific subjects for modal
  const loadClassSubjects = async (classId: string) => {
    if (!classId) {
      setModalSubjects(allSubjects);
      return;
    }

    try {
      const res = await fetch(`/api/admin/classes/${classId}/subjects`);
      const data = await res.json();
      if (data.success && data.data?.subjects && data.data.subjects.length > 0) {
        const classSubs: SubjectItem[] = data.data.subjects.map((cs: any) => ({
          id: cs.subjectId || cs.id,
          name: cs.name,
          code: cs.code,
        }));
        setModalSubjects(classSubs);
        return classSubs;
      }
    } catch (err) {
      console.error("Failed to load class curriculum subjects:", err);
    }

    // Fallback to all school subjects if none mapped
    setModalSubjects(allSubjects);
    return allSubjects;
  };

  // Load available teachers for modal based on assignment
  const loadAvailableTeachers = async (
    yearId: string,
    classId: string,
    sectionId: string,
    subjectId?: string
  ) => {
    if (!yearId || !classId || !sectionId) {
      setAssignedTeachers([]);
      setModalTeachers(allTeachers);
      return;
    }

    try {
      const params = new URLSearchParams({
        academicYearId: yearId,
        classId,
        sectionId,
      });
      if (subjectId) params.append("subjectId", subjectId);

      const res = await fetch(`/api/admin/teachers/available-for-assignment?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.data?.teachers) && data.data.teachers.length > 0) {
        const assigned: TeacherItem[] = data.data.teachers.map((t: any) => ({
          id: t.id || t._id,
          name:
            t.fullName ||
            [t.firstName, t.middleName, t.lastName].filter(Boolean).join(" ") ||
            t.name ||
            "Teacher",
        }));
        setAssignedTeachers(assigned);
      } else {
        setAssignedTeachers([]);
      }
    } catch (err) {
      console.error("Failed to query available assigned teachers:", err);
      setAssignedTeachers([]);
    }

    setModalTeachers(allTeachers);
  };

  // Handle modal Academic Year change
  const handleModalAcademicYearChange = async (yearId: string) => {
    const yearClasses = classes.filter((c) => !yearId || c.academicYearId === yearId);
    setModalClasses(yearClasses);

    const initialCls = yearClasses[0];
    const initialSections = initialCls?.sections || [];
    setModalSections(initialSections);

    const newClassId = initialCls?.id || "";
    const newSectionId = initialSections[0]?.id || "";

    setModalFormData((prev) => ({
      ...prev,
      academicYearId: yearId,
      classId: newClassId,
      sectionId: newSectionId,
      subjectId: "",
    }));

    if (newClassId) {
      await loadClassSubjects(newClassId);
      await loadAvailableTeachers(yearId, newClassId, newSectionId);
    }
  };

  // Handle modal Class change
  const handleModalClassChange = async (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    const clsSections = cls?.sections || [];
    setModalSections(clsSections);

    const newSectionId = clsSections[0]?.id || "";

    setModalFormData((prev) => ({
      ...prev,
      classId,
      sectionId: newSectionId,
      subjectId: "",
    }));

    await loadClassSubjects(classId);
    await loadAvailableTeachers(modalFormData.academicYearId, classId, newSectionId);
  };

  // Handle modal Section change
  const handleModalSectionChange = async (sectionId: string) => {
    setModalFormData((prev) => ({
      ...prev,
      sectionId,
    }));

    await loadAvailableTeachers(
      modalFormData.academicYearId,
      modalFormData.classId,
      sectionId,
      modalFormData.subjectId
    );
  };

  // Handle modal Subject change
  const handleModalSubjectChange = async (subjectId: string) => {
    setModalFormData((prev) => ({
      ...prev,
      subjectId,
    }));

    await loadAvailableTeachers(
      modalFormData.academicYearId,
      modalFormData.classId,
      modalFormData.sectionId,
      subjectId
    );
  };

  // Open Create Modal
  const openCreateModal = async () => {
    setEditingEntry(null);
    setModalError(null);
    setConflictWarning(null);

    const effectiveYearId = selectedYearId || academicYears[0]?.id || "";
    const yearClasses = classes.filter((c) => !effectiveYearId || c.academicYearId === effectiveYearId);
    setModalClasses(yearClasses);

    const initialCls = yearClasses.find((c) => c.id === selectedClassId) || yearClasses[0] || classes[0];
    const initialClassId = initialCls?.id || "";
    const clsSections = initialCls?.sections || [];
    setModalSections(clsSections);

    const initialSectionId =
      clsSections.find((s) => s.id === selectedSectionId)?.id || clsSections[0]?.id || "";

    setModalFormData({
      academicYearId: effectiveYearId,
      classId: initialClassId,
      sectionId: initialSectionId,
      subjectId: "",
      teacherId: selectedTeacherId || "",
      dayOfWeek: "MONDAY",
      startTime: "09:00",
      endTime: "10:00",
      room: "",
    });

    setIsModalOpen(true);

    if (allTeachers.length === 0) {
      fetch("/api/admin/teachers?limit=500&status=ACTIVE")
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data?.teachers) {
            const list: TeacherItem[] = d.data.teachers.map((t: any) => ({
              id: t.id || t._id,
              name:
                t.fullName ||
                [t.firstName, t.middleName, t.lastName].filter(Boolean).join(" ") ||
                t.name ||
                "Teacher",
              email: t.email,
            }));
            setAllTeachers(list);
            setModalTeachers(list);
          }
        })
        .catch(console.error);
    }

    if (initialClassId) {
      await loadClassSubjects(initialClassId);
      await loadAvailableTeachers(effectiveYearId, initialClassId, initialSectionId);
    }
  };

  // Open Edit Modal
  const openEditModal = async (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setModalError(null);
    setConflictWarning(null);

    const entryYearId = (entry.academicYearId as any)?._id || (entry.academicYearId as any)?.id || entry.academicYearId;
    const entryClassId = (entry.classId as any)?._id || (entry.classId as any)?.id || entry.classId;
    const entrySectionId = (entry.sectionId as any)?._id || (entry.sectionId as any)?.id || entry.sectionId;
    const entrySubjectId = (entry.subjectId as any)?._id || (entry.subjectId as any)?.id || entry.subjectId;
    const entryTeacherId = (entry.teacherId as any)?._id || (entry.teacherId as any)?.id || entry.teacherId;

    const yearClasses = classes.filter((c) => !entryYearId || c.academicYearId === entryYearId);
    setModalClasses(yearClasses);

    const cls = classes.find((c) => c.id === entryClassId);
    setModalSections(cls?.sections || []);

    setModalFormData({
      academicYearId: entryYearId,
      classId: entryClassId,
      sectionId: entrySectionId,
      subjectId: entrySubjectId,
      teacherId: entryTeacherId,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room || "",
    });

    setIsModalOpen(true);

    await loadClassSubjects(entryClassId);
    await loadAvailableTeachers(entryYearId, entryClassId, entrySectionId, entrySubjectId);
  };

  // Real-time conflict preview debounce
  useEffect(() => {
    if (!isModalOpen) return;
    const { academicYearId, classId, sectionId, teacherId, dayOfWeek, startTime, endTime } =
      modalFormData;

    if (!academicYearId || !classId || !sectionId || !teacherId || !startTime || !endTime) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/timetable/check-conflict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            academicYearId,
            classId,
            sectionId,
            teacherId,
            dayOfWeek,
            startTime,
            endTime,
            excludeEntryId: editingEntry?._id,
          }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.hasConflict) {
            setConflictWarning({
              hasConflict: true,
              message: data.data.conflicts[0]?.message || "Scheduling conflict detected",
            });
          } else {
            setConflictWarning(null);
          }
        }
      } catch (err) {
        console.error("Conflict check error:", err);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [modalFormData, isModalOpen, editingEntry]);

  // Submit Modal Form
  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    // Explicit field validations before submitting
    if (!modalFormData.academicYearId) {
      setModalError("Academic Year is required");
      setSubmitting(false);
      return;
    }

    if (!modalFormData.classId) {
      setModalError("Class is required");
      setSubmitting(false);
      return;
    }

    if (!modalFormData.sectionId) {
      setModalError("Section is required");
      setSubmitting(false);
      return;
    }

    if (!modalFormData.subjectId) {
      setModalError("Subject is required");
      setSubmitting(false);
      return;
    }

    if (!modalFormData.teacherId) {
      setModalError("Teacher is required");
      setSubmitting(false);
      return;
    }

    try {
      const url = editingEntry
        ? `/api/admin/timetable/${editingEntry._id}`
        : "/api/admin/timetable";
      const method = editingEntry ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modalFormData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save timetable entry");
      }

      setIsModalOpen(false);
      await fetchEntries();
    } catch (err: any) {
      setModalError(err.message || "Failed to save timetable entry");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Timetable Entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this timetable slot?")) return;

    try {
      const res = await fetch(`/api/admin/timetable/${entryId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error?.message || "Failed to delete entry");
        return;
      }

      await fetchEntries();
    } catch (err: any) {
      alert(err.message || "Failed to delete timetable entry");
    }
  };

  // Group entries by Day of Week
  const groupedEntriesByDay = useMemo(() => {
    const grouped: Record<string, TimetableEntry[]> = {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: [],
    };

    entries.forEach((e) => {
      if (grouped[e.dayOfWeek]) {
        grouped[e.dayOfWeek].push(e);
      }
    });

    return grouped;
  }, [entries]);

  return (
    <LockedModuleGate moduleKey="TIMETABLE">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-indigo-600" />
            Timetable
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage class schedules, teacher schedules, and timetable conflicts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchEntries}
            className="p-2.5 text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-xs"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Timetable Entry
          </button>
        </div>
      </div>

      {/* Filter & View Mode Controls */}
      <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Academic Year */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Academic Year
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-gray-50/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-gray-800"
            >
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name} {year.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              View Schedule By
            </label>
            <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode("CLASS")}
                className={`py-1.5 text-xs font-semibold rounded-md transition ${
                  viewMode === "CLASS"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Class Section
              </button>
              <button
                type="button"
                onClick={() => setViewMode("TEACHER")}
                className={`py-1.5 text-xs font-semibold rounded-md transition ${
                  viewMode === "TEACHER"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Teacher
              </button>
            </div>
          </div>

          {/* Dynamic Class & Section Selectors */}
          {viewMode === "CLASS" && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-gray-50/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-gray-800"
                >
                  <option value="">Select Class</option>
                  {classes
                    .filter((c) => !selectedYearId || c.academicYearId === selectedYearId)
                    .map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} {cls.code ? `(${cls.code})` : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Section
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  disabled={!selectedClassId || sections.length === 0}
                  className="w-full px-3.5 py-2 text-sm bg-gray-50/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-gray-800 disabled:opacity-50"
                >
                  <option value="">Select Section</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Teacher Selector */}
          {viewMode === "TEACHER" && (
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Teacher
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-gray-50/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-gray-800"
              >
                <option value="">Select Teacher (All)</option>
                {allTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.email ? `(${t.email})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mobile Day Navigation Tabs */}
      <div className="flex md:hidden overflow-x-auto gap-2 pb-2">
        {DAYS.slice(0, 6).map((day) => {
          const count = groupedEntriesByDay[day]?.length || 0;
          return (
            <button
              key={day}
              onClick={() => setActiveMobileDay(day)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1.5 transition ${
                activeMobileDay === day
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-gray-700 border border-gray-200"
              }`}
            >
              <span>{day.substring(0, 3)}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded-full ${
                    activeMobileDay === day ? "bg-indigo-800 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Weekly Desktop Grid View */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="grid grid-cols-6 divide-x divide-gray-200 border-b border-gray-200 bg-gray-50/75">
          {DAYS.slice(0, 6).map((day) => (
            <div key={day} className="py-3 px-4 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                {day}
              </span>
              <span className="block text-[11px] text-gray-500 font-medium mt-0.5">
                {groupedEntriesByDay[day]?.length || 0} slots
              </span>
            </div>
          ))}
        </div>

        {/* Day Columns */}
        <div className="grid grid-cols-6 divide-x divide-gray-200 min-h-[420px]">
          {DAYS.slice(0, 6).map((day) => {
            const dayEntries = groupedEntriesByDay[day] || [];
            return (
              <div key={day} className="p-3 space-y-3 bg-gray-50/20">
                {dayEntries.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center p-2">
                    <Clock className="w-5 h-5 text-gray-300 mb-1" />
                    <span className="text-xs text-gray-400 font-medium">No slots</span>
                  </div>
                ) : (
                  dayEntries.map((entry) => (
                    <div
                      key={entry._id}
                      className="p-3 bg-white rounded-lg border border-gray-200/90 shadow-2xs hover:shadow-xs transition group relative"
                    >
                      {/* Time pill */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3" />
                          {entry.startTime} - {entry.endTime}
                        </span>

                        <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(entry)}
                            className="p-1 text-gray-500 hover:text-indigo-600 rounded hover:bg-gray-100"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry._id)}
                            className="p-1 text-gray-500 hover:text-red-600 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Subject Name */}
                      <div className="text-xs font-bold text-gray-900 truncate">
                        {(entry.subjectId as any)?.name || "Subject"}
                      </div>

                      {/* Teacher & Class Details */}
                      <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
                        <div className="flex items-center gap-1 text-gray-600 truncate">
                          <Users className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{(entry.teacherId as any)?.name || "Teacher"}</span>
                        </div>
                        {viewMode === "TEACHER" && (
                          <div className="flex items-center gap-1 text-gray-600 truncate">
                            <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>
                              {(entry.classId as any)?.name} - {(entry.sectionId as any)?.name}
                            </span>
                          </div>
                        )}
                        {entry.room && (
                          <div className="text-[10px] text-gray-400 font-medium">
                            Room: {entry.room}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {(groupedEntriesByDay[activeMobileDay] || []).length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-500">
              No timetable entries scheduled for {activeMobileDay.toLowerCase()}
            </p>
          </div>
        ) : (
          (groupedEntriesByDay[activeMobileDay] || []).map((entry) => (
            <div
              key={entry._id}
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {entry.startTime} - {entry.endTime}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(entry)}
                    className="p-1.5 text-gray-600 hover:text-indigo-600 bg-gray-50 rounded"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry._id)}
                    className="p-1.5 text-gray-600 hover:text-red-600 bg-gray-50 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-sm font-bold text-gray-900">
                {(entry.subjectId as any)?.name}
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <div>Teacher: {(entry.teacherId as any)?.name}</div>
                <div>
                  Class: {(entry.classId as any)?.name} - {(entry.sectionId as any)?.name}
                </div>
                {entry.room && <div>Room: {entry.room}</div>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Timetable Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                {editingEntry ? "Edit Timetable Entry" : "Add Timetable Entry"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="p-6 space-y-4">
              {/* Conflict Warning Alert */}
              {conflictWarning && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Scheduling Conflict Warning:</span>
                    <span>{conflictWarning.message}</span>
                  </div>
                </div>
              )}

              {/* Modal Error */}
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Academic Year */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Academic Year *
                </label>
                <select
                  value={modalFormData.academicYearId}
                  onChange={(e) => handleModalAcademicYearChange(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.isCurrent ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class & Section (Grid 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Class *</label>
                  <select
                    value={modalFormData.classId}
                    onChange={(e) => handleModalClassChange(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">Select Class</option>
                    {modalClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Section *
                  </label>
                  <select
                    value={modalFormData.sectionId}
                    onChange={(e) => handleModalSectionChange(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">Select Section</option>
                    {modalSections.map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject & Teacher (Grid 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Subject *
                  </label>
                  <select
                    value={modalFormData.subjectId}
                    onChange={(e) => handleModalSubjectChange(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">Select Subject</option>
                    {modalSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} {sub.code ? `(${sub.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Teacher *
                  </label>
                  <select
                    value={modalFormData.teacherId}
                    onChange={(e) =>
                      setModalFormData((prev) => ({ ...prev, teacherId: e.target.value }))
                    }
                    required
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium bg-white text-gray-900"
                  >
                    <option value="">Select Teacher</option>
                    {assignedTeachers.length > 0 && (
                      <optgroup label="⭐ Assigned Subject Teachers">
                        {assignedTeachers.map((t) => (
                          <option key={`assigned-${t.id}`} value={t.id}>
                            {t.name} (Assigned)
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label={assignedTeachers.length > 0 ? "All Faculty Members" : "Active Faculty"}>
                      {allTeachers.map((t) => (
                        <option key={`all-${t.id}`} value={t.id}>
                          {t.name} {t.email ? `(${t.email})` : ""}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Day of Week & Room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Day of Week *
                  </label>
                  <select
                    value={modalFormData.dayOfWeek}
                    onChange={(e) =>
                      setModalFormData((prev) => ({ ...prev, dayOfWeek: e.target.value as any }))
                    }
                    required
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Room / Lab (Optional)
                  </label>
                  <input
                    type="text"
                    value={modalFormData.room}
                    onChange={(e) =>
                      setModalFormData((prev) => ({ ...prev, room: e.target.value }))
                    }
                    placeholder="e.g. Room 102, Lab 1"
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Start Time & End Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Start Time (HH:mm) *
                  </label>
                  <input
                    type="time"
                    value={modalFormData.startTime}
                    onChange={(e) =>
                      setModalFormData((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    required
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    End Time (HH:mm) *
                  </label>
                  <input
                    type="time"
                    value={modalFormData.endTime}
                    onChange={(e) =>
                      setModalFormData((prev) => ({ ...prev, endTime: e.target.value }))
                    }
                    required
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {submitting
                    ? "Saving..."
                    : editingEntry
                    ? "Update Slot"
                    : "Create Slot"}
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
