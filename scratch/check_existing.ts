import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...values] = trimmed.split("=");
        if (key && values.length > 0) {
          process.env[key.trim()] = values.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    });
  }
} catch {}

async function check() {
  const connectToDatabase = (await import("../src/lib/db")).default;
  const Assignment = (await import("../src/models/Assignment")).default;
  const Teacher = (await import("../src/models/Teacher")).default;
  const TeacherAssignment = (await import("../src/models/TeacherAssignment")).default;
  const Subject = (await import("../src/models/Subject")).default;
  const Class = (await import("../src/models/Class")).default;

  await connectToDatabase();
  const assignments = await Assignment.find().populate("teacherId").populate("subjectId").populate("classId").lean();
  console.log("EXISTING ASSIGNMENTS COUNT:", assignments.length);
  for (const a of assignments) {
    console.log({
      id: a._id.toString(),
      title: a.title,
      class: (a.classId as any)?.name,
      subject: (a.subjectId as any)?.name,
      teacher: a.teacherId ? `${(a.teacherId as any).firstName} ${(a.teacherId as any).lastName}` : "NULL/UNRESOLVED",
      teacherId: a.teacherId ? (a.teacherId as any)._id?.toString() : null,
      createdBy: a.createdBy?.toString(),
    });
  }
  process.exit(0);
}

check();
