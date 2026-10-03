import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

// Defense in depth: admin pages must never be indexed, even if a page omits its own robots metadata.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (publishableKey === undefined || publishableKey.trim().length === 0) {
    return children;
  }

  return (
    <ClerkProvider dynamic publishableKey={publishableKey}>
      {children}
    </ClerkProvider>
  );
}
