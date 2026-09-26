import Image from "next/image";

type NiuvaLogoProps = {
  className?: string;
  priority?: boolean;
};

export default function NiuvaLogo({ className, priority = false }: NiuvaLogoProps) {
  return (
    <Image
      alt="Niuva logo"
      className={className}
      height={346}
      priority={priority}
      src="/assets/brand/niuva-logo-horizontal-dark.svg"
      width={1831}
    />
  );
}
