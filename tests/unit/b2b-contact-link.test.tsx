import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { B2BContactLink } from "@/components/niuva/b2b-contact-link";
import { PublicSiteInformationProvider } from "@/components/niuva/public-site-information";
import { defaultSiteInformation } from "@/modules/site-information/defaults";

describe("B2B WhatsApp contact", () => {
  it("uses the public Site Information phone without an account or brief", () => {
    render(<PublicSiteInformationProvider values={{ ...defaultSiteInformation, phone: "+62 812-3456-7890" }}>
      <B2BContactLink />
    </PublicSiteInformationProvider>);
    const link = screen.getByRole("link", { name: "Hubungi Kami" });
    const url = new URL(link.getAttribute("href")!);
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toBe("/6281234567890");
    expect(url.searchParams.get("text")).toBe("Halo Niuva, saya ingin membahas kebutuhan proyek.");
    expect(screen.queryByText("Melalui WhatsApp")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("carries service context into the WhatsApp message", () => {
    render(<B2BContactLink service="Design & Prototyping" />);
    const url = new URL(screen.getByRole("link", { name: "Hubungi Kami" }).getAttribute("href")!);
    expect(url.searchParams.get("text")).toBe("Halo Niuva, saya ingin membahas kebutuhan Design & Prototyping.");
  });
});
