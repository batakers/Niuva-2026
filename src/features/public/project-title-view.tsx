import { cn } from "@/lib/utils";
import { splitProjectTitle } from "./project-title";

/** A project title as the work, with its client or qualifier on its own muted line (no em dash). */
export function ProjectTitle({ title, qualifierClassName }: Readonly<{ title: string; qualifierClassName?: string }>) {
  const { name, qualifier } = splitProjectTitle(title);
  return (
    <span className="block">
      {name}
      {qualifier ? <span className={cn("block text-muted-foreground", qualifierClassName)}>{qualifier}</span> : null}
    </span>
  );
}
