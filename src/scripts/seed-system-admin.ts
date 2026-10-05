import bcrypt from "bcryptjs";
import connectToDatabase from "../lib/db";
import User from "../models/User";

/**
 * Server-Side Initial System Admin Bootstrapper
 * 
 * Provides a secure mechanism to bootstrap the first/initial SYSTEM_ADMIN
 * into the database without exposing credentials in frontend code or
 * allowing public registration endpoints.
 * 
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/seed-system-admin.ts
 *   npx tsx --env-file=.env.local src/scripts/seed-system-admin.ts --force
 */

export interface BootstrapResult {
  created: boolean;
  email: string;
  role: string;
  message: string;
}

export async function ensureInitialSystemAdmin(options?: {
  email?: string;
  password?: string;
  name?: string;
  force?: boolean;
}): Promise<BootstrapResult> {
  await connectToDatabase();

  const adminEmail = (
    options?.email ||
    process.env.INITIAL_ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    "sysadmin@erpnexus.com"
  ).toLowerCase().trim();

  const adminPassword =
    options?.password ||
    process.env.INITIAL_ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    "SysAdmin2026!";

  const adminName =
    options?.name ||
    process.env.INITIAL_ADMIN_NAME ||
    "Primary System Admin";

  // Check if any System Admin account already exists
  const existingSystemAdmins = await User.countDocuments({
    role: "SYSTEM_ADMIN",
    isActive: true,
  });

  if (existingSystemAdmins > 0 && !options?.force) {
    const existingAdmin = await User.findOne({ role: "SYSTEM_ADMIN" }).lean();
    return {
      created: false,
      email: existingAdmin?.email || "unknown",
      role: "SYSTEM_ADMIN",
      message: `Database already has ${existingSystemAdmins} active System Admin account(s). Initial bootstrap skipped. Use --force to create anyway.`,
    };
  }

  // Check if an account with this specific email already exists
  const existingByEmail = await User.findOne({ email: adminEmail });
  if (existingByEmail) {
    if (existingByEmail.role === "SYSTEM_ADMIN") {
      return {
        created: false,
        email: adminEmail,
        role: "SYSTEM_ADMIN",
        message: `System Admin with email ${adminEmail} already exists.`,
      };
    } else {
      // Upgrade existing user to SYSTEM_ADMIN if forced
      existingByEmail.role = "SYSTEM_ADMIN";
      existingByEmail.schoolId = null;
      existingByEmail.isActive = true;
      await existingByEmail.save();
      return {
        created: true,
        email: adminEmail,
        role: "SYSTEM_ADMIN",
        message: `Existing user account ${adminEmail} promoted to SYSTEM_ADMIN.`,
      };
    }
  }

  // Hash password safely
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminPassword, salt);

  // Create initial System Admin with null tenant association
  const newAdmin = await User.create({
    email: adminEmail,
    name: adminName,
    password: hashedPassword,
    role: "SYSTEM_ADMIN",
    schoolId: null,
    studentId: null,
    parentId: null,
    teacherId: null,
    isActive: true,
    mustChangePassword: false,
  });

  return {
    created: true,
    email: newAdmin.email,
    role: newAdmin.role,
    message: `Initial System Admin successfully created: ${newAdmin.email}`,
  };
}

// Direct CLI Execution
if (require.main === module || process.argv[1]?.includes("seed-system-admin")) {
  const isForce = process.argv.includes("--force");
  
  ensureInitialSystemAdmin({ force: isForce })
    .then((result) => {
      console.log("\n=================================================");
      console.log("       INITIAL SYSTEM ADMIN BOOTSTRAP            ");
      console.log("=================================================");
      console.log(`Status:  ${result.created ? "✓ CREATED" : "ℹ SKIPPED"}`);
      console.log(`Email:   ${result.email}`);
      console.log(`Role:    ${result.role}`);
      console.log(`Details: ${result.message}`);
      console.log("=================================================\n");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n[ERROR] System Admin bootstrap failed:", err.message);
      process.exit(1);
    });
}
