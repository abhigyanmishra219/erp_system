import { z } from "zod";

export const addressSchema = z.object({
  street: z.string().trim().optional().default(""),
  city: z.string().trim().optional().default(""),
  state: z.string().trim().optional().default(""),
  postalCode: z.string().trim().optional().default(""),
  country: z.string().trim().optional().default("India"),
});

export const createTeacherSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  middleName: z.string().trim().optional().default(""),
  lastName: z.string().trim().min(1, "Last name is required"),
  teacherId: z.string().trim().min(1, "Teacher ID is required"),
  employeeId: z.string().trim().optional().default(""),
  photo: z.string().trim().optional().default(""),
  dateOfBirth: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date of birth",
  }),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    error: "Gender is required",
  }),
  phone: z.string().trim().optional().default(""),
  email: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: "Invalid email format",
    }),
  alternatePhone: z.string().trim().optional().default(""),
  qualification: z.string().trim().optional().default(""),
  department: z.string().trim().optional().default(""),
  designation: z.string().trim().optional().default("Teacher"),
  joiningDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid joining date",
  }),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
  address: addressSchema.optional(),

  // Optional: provision portal user login during creation
  createLoginAccount: z.boolean().optional().default(false),
  loginEmail: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: "Invalid login email format",
    }),
});

export const updateTeacherSchema = z.object({
  firstName: z.string().trim().min(1, "First name cannot be empty").optional(),
  middleName: z.string().trim().optional(),
  lastName: z.string().trim().min(1, "Last name cannot be empty").optional(),
  teacherId: z.string().trim().min(1, "Teacher ID cannot be empty").optional(),
  employeeId: z.string().trim().optional(),
  photo: z.string().trim().optional(),
  dateOfBirth: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date of birth",
  }),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  phone: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: "Invalid email format",
    }),
  alternatePhone: z.string().trim().optional(),
  qualification: z.string().trim().optional(),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  joiningDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid joining date",
  }),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  address: addressSchema.optional(),
});

export const teacherStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"], {
    error: "Status must be ACTIVE or INACTIVE",
  }),
});

export const createTeacherAccountSchema = z.object({
  email: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: "Invalid email format",
    }),
});

export const createTeacherAssignmentSchema = z.object({
  academicYearId: z
    .string()
    .min(1, "Academic Year ID is required")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Academic Year ID"),
  classId: z
    .string()
    .min(1, "Class ID is required")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Class ID"),
  sectionId: z
    .string()
    .min(1, "Section ID is required")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Section ID"),
  subjectId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val))
    .refine((val) => !val || /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid Subject ID",
    }),
  isClassTeacher: z.boolean().optional().default(false),
  assignmentType: z
    .enum(["SUBJECT_TEACHER", "CLASS_TEACHER", "BOTH"])
    .optional()
    .default("SUBJECT_TEACHER"),
});

export const updateTeacherAssignmentSchema = z.object({
  isClassTeacher: z.boolean().optional(),
  isActive: z.boolean().optional(),
  assignmentType: z.enum(["SUBJECT_TEACHER", "CLASS_TEACHER", "BOTH"]).optional(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
export type TeacherStatusInput = z.infer<typeof teacherStatusSchema>;
export type CreateTeacherAccountInput = z.infer<typeof createTeacherAccountSchema>;
export type CreateTeacherAssignmentInput = z.infer<typeof createTeacherAssignmentSchema>;
export type UpdateTeacherAssignmentInput = z.infer<typeof updateTeacherAssignmentSchema>;
