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
  it("accepts Madagascar phone and normalizes to E.164", () => {
    const parsed = signupCommonSchema.safeParse({
      email: "user@example.com",
      phone: "+261341234567",
      password: "strongpass1",
      passwordConfirm: "strongpass1",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.phone).toBe("+261341234567");
    }
  });

  it("accepts non-Madagascar international phone", () => {
    const parsed = signupCommonSchema.safeParse({
      email: "user@example.com",
      phone: "+33612345678",
      password: "strongpass1",
      passwordConfirm: "strongpass1",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.phone).toBe("+33612345678");
    }
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

  it("rejects invalid phone when provided", () => {
    const parsed = contactLeadSchema.safeParse({
      name: "Jean",
      email: "",
      phone: "9999",
      message: "Bonjour",
    });
    expect(parsed.success).toBe(false);
  });

  it("normalizes international phone to E.164", () => {
    const parsed = contactLeadSchema.safeParse({
      name: "Jean",
      email: "",
      phone: "+33 6 12 34 56 78",
      message: "Bonjour",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.phone).toBe("+33612345678");
    }
  });
});

describe("optionalMgPhoneSchema", () => {
  it("accepts empty optional WhatsApp field", () => {
    const parsed = optionalMgPhoneSchema.safeParse("");
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toBe("");
    }
  });

  it("rejects invalid optional phone when provided", () => {
    const parsed = optionalMgPhoneSchema.safeParse("9999");
    expect(parsed.success).toBe(false);
  });

  it("normalizes valid optional phone to E.164", () => {
    const parsed = optionalMgPhoneSchema.safeParse("+261 34 12 34 567");
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toBe("+261341234567");
    }
  });
});
