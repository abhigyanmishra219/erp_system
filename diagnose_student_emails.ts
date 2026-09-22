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
} catch {
  // ignore
}

async function diagnoseDuplicates() {
  const { default: connectToDatabase } = await import("./src/lib/db");
  const { default: Student } = await import("./src/models/Student");
  const { default: School } = await import("./src/models/School");

  await connectToDatabase();

  console.log("=== DIAGNOSING EXISTING STUDENT EMAIL DUPLICATES ===");

  const students = await Student.find({}).lean();
  console.log(`Total students in DB: ${students.length}`);

  // Group by schoolId + normalized email
  const map = new Map<string, typeof students>();

  for (const s of students) {
    const rawEmail = s.email || "";
    const normEmail = rawEmail.trim().toLowerCase();
    if (!normEmail) continue;

    const key = `${s.schoolId.toString()}:::${normEmail}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(s);
  }

  let duplicateCount = 0;
  for (const [key, list] of map.entries()) {
    if (list.length > 1) {
      duplicateCount++;
      const [schId, email] = key.split(":::");
      const school = await School.findById(schId).lean();
      console.log(`\n[DUPLICATE GROUP #${duplicateCount}]`);
      console.log(`School: ${school?.name || "Unknown"} (ID: ${schId})`);
      console.log(`Email: "${email}" (Occurrences: ${list.length})`);
      list.forEach((st, idx) => {
        console.log(`  ${idx + 1}. ID: ${st._id.toString()} | AdmNo: ${st.admissionNumber} | Name: ${st.firstName} ${st.lastName} | Created: ${st.createdAt}`);
      });
    }
  }

  if (duplicateCount === 0) {
    console.log("✓ No duplicate student emails found.");
  } else {
    console.log(`\nFound ${duplicateCount} duplicate email group(s).`);
  }

  process.exit(0);
}

diagnoseDuplicates().catch((err) => {
  console.error("Diagnosis error:", err);
  process.exit(1);
});
