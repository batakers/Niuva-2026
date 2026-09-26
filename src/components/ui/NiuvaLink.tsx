import type { AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NiuvaLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "children" | "className" | "href"
> &
  VariantProps<typeof buttonVariants> & {
    children: ReactNode;
    className?: string;
    href: string;
  };

export function NiuvaLink({
  children,
  className,
  href,
  size = "default",
  variant = "default",
  ...anchorProps
}: NiuvaLinkProps) {
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
