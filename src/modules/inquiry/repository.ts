import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";

import type { B2BInquiryInput } from "./schema";

type InquiryCreateInput = B2BInquiryInput &
  Readonly<{
    id?: string;
    publicTokenHash: string;
    referenceNumber: string;
  }>;

export class B2BInquiryRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async referenceExists(referenceNumber: string): Promise<boolean> {
    const inquiry = await this.prisma.b2BInquiry.findUnique({
      where: { referenceNumber },
      select: { id: true },
    });

    return inquiry !== null;
  }

  async findUploadReadyFileIds(fileIds: readonly string[]): Promise<readonly string[]> {
    if (fileIds.length === 0) {
      return [];
    }

    const files = await this.prisma.storedFile.findMany({
      where: {
        bucketScope: "PRIVATE_CUSTOMER",
        id: { in: [...new Set(fileIds)] },
        uploadStatus: "UPLOADED",
      },
      select: { id: true },
    });

    return files.map((file) => file.id);
  }

  async create(input: InquiryCreateInput) {
    return this.prisma.$transaction(async (transaction) => {
      const inquiry = await transaction.b2BInquiry.create({
        data: {
          budgetRange: input.budgetRange,
          company: input.company,
          confidentialityAck: input.confidentialityAck,
          currentStage: input.currentStage,
          description: input.description,
          email: input.email,
          name: input.name,
          phone: input.phone,
          preferredService: input.preferredService,
          projectGoal: input.projectGoal,
          referenceLink: input.referenceLink,
          referenceNumber: input.referenceNumber,
          targetDeadline: new Date(`${input.targetDeadline}T00:00:00.000Z`),
          targetQuantity: input.targetQuantity,
          ...(input.id === undefined ? {} : { id: input.id }),
          publicTokenHash: input.publicTokenHash,
        },
      });

      if (input.attachmentFileIds !== undefined) {
        await this.attachFiles(transaction, inquiry.id, input.attachmentFileIds);
      }

      return inquiry;
    });
  }

  async updateStatusIfCurrent(
    inquiryId: string,
    currentStatus: "NEW" | "CONTACTED" | "QUALIFIED" | "QUOTED" | "WON" | "LOST" | "CLOSED",
    nextStatus: "NEW" | "CONTACTED" | "QUALIFIED" | "QUOTED" | "WON" | "LOST" | "CLOSED",
  ): Promise<Readonly<{ id: string; status: typeof nextStatus }> | null> {
    const updated = await this.prisma.b2BInquiry.updateMany({
      where: { id: inquiryId, status: currentStatus },
      data: { status: nextStatus },
    });

    if (updated.count === 0) {
      return null;
    }

    return this.prisma.b2BInquiry.findUnique({
      where: { id: inquiryId },
      select: { id: true, status: true },
    });
  }

  private async attachFiles(
    transaction: Prisma.TransactionClient,
    inquiryId: string,
    fileIds: readonly string[],
  ): Promise<void> {
    const availableFiles = await transaction.storedFile.findMany({
      where: {
        bucketScope: "PRIVATE_CUSTOMER",
        id: { in: [...new Set(fileIds)] },
        uploadStatus: "UPLOADED",
      },
      select: { id: true },
    });

    if (availableFiles.length !== new Set(fileIds).size) {
      throw appError("CONFLICT", {
        message: "Satu atau lebih file belum siap dihubungkan ke inquiry.",
      });
    }

      await transaction.b2BInquiryFile.createMany({
      data: availableFiles.map((file) => ({
        fileId: file.id,
        inquiryId,
      })),
      });

    const verified = await transaction.storedFile.updateMany({
      where: {
        id: { in: availableFiles.map((file) => file.id) },
        uploadStatus: "UPLOADED",
      },
      data: {
        uploadStatus: "VERIFIED",
        verifiedAt: new Date(),
      },
    });

    if (verified.count !== availableFiles.length) {
      throw appError("CONFLICT", {
        message: "File berubah sebelum ownership inquiry diselesaikan.",
      });
    }
  }
}
