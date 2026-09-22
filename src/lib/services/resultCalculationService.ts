export interface GradingScale {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint?: number;
  description?: string;
}

export const DEFAULT_GRADING_SCALES: GradingScale[] = [
  { grade: "A+", minPercentage: 90, maxPercentage: 100, gradePoint: 10, description: "Outstanding" },
  { grade: "A", minPercentage: 80, maxPercentage: 89.99, gradePoint: 9, description: "Excellent" },
  { grade: "B+", minPercentage: 70, maxPercentage: 79.99, gradePoint: 8, description: "Very Good" },
  { grade: "B", minPercentage: 60, maxPercentage: 69.99, gradePoint: 7, description: "Good" },
  { grade: "C", minPercentage: 50, maxPercentage: 59.99, gradePoint: 6, description: "Average" },
  { grade: "D", minPercentage: 40, maxPercentage: 49.99, gradePoint: 5, description: "Pass" },
  { grade: "F", minPercentage: 0, maxPercentage: 39.99, gradePoint: 0, description: "Fail" },
];

export interface SubjectResultInput {
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  marks: number | null;
  maximumMarks: number;
  passingMarks: number;
}

export interface SubjectResultOutput {
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  marks: number | null;
  maximumMarks: number;
  passingMarks: number;
  percentage: number | null;
  grade: string;
  isPassed: boolean;
}

export interface OverallResultOutput {
  totalObtainedMarks: number;
  totalMaximumMarks: number;
  percentage: number;
  overallGrade: string;
  isPassed: boolean;
  statusText: "PASSED" | "FAILED" | "INCOMPLETE";
  subjects: SubjectResultOutput[];
  totalSubjects: number;
  passedSubjects: number;
  failedSubjects: number;
  unenteredSubjects: number;
}

export class ResultCalculationService {
  /**
   * Determine letter grade for a specific percentage based on school grading configuration
   */
  public static calculateGrade(
    percentage: number,
    scales: GradingScale[] = DEFAULT_GRADING_SCALES
  ): string {
    const sortedScales = [...scales].sort((a, b) => b.minPercentage - a.minPercentage);

    for (const scale of sortedScales) {
      if (percentage >= scale.minPercentage && percentage <= (scale.maxPercentage + 0.001)) {
        return scale.grade;
      }
    }

    // Edge-case fallbacks
    if (percentage >= 100 && sortedScales.length > 0) return sortedScales[0].grade;
    if (percentage <= 0 && sortedScales.length > 0) return sortedScales[sortedScales.length - 1].grade;

    return "F";
  }

  /**
   * Calculate grade and pass/fail for a single subject
   */
  public static evaluateSubject(
    input: SubjectResultInput,
    scales: GradingScale[] = DEFAULT_GRADING_SCALES
  ): SubjectResultOutput {
    if (input.marks === null || input.marks === undefined || isNaN(input.marks)) {
      return {
        subjectId: input.subjectId,
        subjectName: input.subjectName,
        subjectCode: input.subjectCode,
        marks: null,
        maximumMarks: input.maximumMarks,
        passingMarks: input.passingMarks,
        percentage: null,
        grade: "—",
        isPassed: false,
      };
    }

    const max = input.maximumMarks > 0 ? input.maximumMarks : 100;
    const percentage = Math.round(((input.marks / max) * 100) * 100) / 100;
    const grade = this.calculateGrade(percentage, scales);
    const isPassed = input.marks >= input.passingMarks;

    return {
      subjectId: input.subjectId,
      subjectName: input.subjectName,
      subjectCode: input.subjectCode,
      marks: input.marks,
      maximumMarks: input.maximumMarks,
      passingMarks: input.passingMarks,
      percentage,
      grade,
      isPassed,
    };
  }

  /**
   * Aggregate subject results and calculate overall totals, percentage, grade, and pass/fail outcome
   */
  public static calculateOverallResult(
    subjects: SubjectResultInput[],
    scales: GradingScale[] = DEFAULT_GRADING_SCALES
  ): OverallResultOutput {
    let totalObtained = 0;
    let totalMaximum = 0;
    let passedCount = 0;
    let failedCount = 0;
    let unenteredCount = 0;

    const evaluatedSubjects: SubjectResultOutput[] = subjects.map((sub) => {
      const evaluated = this.evaluateSubject(sub, scales);
      totalMaximum += sub.maximumMarks || 0;

      if (evaluated.marks !== null) {
        totalObtained += evaluated.marks;
        if (evaluated.isPassed) {
          passedCount++;
        } else {
          failedCount++;
        }
      } else {
        unenteredCount++;
      }

      return evaluated;
    });

    const percentage =
      totalMaximum > 0
        ? Math.round(((totalObtained / totalMaximum) * 100) * 100) / 100
        : 0;

    const overallGrade = unenteredCount === subjects.length ? "—" : this.calculateGrade(percentage, scales);

    // Pass condition: All subjects passed and at least one subject evaluated, zero fails, zero unentered
    const allPassed = failedCount === 0 && unenteredCount === 0 && evaluatedSubjects.length > 0;
    const isPassed = allPassed;

    let statusText: "PASSED" | "FAILED" | "INCOMPLETE" = "PASSED";
    if (unenteredCount > 0) {
      statusText = "INCOMPLETE";
    } else if (failedCount > 0) {
      statusText = "FAILED";
    }

    return {
      totalObtainedMarks: totalObtained,
      totalMaximumMarks: totalMaximum,
      percentage,
      overallGrade,
      isPassed,
      statusText,
      subjects: evaluatedSubjects,
      totalSubjects: subjects.length,
      passedSubjects: passedCount,
      failedSubjects: failedCount,
      unenteredSubjects: unenteredCount,
    };
  }
}
