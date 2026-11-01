import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it.each(["text-caption", "text-ui", "text-lead"])("keeps the named size %s next to a text colour", (size) => {
    expect(cn(size, "text-muted-foreground")).toBe(`${size} text-muted-foreground`);
    expect(cn("text-primary-foreground", size)).toBe(`text-primary-foreground ${size}`);
  });

  it("lets a later font size replace a named size", () => {
    expect(cn("text-ui font-semibold", "text-sm")).toBe("font-semibold text-sm");
    expect(cn("text-base", "text-caption")).toBe("text-caption");
  });

  it("still lets a later text colour replace an earlier one", () => {
    expect(cn("text-ui text-muted-foreground", "text-foreground")).toBe("text-ui text-foreground");
  });
});
