import { z } from 'zod';

export const signUpSchema = z.object({
  firstName: z.string().nonempty("First name is required"),
  lastName: z.string().nonempty("Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(9, "Password must be at least 9 characters"),
  confirmPassword: z.string().nonempty("Please confirm your password"),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(9, "Password must be at least 9 characters"),
});