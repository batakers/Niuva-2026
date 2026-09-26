import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  CheckCircle2,
  Circle,
  CircleDollarSign,
  Clock3,
  FileBox,
  FileCheck2,
  FileLock2,
  FileSearch,
  ImageOff,
  Info,
  LockKeyhole,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  ReceiptText,
  RefreshCw,
  ScanSearch,
  SearchX,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UploadCloud,
  X,
  XCircle,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

const icons = {
  "alert-circle": AlertCircle,
  "arrow-down": ArrowDown,
  "arrow-right": ArrowRight,
  "arrow-up-right": ArrowUpRight,
  box: Box,
  check: Check,
  "check-circle-2": CheckCircle2,
  circle: Circle,
  "circle-dollar-sign": CircleDollarSign,
  "clock-3": Clock3,
  "file-box": FileBox,
  "file-check-2": FileCheck2,
  "file-lock-2": FileLock2,
  "file-search": FileSearch,
  "image-off": ImageOff,
  info: Info,
  "lock-keyhole": LockKeyhole,
  menu: Menu,
  minus: Minus,
  "package-check": PackageCheck,
  plus: Plus,
  "receipt-text": ReceiptText,
  "refresh-cw": RefreshCw,
  "scan-search": ScanSearch,
  "search-x": SearchX,
  "shield-check": ShieldCheck,
  "trash-2": Trash2,
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
