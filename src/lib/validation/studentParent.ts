import { z } from "zod";

export const addressSchema = z.object({
  street: z.string().optional().default(""),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  postalCode: z.string().optional().default(""),
  country: z.string().optional().default(""),
}).optional();

export const emergencyContactSchema = z.object({
  name: z.string().optional().default(""),
  relationship: z.string().optional().default(""),
  phone: z.string().optional().default(""),
}).optional();

export const medicalInfoSchema = z.object({
  allergies: z.array(z.string()).optional().default([]),
  conditions: z.array(z.string()).optional().default([]),
  medications: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(""),
}).optional();

export const transferDetailsSchema = z.object({
  reason: z.string().optional().default(""),
  targetSchool: z.string().optional().default(""),
  transferCertificateNumber: z.string().optional().default(""),
  transferDate: z.string().or(z.date()).optional(),
  notes: z.string().optional().default(""),
}).optional();

export const createParentNestedSchema = z.object({
  firstName: z.string().min(1, "Parent first name is required"),
  lastName: z.string().min(1, "Parent last name is required"),
  email: z.string().email("Valid parent email is required"),
  phone: z.string().min(1, "Parent phone is required"),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "OTHER"]).default("FATHER"),
  occupation: z.string().optional().default(""),
  isPrimaryGuardian: z.boolean().default(true),
  isEmergencyContact: z.boolean().default(true),
  createLoginAccount: z.boolean().default(false),
}).optional();

export const createStudentSchema = z.object({
  admissionNumber: z.string().min(1, "Admission number is required").trim(),
  studentId: z.string().optional().default(""),
  rollNumber: z.string().optional().default(""),
  firstName: z.string().min(1, "First name is required").trim(),
  lastName: z.string().min(1, "Last name is required").trim(),
  email: z.union([z.string().email("Invalid email address"), z.literal("")]).optional().default(""),
  phone: z.string().optional().default(""),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  bloodGroup: z.string().optional().default(""),
  avatarUrl: z.string().optional().default(""),
  academicYearId: z.string().min(1, "Academic year is required"),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().min(1, "Section is required"),
  admissionDate: z.string().or(z.date()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "TRANSFERRED", "GRADUATED"]).default("ACTIVE"),
  address: addressSchema,
  emergencyContact: emergencyContactSchema,
  medicalInfo: medicalInfoSchema,
  createLoginAccount: z.boolean().default(false),
  loginEmail: z.union([z.string().email("Invalid login email"), z.literal("")]).optional(),
  parent: createParentNestedSchema,
});

export const updateStudentSchema = z.object({
  admissionNumber: z.string().min(1, "Admission number is required").trim().optional(),
  studentId: z.string().optional(),
  rollNumber: z.string().optional(),
  firstName: z.string().min(1, "First name is required").trim().optional(),
  lastName: z.string().min(1, "Last name is required").trim().optional(),
  email: z.union([z.string().email("Invalid email address"), z.literal("")]).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().or(z.date()).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  bloodGroup: z.string().optional(),
  avatarUrl: z.string().optional(),
  academicYearId: z.string().optional(),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  admissionDate: z.string().or(z.date()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "TRANSFERRED", "GRADUATED"]).optional(),
  address: addressSchema,
  emergencyContact: emergencyContactSchema,
  medicalInfo: medicalInfoSchema,
  transferDetails: transferDetailsSchema,
});

export const studentStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "TRANSFERRED", "GRADUATED"]),
  transferDetails: transferDetailsSchema,
});

export const createParentSchema = z.object({
  firstName: z.string().min(1, "First name is required").trim(),
  lastName: z.string().min(1, "Last name is required").trim(),
  email: z.string().email("Valid email is required").trim().toLowerCase(),
  phone: z.string().min(1, "Phone number is required").trim(),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "OTHER"]).default("FATHER"),
  occupation: z.string().optional().default(""),
  address: addressSchema,
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  createLoginAccount: z.boolean().default(false),
});

export const updateParentSchema = z.object({
  firstName: z.string().min(1, "First name is required").trim().optional(),
  lastName: z.string().min(1, "Last name is required").trim().optional(),
  email: z.string().email("Valid email is required").trim().toLowerCase().optional(),
  phone: z.string().min(1, "Phone number is required").trim().optional(),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "OTHER"]).optional(),
  occupation: z.string().optional(),
  address: addressSchema,
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const linkParentSchema = z.object({
  parentId: z.string().min(1, "Parent ID is required"),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "OTHER"]).default("GUARDIAN"),
  isPrimaryGuardian: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  canPickup: z.boolean().default(true),
  notes: z.string().optional().default(""),
});

export const updateStudentParentLinkSchema = z.object({
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "OTHER"]).optional(),
  isPrimaryGuardian: z.boolean().optional(),
  isEmergencyContact: z.boolean().optional(),
  canPickup: z.boolean().optional(),
  notes: z.string().optional(),
});

export const promoteStudentsSchema = z.object({
  sourceAcademicYearId: z.string().min(1, "Source academic year is required"),
  sourceClassId: z.string().min(1, "Source class is required"),
  sourceSectionId: z.string().optional(),
  targetAcademicYearId: z.string().min(1, "Target academic year is required"),
  targetClassId: z.string().min(1, "Target class is required"),
  targetSectionId: z.string().min(1, "Target section is required"),
  studentIds: z.array(z.string()).min(1, "Select at least one student to promote"),
  statusAction: z.enum(["ACTIVE", "GRADUATED"]).default("ACTIVE"),
});

export const createAccountSchema = z.object({
  email: z.string().email("Valid email address is required").optional(),
});
