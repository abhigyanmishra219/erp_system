"use client";

import React, { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Award,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

export default function TeacherProfilePage() {
  const { user } = useUser();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/teacher/me");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const teacher = data?.teacher;
  const assignments = data?.scope?.assignedClasses || [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
          My Faculty Profile
        </h1>
        <p className="text-xs text-muted-foreground">
          Personal credentials, teaching details, and academic assignments
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center text-xs text-muted-foreground">
          Loading faculty profile...
        </div>
      ) : !teacher ? (
        <div className="p-8 rounded-3xl bg-card border border-destructive/20 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm font-bold text-foreground">Teacher Profile Not Found</p>
          <p className="text-xs text-muted-foreground">
            No matching teacher record linked to your user account.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-2xl shrink-0 shadow-sm">
                {teacher.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={teacher.photo}
                    alt={teacher.firstName}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  `${teacher.firstName?.[0] || "T"}${teacher.lastName?.[0] || ""}`
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    {teacher.firstName} {teacher.middleName ? `${teacher.middleName} ` : ""}{teacher.lastName}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                    {teacher.designation || "Teacher"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active Faculty</span>
                  </span>
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Teacher ID: <strong className="font-mono text-foreground">{teacher.teacherId}</strong></span>
                  {teacher.employeeId && (
                    <>
                      <span className="text-border">•</span>
                      <span>Employee ID: <strong className="font-mono text-foreground">{teacher.employeeId}</strong></span>
                    </>
                  )}
                </p>

                <div className="pt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {teacher.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      <span>{teacher.email}</span>
                    </div>
                  )}
                  {teacher.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      <span>{teacher.phone}</span>
                    </div>
                  )}
                  {teacher.department && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      <span>{teacher.department}</span>
                    </div>
                  )}
                  {teacher.qualification && (
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-primary" />
                      <span>{teacher.qualification}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Academic Allocations Table */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>Academic Class & Subject Allocations</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Official teaching responsibilities assigned by school administration
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-surface-2 border border-border text-foreground">
                {assignments.length} {assignments.length === 1 ? "Allocation" : "Allocations"}
              </span>
            </div>

            {assignments.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                No active class allocations currently found for your account.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-2/60 border-b border-border text-muted-foreground font-semibold">
                      <th className="p-3 pl-4">Class & Section</th>
                      <th className="p-3">Assigned Subject</th>
                      <th className="p-3">Assignment Role</th>
                      <th className="p-3">Class Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {assignments.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-2/40 transition">
                        <td className="p-3 pl-4 font-bold text-foreground">
                          {item.className} - {item.sectionName}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {item.subjectName ? (
                            <span className="inline-flex items-center gap-1.5 text-foreground font-semibold">
                              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                              <span>{item.subjectName}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">All Subjects / General</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-2 border border-border capitalize">
                            {item.assignmentType?.replace("_", " ").toLowerCase()}
                          </span>
                        </td>
                        <td className="p-3">
                          {item.isClassTeacher ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Yes (Class Teacher)
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
