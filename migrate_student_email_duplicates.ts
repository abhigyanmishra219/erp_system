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

async function migrateDuplicates() {
  const { default: connectToDatabase } = await import("./src/lib/db");
  const { default: Student } = await import("./src/models/Student");

  await connectToDatabase();

  console.log("=== MIGRATING EXISTING STUDENT EMAIL DUPLICATES ===");

  const students = await Student.find({}).sort({ createdAt: 1 });
  console.log(`Analyzing ${students.length} students across all tenants...`);

  const seenMap = new Map<string, string>(); // key -> studentId that keeps it
  let resolvedCount = 0;

  for (const st of students) {
    const rawEmail = st.email || "";
    const normEmail = rawEmail.trim().toLowerCase();

    // Ensure email in document is normalized
    if (st.email !== normEmail) {
      st.email = normEmail;
      await st.save();
    }

    if (!normEmail) continue;

    const key = `${st.schoolId.toString()}:::${normEmail}`;

    if (!seenMap.has(key)) {
      // First student keeps the email
      seenMap.set(key, st._id.toString());
      console.log(`[KEPT] Student "${st.firstName} ${st.lastName}" (${st.admissionNumber}) keeps email "${normEmail}"`);
    } else {
      // Duplicate occurrence: clear email on the newer duplicate record to preserve document without conflict
      console.log(`[RESOLVING DUPLICATE] Student "${st.firstName} ${st.lastName}" (${st.admissionNumber}, ID: ${st._id.toString()}) has duplicate email "${normEmail}". Unsetting email...`);
      st.email = "";
      if (st.userId) {
        st.userId = null;
      }
      await st.save();
      resolvedCount++;
    }
  }

  console.log(`\n✓ Migration complete! Resolved ${resolvedCount} duplicate student email(s).`);

  // Drop old indexes if needed and sync new indexes
  console.log("Syncing MongoDB indexes on Student model...");
  await Student.syncIndexes();
  console.log("✓ MongoDB indexes successfully synchronized!");

  process.exit(0);
}

migrateDuplicates().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
