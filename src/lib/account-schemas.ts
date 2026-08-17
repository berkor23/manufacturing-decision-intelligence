import { z } from "zod";

const password = z.string()
  .min(10, "Parola en az 10 karakter olmalı.")
  .regex(/[a-zA-ZÇĞİÖŞÜçğıöşü]/, "Parolada en az bir harf olmalı.")
  .regex(/[0-9]/, "Parolada en az bir rakam olmalı.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Adınızı ve soyadınızı yazın.").max(100),
  email: z.email("Geçerli bir e-posta adresi yazın."),
  password,
  accountType: z.enum(["INDIVIDUAL", "COMPANY"]),
  companyName: z.string().trim().max(140).optional(),
}).superRefine((value, context) => {
  if (value.accountType === "COMPANY" && (!value.companyName || value.companyName.length < 2)) {
    context.addIssue({ code: "custom", path: ["companyName"], message: "Şirket adını yazın." });
  }
});

export const loginSchema = z.object({
  email: z.email("Geçerli bir e-posta adresi yazın."),
  password: z.string().min(1, "Parolanızı yazın."),
  next: z.string().optional(),
});

export const memberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER", "VIEWER"]).default("MEMBER"),
  jobTitle: z.string().trim().max(100).optional(),
  department: z.string().trim().max(100).optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password,
});

export const memberUpdateSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "MEMBER", "VIEWER"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  jobTitle: z.string().trim().max(100).nullable().optional(),
  department: z.string().trim().max(100).nullable().optional(),
});
