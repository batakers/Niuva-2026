import { cookies } from "next/headers";

import { getDatabaseEnvironment, parseServerEnvironment } from "@/lib/env/server";
import { appError } from "@/modules/shared/errors";
import {
  CUSTOMER_SESSION_COOKIE,
  hashOpaqueToken,
} from "@/modules/customer-auth/core";
import {
  CustomerAuthRepository,
  type CustomerAuthRepositoryPort,
  type CustomerProfile,
} from "@/modules/customer-auth/repository";

export type CustomerAccess = CustomerProfile;

export function isCustomerGoogleAuthAvailable(): boolean {
  try {
    const environment = parseServerEnvironment();
    return Boolean(environment.DATABASE_URL && environment.GOOGLE_CLIENT_ID && environment.GOOGLE_CLIENT_SECRET && environment.GOOGLE_REDIRECT_URI);
  } catch {
    return false;
  }
}

export function isCustomerAuthAvailable(): boolean {
  return isCustomerSessionStoreAvailable();
}

export function isCustomerSessionStoreAvailable(): boolean {
  try {
    getDatabaseEnvironment();
    return true;
  } catch {
    return false;
  }
}

export function assertCustomerAuthAvailable(): void {
  if (!isCustomerAuthAvailable()) {
    throw appError("CUSTOMER_AUTH_UNAVAILABLE");
  }
}

export async function getCustomerFromSessionToken(
  token: string | undefined,
  repository: CustomerAuthRepositoryPort = new CustomerAuthRepository(),
  now = new Date(),
): Promise<CustomerProfile | null> {
  if (token === undefined || !/^[A-Za-z0-9_-]{43,}$/.test(token)) {
    return null;
  }

  return repository.findCustomerBySessionTokenHash(hashOpaqueToken(token), now);
}

export async function getCurrentCustomer(): Promise<CustomerProfile | null> {
  const cookieStore = await cookies();
  return getCustomerFromSessionToken(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value);
}

export async function requireCustomer(): Promise<CustomerAccess> {
  assertCustomerAuthAvailable();

  const customer = await getCurrentCustomer();
  if (customer === null) {
    throw appError("UNAUTHORIZED");
  }

  return customer;
}

export async function revokeCurrentCustomerSession(
  repository: CustomerAuthRepositoryPort = new CustomerAuthRepository(),
): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (token === undefined || !/^[A-Za-z0-9_-]{43,}$/.test(token)) {
    return;
  }

  await repository.revokeSession(hashOpaqueToken(token), new Date());
}
