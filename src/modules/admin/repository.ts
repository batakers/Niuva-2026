import type { AdminRole, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";

export type AdminProfileAccessRecord = Readonly<{
  id: string;
  clerkUserId: string;
  isActive: boolean;
  role: AdminRole;
}>;

export interface AdminProfileReader {
  findByClerkUserId(
    clerkUserId: string,
  ): Promise<AdminProfileAccessRecord | null>;
}

export class PrismaAdminProfileRepository implements AdminProfileReader {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async findByClerkUserId(
    clerkUserId: string,
  ): Promise<AdminProfileAccessRecord | null> {
    return this.prisma.adminProfile.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        clerkUserId: true,
        isActive: true,
        role: true,
      },
    });
  }
}
