import type { AdminAccess } from "@/lib/auth/admin";
import { z } from "zod";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { parseWithValidation } from "@/modules/shared/validation";
import { CustomerDirectoryRepository } from "./repository";
import { parseCustomerDirectoryQuery } from "./query";

export class CustomerDirectoryService {
  constructor(private readonly repository = new CustomerDirectoryRepository()) {}
  async list(access: AdminAccess, raw: unknown) {
    requireAdminPermission(access, "CUSTOMER_DIRECTORY_READ");
    return this.repository.list(parseCustomerDirectoryQuery(raw));
  }
  async detail(access: AdminAccess, id: string, raw: unknown = {}) {
    requireAdminPermission(access, "CUSTOMER_DIRECTORY_READ");
    return this.repository.detail(parseWithValidation(z.uuid(), id), parseCustomerDirectoryQuery(raw));
  }
}
