import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (publishableKey === undefined || publishableKey.trim().length === 0) {
    return children;
  }

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
