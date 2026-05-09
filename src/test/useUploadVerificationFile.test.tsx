import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * HOTFIX PROMPT 7 — useUploadVerificationFile force `getSession()` avant
 * l'appel storage. Sans session → throw `verification.errors.notAuthenticated`.
 * Avec session → utilise `session.user.id` (pas un param React stale) pour
 * construire le path et passe `contentType: file.type`.
 */

const sessionMock = vi.hoisted(() => ({
  data: { session: null as unknown },
  error: null as unknown,
}));

const uploadMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => sessionMock),
    },
    storage: {
      from: vi.fn(() => ({ upload: uploadMock })),
    },
  },
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function makeFile(): File {
  return new File([new Uint8Array(1024)], "cin.jpg", { type: "image/jpeg" });
}

describe("useUploadVerificationFile (HOTFIX auth race)", () => {
  beforeEach(() => {
    sessionMock.data = { session: null };
    sessionMock.error = null;
    uploadMock.mockReset();
  });

  it("throw 'verification.errors.notAuthenticated' si getSession() retourne null", async () => {
    sessionMock.data = { session: null };

    const { useUploadVerificationFile } = await import(
      "@/hooks/verification/useUploadVerificationFile"
    );
    const Wrapper = makeWrapper();
    const { result } = renderHook(() => useUploadVerificationFile(), { wrapper: Wrapper });

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.mutateAsync({
          file: makeFile(),
          sessionId: "sess-1",
          docType: "cin_front",
        });
      } catch (e) {
        caught = e as Error;
      }
    });

    expect(caught).not.toBeNull();
    expect(caught!.message).toBe("verification.errors.notAuthenticated");
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("happy path : utilise session.user.id pour le path + contentType=file.type", async () => {
    sessionMock.data = { session: { user: { id: "user-from-session-uuid" } } };
    uploadMock.mockResolvedValue({ data: { path: "x" }, error: null });

    const { useUploadVerificationFile } = await import(
      "@/hooks/verification/useUploadVerificationFile"
    );
    const Wrapper = makeWrapper();
    const { result } = renderHook(() => useUploadVerificationFile(), { wrapper: Wrapper });

    let returnedPath: string | undefined;
    await act(async () => {
      const res = await result.current.mutateAsync({
        file: makeFile(),
        sessionId: "sess-1",
        docType: "cin_front",
      });
      returnedPath = res.path;
    });

    expect(returnedPath).toBe("user-from-session-uuid/sess-1/cin_front.jpg");
    expect(uploadMock).toHaveBeenCalledTimes(1);
    const [pathArg, fileArg, optsArg] = uploadMock.mock.calls[0];
    expect(pathArg).toBe("user-from-session-uuid/sess-1/cin_front.jpg");
    expect(fileArg).toBeInstanceOf(File);
    expect(optsArg).toMatchObject({
      upsert: true,
      cacheControl: "3600",
      contentType: "image/jpeg",
    });
  });

  it("throw 'verification.errors.notAuthenticated' si getSession() throw / error", async () => {
    sessionMock.data = { session: null };
    sessionMock.error = { message: "session_fetch_failed" };

    const { useUploadVerificationFile } = await import(
      "@/hooks/verification/useUploadVerificationFile"
    );
    const Wrapper = makeWrapper();
    const { result } = renderHook(() => useUploadVerificationFile(), { wrapper: Wrapper });

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.mutateAsync({
          file: makeFile(),
          sessionId: "sess-1",
          docType: "cin_front",
        });
      } catch (e) {
        caught = e as Error;
      }
    });

    expect(caught!.message).toBe("verification.errors.notAuthenticated");
  });
});
