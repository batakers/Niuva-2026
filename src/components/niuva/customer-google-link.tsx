"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import { cn } from "@/lib/utils";
import styles from "./customer-google-link.module.css";
import { useHydrated } from "./use-hydrated";

export function CustomerGoogleLink({ available, fontClassName, href }: {
  available: boolean;
  fontClassName: string;
  href: string;
}) {
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();
  const navigationPending = useRef(false);

  useEffect(() => {
    const reset = () => {
      navigationPending.current = false;
      setPending(false);
    };
    // A page restored from the back/forward cache keeps its React state.
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  function startNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (navigationPending.current) {
      event.preventDefault();
      return;
    }
    navigationPending.current = true;
    setPending(true);
  }

  const content = <>
    <span className={styles.icon} aria-hidden="true">
      {/* Unmodified @2x Light icon from Google's pre-approved branding bundle.
          The 20px mark is framed inside the action without its outer square.
          Source: https://developers.google.com/static/identity/images/signin-assets.zip */}
      <Image alt="" width={40} height={40} src="/assets/brand/google-sign-in-light-icon.png" className={styles.iconAsset} />
    </span>
    <span>Lanjutkan dengan Google</span>
  </>;

  return (
    <>
      {available ? (
        // Plain anchor: no prefetch, and native navigation works without JS.
        <a href={href} onClick={startNavigation} data-enhanced={hydrated} aria-describedby="customer-auth-helper" aria-disabled={pending || undefined} aria-busy={pending || undefined} className={cn(styles.action, fontClassName)}>
          {content}
        </a>
      ) : (
        <button type="button" disabled aria-describedby="customer-auth-helper" className={cn(styles.action, fontClassName)}>
          {content}
        </button>
      )}
      <p role="status" aria-live="polite" aria-atomic="true" className="min-h-5 py-2 text-sm leading-5 text-muted-foreground">
        {pending ? "Menghubungkan ke Google…" : <span aria-hidden="true">&nbsp;</span>}
      </p>
    </>
  );
}
