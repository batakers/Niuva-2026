import { describe, expect, it, vi } from "vitest";
import type { createAdminAuthEngine } from "@/lib/auth/admin-engine";
import { handleAdminAuthRequest } from "@/modules/admin-auth/handler";

type Engine = ReturnType<typeof createAdminAuthEngine>;
const origin = "http://localhost:3997";
function dependencies() {
  return { profiles: { findByAuthUserId: vi.fn() }, mailReady: () => false };
}
describe("Admin auth HTTP resource boundary", () => {
  it("cancels an oversized streamed body before reading the remaining payload", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(4097));
        controller.enqueue(new Uint8Array(4097));
        controller.close();
      },
      cancel,
    });
    const handler = vi.fn();
    const request = new Request(origin + "/api/admin/auth/sign-in/email", {
      method: "POST", headers: { origin, "content-type": "application/json" }, body,
      ...{ duplex: "half" },
    });
    const response = await handleAdminAuthRequest(request, { handler } as unknown as Engine, dependencies());
    expect(response.status).toBe(413);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
  });
  it("rejects a caller-supplied MFA flag before the auth engine runs", async () => {
    const handler = vi.fn();
    const request = new Request(origin + "/api/admin/auth/sign-in/email", {
      method: "POST", headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ email: "operator@example.test", password: "Fixture-only-password!", mfaVerified: true }),
    });
    expect((await handleAdminAuthRequest(request, { handler } as unknown as Engine, dependencies())).status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });
});
