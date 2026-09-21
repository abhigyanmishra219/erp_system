import crypto from "crypto";

/**
 * Generate a cryptographically secure random temporary password for onboarding.
 * Format: ERP-XXXX-XXXX-XXXX
 * Uses Node.js crypto.randomInt for uniform, unpredictable distribution.
 * Guarantees a mixture of uppercase, lowercase, numbers, and hyphens.
 */
export function generateTemporaryPassword(): string {
  const upperChars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // excludes ambiguous 'I', 'O'
  const lowerChars = "abcdefghijkmnpqrstuvwxyz"; // excludes ambiguous 'l', 'o'
  const numberChars = "23456789"; // excludes ambiguous '0', '1'
  const allChars = upperChars + lowerChars + numberChars;

  function getRandomSegment(length: number): string {
    let segment = "";
    // Ensure at least one uppercase, one lowercase, and one number in each segment
    segment += upperChars[crypto.randomInt(0, upperChars.length)];
    segment += lowerChars[crypto.randomInt(0, lowerChars.length)];
    segment += numberChars[crypto.randomInt(0, numberChars.length)];

    for (let i = 3; i < length; i++) {
      segment += allChars[crypto.randomInt(0, allChars.length)];
    }

    // Shuffle the segment using Fisher-Yates with crypto.randomInt
    const arr = segment.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join("");
  }

  const seg1 = getRandomSegment(4);
  const seg2 = getRandomSegment(4);
  const seg3 = getRandomSegment(4);

  return `ERP-${seg1}-${seg2}-${seg3}`;
}
