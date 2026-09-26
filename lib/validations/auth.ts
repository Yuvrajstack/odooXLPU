import { z } from "zod";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>_~`=+\-\/\\[\]]).{9,}$/;

export const signupSchema = z
  .object({
    loginId: z
      .string()
      .min(6, "Login ID must be at least 6 characters")
      .max(12, "Login ID cannot exceed 12 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Login ID can only contain letters, numbers, and underscores"
      ),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(9, "Password length must be more than 8 characters")
      .refine(
        (val) => /[a-z]/.test(val),
        "Password must contain at least one lowercase letter"
      )
      .refine(
        (val) => /[A-Z]/.test(val),
        "Password must contain at least one uppercase letter"
      )
      .refine(
        (val) => /[!@#$%^&*(),.?":{}|<>_~`=+\-\/\\[\]]/.test(val),
        "Password must contain at least one special character"
      ),
    confirmPassword: z.string().min(1, "Please re-enter your password"),
    role: z
      .enum(["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"])
      .default("WAREHOUSE_STAFF")
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  loginId: z.string().min(1, "Login ID or Email is required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  newPassword: z
    .string()
    .min(9, "Password length must be more than 8 characters")
    .refine(
      (val) => /[a-z]/.test(val),
      "Password must contain at least one lowercase letter"
    )
    .refine(
      (val) => /[A-Z]/.test(val),
      "Password must contain at least one uppercase letter"
    )
    .refine(
      (val) => /[!@#$%^&*(),.?":{}|<>_~`=+\-\/\\[\]]/.test(val),
      "Password must contain at least one special character"
    ),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  email: z.string().email("Please provide a valid email address").optional(),
  avatar: z.string().url("Invalid avatar URL").optional().nullable(),
});

export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
