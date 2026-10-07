import { afterEach, describe, expect, it, vi } from "vitest";
import { postAdminAuth } from "@/components/niuva/admin-auth-form";

afterEach(() => vi.unstubAllGlobals());

describe("Admin login failure feedback", () => {
  it.each([{ code: "EMAIL_NOT_VERIFIED" }, { error: { code: "EMAIL_NOT_VERIFIED" } }])("explains email verification for supported error shapes", async body => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(body, { status: 403 })));
    await expect(postAdminAuth("/sign-in/email", { email: "fixture@example.test", password: "Synthetic-23!" })).rejects.toThrow("Email belum diverifikasi");
  });

  it.each(["FORBIDDEN", "INVALID_ORIGIN", "INVALID_CALLBACK_URL"])("explains address rejection %s without blaming the password", async code => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { code } }, { status: 403 })));
    await expect(postAdminAuth("/sign-in/email", { email: "fixture@example.test", password: "Synthetic-23!" })).rejects.toThrow("Alamat halaman login");
  });

  it("retains generic credential failure without exposing account details", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "INVALID_EMAIL_OR_PASSWORD" }, { status: 401 })));
    await expect(postAdminAuth("/sign-in/email", { email: "fixture@example.test", password: "Synthetic-23!" })).rejects.toThrow("Periksa kembali data akun");
  });
});
