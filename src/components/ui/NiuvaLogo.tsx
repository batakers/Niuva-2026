import Image from "next/image";

type NiuvaLogoProps = {
  className?: string;
  preload?: boolean;
  /** Surface the logo sits on: the light-surface file has a dark wordmark. */
  surface?: "light" | "dark";
};

export default function NiuvaLogo({ className, preload = false, surface = "light" }: NiuvaLogoProps) {
  return (
    <Image
      alt="Niuva logo"
      className={className}
      height={346}
      preload={preload}
      src={surface === "light" ? "/assets/brand/niuva-logo-horizontal-light.svg" : "/assets/brand/niuva-logo-horizontal-dark.svg"}
      width={1831}
    />
  );
}
