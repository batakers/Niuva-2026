import { describe, expect, it } from "vitest";
import { POST as submitBrief } from "@/app/api/project-brief/route";
import { POST as decideProposal } from "@/app/api/account/inquiries/[id]/quotes/[quoteId]/decision/route";

describe("retired B2B HTTP boundaries", () => {
  it("rejects legacy brief submissions before creating business records", async () => {
    const response = await submitBrief(new Request("https://niuva.test/api/project-brief", { method: "POST", body: "invalid" }));
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects legacy proposal decisions without requiring a Customer session", async () => {
    const response = await decideProposal(new Request("https://niuva.test/api/account/inquiries/old/quotes/old/decision", { method: "POST", body: "invalid" }), { params: Promise.resolve({ id: "old", quoteId: "old" }) });
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
