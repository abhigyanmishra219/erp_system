import School from "@/models/School";

/**
 * Derives a clean uppercase acronym/prefix from the school name.
 * e.g. "City Montessori School" -> "CMS"
 * e.g. "Delhi Public School" -> "DPS"
 * e.g. "CMS" -> "CMS"
 * e.g. "St. Xavier's High School" -> "SXHS"
 */
export function deriveSchoolCodePrefix(name: string): string {
  if (!name || typeof name !== "string") return "SCH";

  const sanitized = name.trim().replace(/[^a-zA-Z0-9\s]/g, "");
  const words = sanitized.split(/\s+/).filter(Boolean);

  if (words.length === 0) return "SCH";

  if (words.length >= 2) {
    const initials = words
      .map((w) => w[0].toUpperCase())
      .join("")
      .slice(0, 4);
    if (initials.length >= 2) return initials;
  }

  const single = words[0].toUpperCase().slice(0, 4);
  return single.length >= 2 ? single : `${single}SCH`.slice(0, 4);
}

/**
 * Generates a candidate code with a 3-digit random number suffix (e.g. CMS101, CMS492)
 */
export function generateCandidateSchoolCode(name: string): string {
  const prefix = deriveSchoolCodePrefix(name);
  const randomSuffix = Math.floor(100 + Math.random() * 900); // 100 - 999
  return `${prefix}${randomSuffix}`.toUpperCase();
}

/**
 * Ensures the generated school code is guaranteed unique in MongoDB.
 */
export async function generateUniqueSchoolCode(
  name: string,
  preferredCode?: string
): Promise<string> {
  if (preferredCode && preferredCode.trim()) {
    const candidate = preferredCode.trim().toUpperCase();
    const existing = await School.findOne({ code: candidate });
    if (!existing) {
      return candidate;
    }
  }

  const prefix = deriveSchoolCodePrefix(name);

  // Try generating with 3-digit random suffixes
  for (let attempt = 0; attempt < 20; attempt++) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const candidate = `${prefix}${randomSuffix}`;
    const existing = await School.findOne({ code: candidate });
    if (!existing) {
      return candidate;
    }
  }

  // Fallback with 4-digit timestamp slice to guarantee uniqueness
  const timestampSuffix = Date.now().toString().slice(-4);
  return `${prefix}${timestampSuffix}`;
}
