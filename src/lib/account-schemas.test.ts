import { describe, expect, it } from "vitest";
import { memberSchema, registerSchema } from "./account-schemas";

describe("hesap doğrulama kuralları", () => {
  it("bireysel hesabı şirket adı olmadan kabul eder", () => {
    expect(registerSchema.safeParse({
      name: "Bora Yılmaz",
      email: "bora@example.com",
      password: "Guvenli12345",
      accountType: "INDIVIDUAL",
    }).success).toBe(true);
  });

  it("şirket hesabında şirket adını zorunlu tutar", () => {
    expect(registerSchema.safeParse({
      name: "Bora Yılmaz",
      email: "bora@example.com",
      password: "Guvenli12345",
      accountType: "COMPANY",
    }).success).toBe(false);
  });

  it("zayıf parolayı reddeder", () => {
    expect(registerSchema.safeParse({
      name: "Bora Yılmaz",
      email: "bora@example.com",
      password: "1234567890",
      accountType: "INDIVIDUAL",
    }).success).toBe(false);
  });

  it("şirket sahibinin OWNER rolüyle çalışan oluşturmasına izin vermez", () => {
    expect(memberSchema.safeParse({
      name: "Yeni Kullanıcı",
      email: "user@example.com",
      password: "Guvenli12345",
      role: "OWNER",
    }).success).toBe(false);
  });
});
