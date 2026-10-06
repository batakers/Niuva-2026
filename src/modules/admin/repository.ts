import type { AdminRole, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";

export type AdminProfileAccessRecord = Readonly<{
  id: string;
  authUserId?: string | null;
  clerkUserId?: string | null;
  isActive: boolean;
  role: AdminRole;
}>;

export interface AdminProfileReader {
  findByAuthUserId(
    authUserId: string,
  ): Promise<AdminProfileAccessRecord | null>;
}

export class PrismaAdminProfileRepository implements AdminProfileReader {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async findByAuthUserId(
    authUserId: string,
  ): Promise<AdminProfileAccessRecord | null> {
    return this.prisma.adminProfile.findUnique({
      where: { authUserId },
      select: {
        id: true,
        authUserId: true,
        isActive: true,
        role: true,
      },
    });
  }
}
