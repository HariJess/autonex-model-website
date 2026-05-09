import { describe, expect, it } from "vitest";
import { validateVerificationFile } from "@/hooks/verification/useUploadVerificationFile";

/**
 * PROMPT 7 — file validation pour le bucket verifications :
 *   - MIME types : JPEG, PNG, WebP, PDF
 *   - Max 10 MB
 */
function makeFile(type: string, size: number): File {
  const arr = new Uint8Array(Math.min(size, 1024));
  return new File([arr], "test", { type });
}

describe("validateVerificationFile (PROMPT 7)", () => {
  it("accepte JPEG <= 10MB", () => {
    expect(validateVerificationFile(makeFile("image/jpeg", 5_000_000))).toBeNull();
  });

  it("accepte PNG <= 10MB", () => {
    expect(validateVerificationFile(makeFile("image/png", 1_000_000))).toBeNull();
  });

  it("accepte WebP", () => {
    expect(validateVerificationFile(makeFile("image/webp", 1_000_000))).toBeNull();
  });

  it("accepte PDF", () => {
    expect(validateVerificationFile(makeFile("application/pdf", 5_000_000))).toBeNull();
  });

  it("rejette mime non supporté", () => {
    expect(validateVerificationFile(makeFile("video/mp4", 1_000))).toBe(
      "verification.errors.fileType",
    );
  });

  it("rejette fichier > 10MB", () => {
    const file = new File([new Uint8Array(11 * 1024 * 1024)], "big.jpg", {
      type: "image/jpeg",
    });
    expect(validateVerificationFile(file)).toBe("verification.errors.fileSize");
  });
});
