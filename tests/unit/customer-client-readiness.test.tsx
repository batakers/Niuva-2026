import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { B2BQuoteDecision } from "@/app/account/inquiries/[id]/b2b-quote-decision";
import { QuoteDecision } from "@/app/account/make/[id]/quote-decision";
import { CustomerLogoutButton } from "@/components/niuva/customer-logout-button";

describe("Customer controls that require client event handlers", () => {
  it.each([
    ["B2B proposal decisions", <B2BQuoteDecision key="b2b" inquiryId="inquiry" quoteId="quote" />],
    ["MAKE quote decisions", <QuoteDecision key="make" requestId="request" quoteId="quote" />],
    ["logout", <CustomerLogoutButton key="logout" />],
  ])("keeps %s disabled in server HTML and enables it after hydration", async (_, element) => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    document.body.append(container);
    const buttons = Array.from(container.querySelectorAll("button"));
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) expect(button).toBeDisabled();
      await act(async () => { root = hydrateRoot(container, element); });
      for (const button of buttons) expect(button).toBeEnabled();
    } finally {
      await act(async () => { root?.unmount(); });
      container.remove();
    }
  });
});
