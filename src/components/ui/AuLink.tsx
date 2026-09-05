import type { AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AuLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "children" | "className" | "href"
> &
  VariantProps<typeof buttonVariants> & {
    children: ReactNode;
    className?: string;
    href: string;
  };

export function AuLink({
  children,
  className,
  href,
  size = "default",
  variant = "default",
  ...anchorProps
}: AuLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ size, variant }), className)}
      href={href}
      {...anchorProps}
    >
      {children}
    </Link>
  );
}
