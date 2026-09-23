"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  Edit3,
  Trash2,
  Users,
  Award,
  Link2,
  Save,
  Check,
  ChevronRight,
  Sparkles,
  ExternalLink,
  MessageSquare,
} from "lucide-react";

interface AssignmentItem {
  _id: string;
  title: string;
  description: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  academicYearId: string;
  academicYearName: string;
  assignedDate: string;
  dueDate: string;
  maximumMarks?: number | null;
  attachments: Array<{
    name: string;
    url: string;
    type?: string;
  }>;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  submissionsSummary: {
    total: number;
    reviewed: number;
    pending: number;
    late: number;
  };
  createdAt: string;
}

interface FilterOptions {
  classes: Array<{ classId: string; className: string }>;
  sections: Array<{ sectionId: string; sectionName: string; classId: string }>;
  subjects: Array<{ subjectId: string; subjectName: string; classId?: string; sectionId?: string }>;
  assignedAllocations: Array<{
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    subjectId?: string;
    subjectName?: string;
  }>;
}

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    classes: [],
    sections: [],
    subjects: [],
    assignedAllocations: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    academicYearId: "",
    classId: "",
    sectionId: "",
    subjectId: "",
    title: "",
    description: "",
    assignedDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
    maximumMarks: 100 as number | null,
    status: "PUBLISHED" as "PUBLISHED" | "DRAFT" | "ARCHIVED",
    attachmentName: "",
    attachmentUrl: "",
  });
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Submissions Modal State
  const [selectedAssignmentForSubmissions, setSelectedAssignmentForSubmissions] = useState<string | null>(null);
  const [submissionsData, setSubmissionsData] = useState<any>(null);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [gradingStudentId, setGradingStudentId] = useState<string | null>(null);
  const [gradingMarks, setGradingMarks] = useState<number | string>("");
  const [gradingFeedback, setGradingFeedback] = useState("");
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  // Fetch Assignments Feed
  const fetchAssignments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedClass) params.set("classId", selectedClass);
      if (selectedSection) params.set("sectionId", selectedSection);
      if (selectedSubject) params.set("subjectId", selectedSubject);
      if (selectedStatus) params.set("status", selectedStatus);
      params.set("page", String(currentPage));
      params.set("limit", "15");

      const res = await fetch(`/api/teacher/assignments?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setAssignments(json.data.assignments || []);
        setFilterOptions(json.data.filterOptions || { classes: [], sections: [], subjects: [], assignedAllocations: [] });
        setTotalPages(json.data.pagination?.totalPages || 1);
        setTotalCount(json.data.pagination?.totalCount || 0);

        // Pre-fill default form values if opening create
        if (!formData.classId && json.data.filterOptions?.classes?.length > 0) {
          const firstCls = json.data.filterOptions.classes[0].classId;
          const matchingSec = json.data.filterOptions.sections.find((s: any) => s.classId === firstCls);
          const matchingSub = json.data.filterOptions.assignedAllocations.find((a: any) => a.classId === firstCls);

          setFormData((prev) => ({
            ...prev,
            classId: firstCls,
            sectionId: matchingSec ? matchingSec.sectionId : "",
            subjectId: matchingSub && matchingSub.subjectId ? matchingSub.subjectId : "",
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load assignments:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, selectedClass, selectedSection, selectedSubject, selectedStatus, currentPage]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAssignments();
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingAssignmentId(null);
    setFormError(null);

    const firstCls = filterOptions.classes[0]?.classId || "";
    const matchingSec = filterOptions.sections.find((s) => s.classId === firstCls)?.sectionId || "";
    const matchingSub = filterOptions.assignedAllocations.find((a) => a.classId === firstCls)?.subjectId || "";

    setFormData({
      academicYearId: "600000000000000000000000",
      classId: firstCls,
      sectionId: matchingSec,
      subjectId: matchingSub,
      title: "",
      description: "",
      assignedDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      maximumMarks: 100,
      status: "PUBLISHED",
      attachmentName: "",
      attachmentUrl: "",
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (asgn: AssignmentItem) => {
    setEditingAssignmentId(asgn._id);
    setFormError(null);
    setFormData({
      academicYearId: asgn.academicYearId || "600000000000000000000000",
      classId: asgn.classId,
      sectionId: asgn.sectionId,
      subjectId: asgn.subjectId,
      title: asgn.title,
      description: asgn.description,
      assignedDate: new Date(asgn.assignedDate).toISOString().split("T")[0],
      dueDate: new Date(asgn.dueDate).toISOString().split("T")[0],
      maximumMarks: asgn.maximumMarks ?? 100,
      status: asgn.status,
      attachmentName: asgn.attachments?.[0]?.name || "",
      attachmentUrl: asgn.attachments?.[0]?.url || "",
    });
    setIsModalOpen(true);
  };

  // Submit Create / Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingForm(true);
    setFormError(null);

    try {
      const attachments = formData.attachmentUrl
        ? [
            {
              name: formData.attachmentName || "Assignment Attachment",
              url: formData.attachmentUrl,
              type: "EXTERNAL_LINK",
            },
          ]
        : [];

      const payload: any = {
        academicYearId: formData.academicYearId || "600000000000000000000000",
        classId: formData.classId,
        sectionId: formData.sectionId,
        subjectId: formData.subjectId,
        title: formData.title,
        description: formData.description,
        assignedDate: formData.assignedDate,
        dueDate: formData.dueDate,
        maximumMarks: formData.maximumMarks ? Number(formData.maximumMarks) : null,
        status: formData.status,
        attachments,
      };

      const url = editingAssignmentId
        ? `/api/teacher/assignments/${editingAssignmentId}`
        : "/api/teacher/assignments";
      const method = editingAssignmentId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save assignment.");
      }

      setIsModalOpen(false);
      fetchAssignments();
    } catch (err: any) {
      setFormError(err.message || "Failed to submit assignment.");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Delete Assignment
  const handleDeleteAssignment = async (asgnId: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;

    try {
      const res = await fetch(`/api/teacher/assignments/${asgnId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        fetchAssignments();
      } else {
        alert(json.error || "Failed to delete assignment.");
      }
    } catch {
      alert("Error deleting assignment.");
    }
  };

  // Open Submissions View
  const handleOpenSubmissions = async (asgnId: string) => {
    setSelectedAssignmentForSubmissions(asgnId);
    setIsLoadingSubmissions(true);
    setGradingStudentId(null);

    try {
      const res = await fetch(`/api/teacher/assignments/${asgnId}/submissions`);
      const json = await res.json();
      if (json.success) {
        setSubmissionsData(json.data);
      }
    } catch (err) {
      console.error("Failed to load submissions:", err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  // Start Inline Grading
  const handleStartGrading = (submission: any) => {
    setGradingStudentId(submission._id);
    setGradingMarks(submission.marks ?? "");
    setGradingFeedback(submission.feedback || "");
    setGradeError(null);
  };

  // Save Grade
  const handleSaveGrade = async (asgnId: string, submissionId: string) => {
    setIsSavingGrade(true);
    setGradeError(null);

    try {
      const res = await fetch(
        `/api/teacher/assignments/${asgnId}/submissions/${submissionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marks: gradingMarks !== "" ? Number(gradingMarks) : null,
            feedback: gradingFeedback,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save marks.");
      }

      setGradingStudentId(null);
      handleOpenSubmissions(asgnId);
      fetchAssignments();
    } catch (err: any) {
      setGradeError(err.message || "Failed to save evaluation.");
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Subjects available for selected class & section in form
  const availableFormSubjects = filterOptions.assignedAllocations
    .filter((a) => a.classId === formData.classId && a.sectionId === formData.sectionId)
    .filter((a) => a.subjectId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" />
            <span>Assignments & Coursework</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Create homework tasks, inspect student submissions, and record marks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-card hover:bg-surface-2 border border-border text-foreground transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-500" : "text-muted-foreground"}`} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow-md shadow-primary/25 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
              placeholder="Search assignments..."
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
              <option value="">All Classes</option>
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
              <option value="">All Sections</option>
              {filterOptions.sections.map((s) => (
                <option key={s.sectionId} value={s.sectionId}>
                  {s.sectionName}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">All Subjects</option>
              {filterOptions.subjects.map((sub) => (
                <option key={sub.subjectId} value={sub.subjectId}>
                  {sub.subjectName}
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
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Drafts</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignment List */}
      {isLoading ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center text-xs text-muted-foreground">
          Loading assignments...
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-dashed border-border text-center space-y-3">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-bold text-sm text-foreground">No Assignments Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              You haven&apos;t created any assignments matching this criteria yet. Click below to publish your first homework task.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs"
          >
            Create New Assignment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((asgn) => (
            <div
              key={asgn._id}
              className="p-5 rounded-3xl bg-card border border-border hover:border-blue-500/40 transition shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {asgn.subjectName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      asgn.status === "PUBLISHED"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-surface-3 text-muted-foreground"
                    }`}
                  >
                    {asgn.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-foreground leading-tight">{asgn.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {asgn.description}
                  </p>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border">
                  <p className="flex items-center justify-between">
                    <span>Target Class:</span>
                    <strong className="text-foreground">{asgn.className} - {asgn.sectionName}</strong>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Due Date:</span>
                    <strong className="text-foreground">{new Date(asgn.dueDate).toLocaleDateString()}</strong>
                  </p>
                  {asgn.maximumMarks !== null && asgn.maximumMarks !== undefined && (
                    <p className="flex items-center justify-between">
                      <span>Max Marks:</span>
                      <strong className="text-foreground">{asgn.maximumMarks}</strong>
                    </p>
                  )}
                </div>

                {/* Submissions Counter Pill */}
                <div className="p-3 rounded-2xl bg-surface-2 border border-border flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Total Submissions</span>
                    <p className="font-bold text-foreground text-sm">{asgn.submissionsSummary.total}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground">Reviewed</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {asgn.submissionsSummary.reviewed}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenSubmissions(asgn._id)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Submissions ({asgn.submissionsSummary.total})</span>
                </button>

                <button
                  onClick={() => handleOpenEditModal(asgn)}
                  className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition cursor-pointer"
                  title="Edit Assignment"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteAssignment(asgn._id)}
                  className="p-2 rounded-xl bg-surface-2 hover:bg-destructive/10 border border-border text-destructive transition cursor-pointer"
                  title="Delete Assignment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT ASSIGNMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-popover border border-border rounded-3xl max-w-xl w-full shadow-2xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-black text-foreground">
                {editingAssignmentId ? "Edit Assignment" : "Create New Assignment"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Title */}
              <div className="space-y-1">
                <label className="block font-bold text-foreground uppercase">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Chapter 4 Trigonometry Homework"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-input-border text-foreground font-medium focus:outline-none focus:border-primary"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block font-bold text-foreground uppercase">Description & Instructions</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide instructions, questions, or textbook references..."
                  className="w-full px-3.5 py-2 rounded-xl bg-input border border-input-border text-foreground font-medium focus:outline-none focus:border-primary"
                />
              </div>

              {/* Class, Section, Subject Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-muted-foreground uppercase">Class</label>
                  <select
                    disabled={!!editingAssignmentId}
                    value={formData.classId}
                    onChange={(e) => {
                      const cId = e.target.value;
                      const matchingSec = filterOptions.sections.find((s) => s.classId === cId)?.sectionId || "";
                      const matchingSub = filterOptions.assignedAllocations.find((a) => a.classId === cId)?.subjectId || "";
                      setFormData({ ...formData, classId: cId, sectionId: matchingSec, subjectId: matchingSub });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground font-semibold focus:outline-none focus:border-primary disabled:opacity-50"
                  >
                    {filterOptions.classes.map((c) => (
                      <option key={c.classId} value={c.classId}>{c.className}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-muted-foreground uppercase">Section</label>
                  <select
                    disabled={!!editingAssignmentId}
                    value={formData.sectionId}
                    onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground font-semibold focus:outline-none focus:border-primary disabled:opacity-50"
                  >
                    {filterOptions.sections.filter((s) => s.classId === formData.classId).map((s) => (
                      <option key={s.sectionId} value={s.sectionId}>{s.sectionName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-muted-foreground uppercase">Subject</label>
                  <select
                    disabled={!!editingAssignmentId}
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground font-semibold focus:outline-none focus:border-primary disabled:opacity-50"
                  >
                    {availableFormSubjects.length === 0 && <option value="">No subject assigned</option>}
                    {availableFormSubjects.map((sub: any) => (
                      <option key={sub.subjectId} value={sub.subjectId}>{sub.subjectName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates & Maximum Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-muted-foreground uppercase">Assigned Date</label>
                  <input
                    type="date"
                    required
                    value={formData.assignedDate}
                    onChange={(e) => setFormData({ ...formData, assignedDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground font-semibold focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-muted-foreground uppercase">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground font-semibold focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-muted-foreground uppercase">Max Marks</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maximumMarks ?? ""}
                    onChange={(e) => setFormData({ ...formData, maximumMarks: e.target.value ? Number(e.target.value) : null })}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* External Link Attachment */}
              <div className="pt-2 border-t border-border space-y-2">
                <label className="block font-bold text-foreground uppercase">Resource / Attachment URL</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.attachmentName}
                    onChange={(e) => setFormData({ ...formData, attachmentName: e.target.value })}
                    placeholder="Attachment Name (e.g. Problem Set PDF)"
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                  <input
                    type="url"
                    value={formData.attachmentUrl}
                    onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                    placeholder="https://example.com/file.pdf"
                    className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-foreground font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingForm ? "Saving..." : editingAssignmentId ? "Update Assignment" : "Publish Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMISSIONS & GRADING MODAL */}
      {selectedAssignmentForSubmissions && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-popover border border-border rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-foreground">
                  {submissionsData?.assignment?.title || "Assignment Submissions"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Class: <strong className="text-foreground">{submissionsData?.assignment?.className} - {submissionsData?.assignment?.sectionName}</strong> • Subject: <strong className="text-foreground">{submissionsData?.assignment?.subjectName}</strong> • Max Marks: <strong className="text-foreground">{submissionsData?.assignment?.maximumMarks ?? "N/A"}</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedAssignmentForSubmissions(null)}
                className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Submission Stats Bar */}
            {submissionsData?.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-surface-2 border border-border text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Students</span>
                  <p className="text-lg font-black text-foreground">{submissionsData.summary.totalStudents}</p>
                </div>
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <span className="text-[10px] text-blue-700 dark:text-blue-400 uppercase font-bold">Submitted</span>
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400">{submissionsData.summary.submittedCount}</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold">Reviewed</span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{submissionsData.summary.reviewedCount}</p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold">Pending Review</span>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-400">{submissionsData.summary.pendingReviewCount}</p>
                </div>
              </div>
            )}

            {gradeError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{gradeError}</span>
              </div>
            )}

            {/* Submissions Roster */}
            {isLoadingSubmissions ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Loading student submissions...
              </div>
            ) : submissionsData?.submissions?.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                No students enrolled in this section.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {submissionsData?.submissions?.map((item: any) => {
                  const sub = item.submission;
                  const isGradingThis = gradingStudentId === sub?._id;

                  return (
                    <div
                      key={item.studentId}
                      className="p-4 rounded-2xl bg-surface-2 border border-border space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
                            {item.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.avatarUrl} alt={item.fullName} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              item.fullName?.[0] || "S"
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm">{item.fullName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              Roll: {item.rollNumber} • Admission: {item.admissionNumber}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              sub?.status === "REVIEWED"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : sub?.status === "LATE"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : sub
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                : "bg-surface-3 text-muted-foreground border border-border"
                            }`}
                          >
                            {sub ? sub.status : "UNSUBMITTED"}
                          </span>

                          {sub?.marks !== null && sub?.marks !== undefined && (
                            <span className="px-2.5 py-0.5 rounded-xl bg-card border border-border text-foreground font-black">
                              {sub.marks} / {submissionsData.assignment.maximumMarks ?? 100}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Submitted Content & Attachments */}
                      {sub && (
                        <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                          <p className="text-muted-foreground text-[11px] leading-relaxed">
                            {sub.content || "No text description submitted."}
                          </p>

                          {sub.attachments?.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {sub.attachments.map((att: any, idx: number) => (
                                <a
                                  key={idx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 text-primary font-semibold text-[11px] flex items-center gap-1 border border-border"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>{att.name || "Attachment"}</span>
                                </a>
                              ))}
                            </div>
                          )}

                          {sub.feedback && (
                            <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] space-y-0.5">
                              <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                <span>Teacher Feedback</span>
                              </span>
                              <p className="text-foreground">{sub.feedback}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Inline Grading Form */}
                      {sub && !isGradingThis && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleStartGrading(sub)}
                            className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{sub.status === "REVIEWED" ? "Update Marks" : "Grade & Review"}</span>
                          </button>
                        </div>
                      )}

                      {isGradingThis && (
                        <div className="p-3.5 rounded-xl bg-card border border-primary/30 space-y-3 animate-in fade-in">
                          <h4 className="font-bold text-foreground flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-primary" />
                            <span>Evaluation Form</span>
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-muted-foreground uppercase">
                                Marks (Max: {submissionsData.assignment.maximumMarks ?? 100})
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={submissionsData.assignment.maximumMarks ?? 100}
                                value={gradingMarks}
                                onChange={(e) => setGradingMarks(e.target.value)}
                                placeholder="Marks"
                                className="w-full px-3 py-1.5 rounded-lg bg-input border border-input-border text-foreground font-bold focus:outline-none focus:border-primary"
                              />
                            </div>

                            <div className="sm:col-span-2 space-y-1">
                              <label className="block text-[10px] font-bold text-muted-foreground uppercase">
                                Feedback / Teacher Comments
                              </label>
                              <input
                                type="text"
                                value={gradingFeedback}
                                onChange={(e) => setGradingFeedback(e.target.value)}
                                placeholder="e.g. Well researched, good analysis."
                                className="w-full px-3 py-1.5 rounded-lg bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setGradingStudentId(null)}
                              className="px-3 py-1 rounded-lg bg-surface-2 text-foreground font-semibold"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isSavingGrade}
                              onClick={() => handleSaveGrade(submissionsData.assignment._id, sub._id)}
                              className="px-4 py-1 rounded-lg bg-primary text-primary-foreground font-bold flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              <span>{isSavingGrade ? "Saving..." : "Save Evaluation"}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
