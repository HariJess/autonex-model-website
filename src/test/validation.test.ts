import { describe, expect, it } from "vitest";
import { contactLeadSchema, loginSchema, optionalMgPhoneSchema, signupCommonSchema } from "@/lib/validation";

describe("loginSchema", () => {
  it("accepts valid email and strong password", () => {
    const parsed = loginSchema.safeParse({ email: "User@Example.com", password: "password123" });
    expect(parsed.success).toBe(true);
  });

  it("rejects short password", () => {
    const parsed = loginSchema.safeParse({ email: "user@example.com", password: "1234567" });
    expect(parsed.success).toBe(false);
  });
});

describe("signupCommonSchema", () => {
  it("accepts Madagascar phone", () => {
    const parsed = signupCommonSchema.safeParse({
      email: "user@example.com",
      phone: "+261341234567",
      password: "strongpass1",
      passwordConfirm: "strongpass1",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid phone", () => {
    const parsed = signupCommonSchema.safeParse({
      email: "user@example.com",
      phone: "123",
      password: "strongpass1",
      passwordConfirm: "strongpass1",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("contactLeadSchema", () => {
  it("requires at least one contact channel", () => {
    const parsed = contactLeadSchema.safeParse({
      name: "",
      email: "",
      phone: "",
      message: "Bonjour",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts valid email contact", () => {
    const parsed = contactLeadSchema.safeParse({
      name: "",
      email: "lead@example.com",
      phone: "",
      message: "Intéressé par ce bien",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid optional Madagascar phone when provided", () => {
    const parsed = optionalMgPhoneSchema.safeParse("9999");
    expect(parsed.success).toBe(false);
  });
});

