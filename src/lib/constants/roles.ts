export const USER_ROLES = [
  "SYSTEM_ADMIN",
  "ADMIN",
  "TEACHER",
  "STUDENT",
  "PARENT",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
