"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { classifyPublicRoute, classifyReferrer, type PageViewPayload } from "@/modules/analytics/contract";

export function PublicPageViewCollector() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    const firstRoute = lastPath.current === null;
    lastPath.current = pathname;
    const routeGroup = classifyPublicRoute(pathname);
    if (routeGroup === null) return;
    const payload: PageViewPayload = {
      routeGroup,
      source: firstRoute ? classifyReferrer(document.referrer, window.location.origin) : "internal",
      landing: firstRoute,
    };
    void fetch("/api/analytics/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
      referrerPolicy: "no-referrer",
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
