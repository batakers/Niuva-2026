import { describe, expect, it } from "vitest";

import { buildPageSocialMetadata, buildRootMetadata } from "@/lib/site-metadata";

describe("buildPageSocialMetadata", () => {
  it("repeats siteName/locale/type because page openGraph replaces the layout object", () => {
    const social = buildPageSocialMetadata({ title: "Shop · Niuva", description: "Desc", path: "/shop" });

    expect(social.openGraph).toMatchObject({
      type: "website",
      siteName: "Niuva",
      locale: "id_ID",
      title: "Shop · Niuva",
      description: "Desc",
      url: "/shop",
    });
    expect(social.twitter).toMatchObject({ card: "summary", title: "Shop · Niuva", description: "Desc" });
    expect(social.openGraph).not.toHaveProperty("images");
  });
});

describe("buildRootMetadata", () => {
  it("derives metadataBase from the tier origin and sets openGraph and twitter", () => {
    const metadata = buildRootMetadata({
      NIUVA_DEPLOYMENT_TIER: "production",
      APP_URL: "https://niuva.example.com",
    });

    expect(metadata.metadataBase?.toString()).toBe("https://niuva.example.com/");
    expect(metadata.openGraph).toMatchObject({ type: "website", siteName: "Niuva", locale: "id_ID" });
    expect(metadata.twitter).toMatchObject({ card: "summary", title: "Niuva" });
  });

  it("omits metadataBase instead of guessing when the origin is invalid", () => {
    for (const appUrl of ["", undefined, "not a url"]) {
      const metadata = buildRootMetadata({ NIUVA_DEPLOYMENT_TIER: "production", APP_URL: appUrl });

      expect(metadata.metadataBase).toBeUndefined();
      expect(metadata.openGraph).toBeDefined();
      expect(metadata.twitter).toBeDefined();
    }
  });
});
