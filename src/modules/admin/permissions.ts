import type { AdminRole } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/clerk";
import { appError } from "@/modules/shared/errors";

export const ADMIN_PERMISSIONS = [
  "ADMIN_PROFILE_MANAGE",
  "AUDIT_READ",
  "CATALOG_WRITE",
  "CUSTOM_PRINT_REVIEW",
  "INQUIRY_MANAGE",
  "INVENTORY_ADJUST",
  "ORDER_CANCEL_PAID",
  "ORDER_FULFILL",
  "PAYMENT_CANCEL_PENDING",
  "PAYMENT_REFUND_FULL",
  "PORTFOLIO_WRITE",
  "PRICING_RULE_ACTIVATE",
  "QUOTE_MANAGE",
  "SHIPPING_MANAGE",
  "SYSTEM_POLICY_MANAGE",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const ROUTINE_ADMIN_PERMISSIONS: readonly AdminPermission[] = [
  "AUDIT_READ",
  "CATALOG_WRITE",
  "CUSTOM_PRINT_REVIEW",
  "INQUIRY_MANAGE",
  "INVENTORY_ADJUST",
  "ORDER_FULFILL",
  "PAYMENT_CANCEL_PENDING",
  "PORTFOLIO_WRITE",
  "QUOTE_MANAGE",
  "SHIPPING_MANAGE",
];

export const ADMIN_PERMISSION_MATRIX: Readonly<
  Record<AdminRole, readonly AdminPermission[]>
> = {
  ADMIN: ROUTINE_ADMIN_PERMISSIONS,
  OWNER: ADMIN_PERMISSIONS,
};

export function hasAdminPermission(
  role: AdminRole,
  permission: AdminPermission,
): boolean {
  return ADMIN_PERMISSION_MATRIX[role].includes(permission);
}

export function requireAdminPermission(
  access: AdminAccess,
  permission: AdminPermission,
): AdminAccess {
  if (!access.profile.isActive || !hasAdminPermission(access.profile.role, permission)) {
    throw appError("FORBIDDEN", {
      details: { permission },
      message: "Profil admin tidak memiliki izin untuk operasi ini.",
    });
  }

  return access;
}
