import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicPageViewCollector } from "@/components/niuva/public-page-view-collector";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

afterEach(() => {
  vi.unstubAllGlobals();
  pathname = "/";
});

describe("PublicPageViewCollector", () => {
  it("mengirim satu hit tanpa credential/referrer dan mengabaikan route privat", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const view = render(<PublicPageViewCollector />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/analytics/page-view");
    expect(options.credentials).toBe("omit");
    expect(options.referrerPolicy).toBe("no-referrer");
    expect(JSON.parse(String(options.body))).toEqual({ routeGroup: "home", source: "direct", landing: true });

    pathname = "/account";
    view.rerender(<PublicPageViewCollector />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    pathname = "/shop/item-1";
    view.rerender(<PublicPageViewCollector />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body))).toEqual({
      routeGroup: "product_detail", source: "internal", landing: false,
    });
  });
});
