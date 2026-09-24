import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ReportCardData } from "./reportCardService";

export class ReportCardPdfService {
  /**
   * Generates a publication-ready, professional A4 PDF buffer for a Student Report Card.
   * Strips out development metadata and localhost references.
   */
  public static async generateReportCardPdf(reportCard: ReportCardData): Promise<Buffer> {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36; // 0.5 in margins

    const { school, student, exam, academic, attendance, gradingScales, generatedAt } = reportCard;

    // Sanitize any dev localhost URLs
    const sanitizedSchoolWebsite = school.website && !school.website.includes("localhost")
      ? school.website
      : "";

    // 1. Outer Border / Certificate Frame
    doc.setDrawColor(30, 41, 59); // Slate 800
    doc.setLineWidth(1.5);
    doc.rect(margin - 8, margin - 8, pageWidth - (margin - 8) * 2, pageHeight - (margin - 8) * 2);

    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.setLineWidth(0.75);
    doc.rect(margin - 4, margin - 4, pageWidth - (margin - 4) * 2, pageHeight - (margin - 4) * 2);

    let y = margin + 12;

    // 2. School Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(school.name.toUpperCase(), pageWidth / 2, y, { align: "center" });

    y += 14;
    if (school.tagline) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(school.tagline, pageWidth / 2, y, { align: "center" });
      y += 12;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    const schoolContactParts: string[] = [];
    if (school.address) schoolContactParts.push(school.address);
    if (school.city && school.state) schoolContactParts.push(`${school.city}, ${school.state}`);
    if (school.phone) schoolContactParts.push(`Tel: ${school.phone}`);
    if (school.email) schoolContactParts.push(`Email: ${school.email}`);
    if (sanitizedSchoolWebsite) schoolContactParts.push(`Web: ${sanitizedSchoolWebsite}`);

    if (schoolContactParts.length > 0) {
      doc.text(schoolContactParts.slice(0, 3).join("  •  "), pageWidth / 2, y, { align: "center" });
      y += 14;
    }

    // Title Banner
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin + 10, y, pageWidth - margin - 10, y);
    y += 14;

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(pageWidth / 2 - 130, y - 10, 260, 20, 4, 4, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(67, 56, 202); // Indigo 700
    doc.text("ACADEMIC PERFORMANCE REPORT CARD", pageWidth / 2, y + 4, { align: "center" });
    y += 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${exam.name}  •  ${exam.academicYear?.name || "Academic Session"}`, pageWidth / 2, y, { align: "center" });
    y += 16;

    // 3. Student Information Block (2 Columns with clean bordered box)
    const infoBoxX = margin;
    const infoBoxY = y;
    const infoBoxWidth = pageWidth - margin * 2;
    const infoBoxHeight = 54;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, 6, 6, "FD");

    const col1X = infoBoxX + 16;
    const col2X = infoBoxX + (infoBoxWidth / 2) + 16;
    let infoTextY = infoBoxY + 16;

    doc.setFontSize(8.5);

    // Row 1
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("Student Name:", col1X, infoTextY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(student.name, col1X + 75, infoTextY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("Admission No:", col2X, infoTextY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(student.admissionNumber, col2X + 75, infoTextY);

    // Row 2
    infoTextY += 15;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("Class & Section:", col1X, infoTextY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(`${student.class.name} - Section ${student.section.name}`, col1X + 75, infoTextY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("Roll Number:", col2X, infoTextY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(student.rollNumber || "N/A", col2X + 75, infoTextY);

    // Row 3
    infoTextY += 15;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("Date of Birth:", col1X, infoTextY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(student.dob ? new Date(student.dob).toLocaleDateString() : "N/A", col1X + 75, infoTextY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("Attendance:", col2X, infoTextY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(4, 120, 87); // Emerald
    doc.text(`${attendance.attendancePercentage.toFixed(1)}% (${attendance.present}/${attendance.totalSessions} Days)`, col2X + 75, infoTextY);

    y = infoBoxY + infoBoxHeight + 14;

    // 4. Subject Marks Table (autoTable)
    const tableHeaders = [["#", "Subject Name", "Max Marks", "Pass Marks", "Marks Obtained", "Grade", "Status", "Remarks"]];
    const tableBody = academic.subjects.map((sub, index) => [
      index + 1,
      sub.subjectCode ? `${sub.subjectName} (${sub.subjectCode})` : sub.subjectName,
      sub.maximumMarks,
      sub.passingMarks,
      sub.marks !== null ? sub.marks : "—",
      sub.grade,
      sub.isPassed ? "PASS" : "FAIL",
      sub.remarks || (sub.isPassed ? "Good" : "Needs Improvement"),
    ]);

    // Footer row
    const tableFoot = [
      [
        "Total",
        "GRAND TOTAL",
        academic.totalMaximumMarks,
        "—",
        academic.totalObtainedMarks,
        academic.overallGrade,
        academic.statusText,
        `Result: ${academic.isPassed ? "PASSED" : "FAILED"}`,
      ],
    ];

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      foot: tableFoot,
      startY: y,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 4.5,
        valign: "middle",
        halign: "center",
        lineColor: [226, 232, 240],
        lineWidth: 0.5,
      },
      columnStyles: {
        0: { cellWidth: 20, halign: "center" },
        1: { cellWidth: "auto", halign: "left", fontStyle: "bold" },
        2: { cellWidth: 50, halign: "center" },
        3: { cellWidth: 50, halign: "center" },
        4: { cellWidth: 65, halign: "center", fontStyle: "bold" },
        5: { cellWidth: 40, halign: "center", fontStyle: "bold" },
        6: { cellWidth: 45, halign: "center", fontStyle: "bold" },
        7: { cellWidth: 70, halign: "left", fontSize: 7.5 },
      },
      headStyles: {
        fillColor: [67, 56, 202], // Indigo 700
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;

    // 5. Aggregate KPI Summary & Attendance Box
    const summaryCardWidth = (pageWidth - margin * 2 - 12) / 2;
    const summaryCardHeight = 46;

    // Academic Aggregate Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, finalY, summaryCardWidth, summaryCardHeight, 6, 6, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("ACADEMIC PERFORMANCE SUMMARY", margin + 12, finalY + 14);

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Score: ${academic.totalObtainedMarks} / ${academic.totalMaximumMarks}`, margin + 12, finalY + 28);
    doc.text(`Percentage: ${academic.percentage.toFixed(1)}%`, margin + 12, finalY + 40);

