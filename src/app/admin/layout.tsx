import type { Metadata } from "next";
import type { ReactNode } from "react";

// Defense in depth: admin pages must never be indexed, even if a page omits its own robots metadata.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
