import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Clock3,
  FileCheck2,
  Info,
  LockKeyhole,
  RefreshCw,
  TriangleAlert,
  UploadCloud,
  X,
  XCircle,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

const icons = {
  "alert-circle": AlertCircle,
  "arrow-right": ArrowRight,
  "arrow-up-right": ArrowUpRight,
  "check-circle-2": CheckCircle2,
  circle: Circle,
  "clock-3": Clock3,
  "file-check-2": FileCheck2,
  info: Info,
  "lock-keyhole": LockKeyhole,
  "refresh-cw": RefreshCw,
  "triangle-alert": TriangleAlert,
  "upload-cloud": UploadCloud,
  x: X,
  "x-circle": XCircle,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export type IconProps = Omit<LucideProps, "name"> & {
  name: IconName;
};

export function Icon({ name, ...props }: IconProps) {
  const IconComponent = icons[name];

  return <IconComponent {...props} />;
}
