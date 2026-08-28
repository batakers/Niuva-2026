import Image from "next/image";

import brandRuntime from "@/app/auis/_data/brand.runtime.json";

type AuLogoProps = {
  className?: string;
  priority?: boolean;
};

export default function AuLogo({ className, priority = false }: AuLogoProps) {
  return (
    <Image
      alt={`${brandRuntime.name} logo`}
      className={className}
      height={346}
      priority={priority}
      src={brandRuntime.logo}
      width={1831}
    />
  );
}