    doc.setFontSize(11);
    doc.setTextColor(67, 56, 202);
    doc.text(`Grade: ${academic.overallGrade}`, margin + summaryCardWidth - 65, finalY + 28);
    doc.setTextColor(academic.isPassed ? 4 : 185, academic.isPassed ? 120 : 28, academic.isPassed ? 87 : 28);
    doc.text(academic.statusText, margin + summaryCardWidth - 65, finalY + 40);

    // Attendance Summary Card
    const attCardX = margin + summaryCardWidth + 12;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(attCardX, finalY, summaryCardWidth, summaryCardHeight, 6, 6, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("ATTENDANCE SUMMARY", attCardX + 12, finalY + 14);

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Sessions: ${attendance.totalSessions} Days`, attCardX + 12, finalY + 28);
    doc.text(`Present: ${attendance.present}   |   Absent: ${attendance.absent}`, attCardX + 12, finalY + 40);

    doc.setFontSize(11);
    doc.setTextColor(4, 120, 87);
    doc.text(`${attendance.attendancePercentage.toFixed(1)}%`, attCardX + summaryCardWidth - 50, finalY + 34);

    // 6. Grading Scale Legend
    let legendY = finalY + summaryCardHeight + 12;
    if (gradingScales && gradingScales.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Grading Scale Key:", margin, legendY);

      const scaleStr = gradingScales.map((s) => `${s.grade}: ${s.minPercentage}%-${s.maxPercentage}%`).join("   •   ");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(scaleStr, margin + 80, legendY);
      legendY += 14;
    }

    // 7. Signature & Endorsements
    const sigY = pageHeight - margin - 38;
    const sigColWidth = (pageWidth - margin * 2) / 3;

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.75);

    // Signature lines
    doc.line(margin + 15, sigY, margin + sigColWidth - 15, sigY);
    doc.line(margin + sigColWidth + 15, sigY, margin + sigColWidth * 2 - 15, sigY);
    doc.line(margin + sigColWidth * 2 + 15, sigY, pageWidth - margin - 15, sigY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Class Teacher Signature", margin + sigColWidth / 2, sigY + 10, { align: "center" });
    doc.text("Exam Controller Signature", margin + sigColWidth * 1.5, sigY + 10, { align: "center" });
    doc.text("Principal Signature & Seal", margin + sigColWidth * 2.5, sigY + 10, { align: "center" });

    // 8. Official Verification Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Official Student Examination Record  •  Verified & Published by ${school.name} Administration  •  Date: ${new Date(generatedAt).toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - margin + 4,
      { align: "center" }
    );

    const arrayBuffer = doc.output("arraybuffer");
    return Buffer.from(arrayBuffer);
  }
}
