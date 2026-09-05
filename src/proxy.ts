import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

type ClerkEnvironment = Readonly<{
  CLERK_SECRET_KEY?: string;
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
}>;

function isNonEmpty(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasClerkAdminCredentials(
  environment: ClerkEnvironment = process.env as ClerkEnvironment,
): boolean {
  return (
    isNonEmpty(environment.CLERK_SECRET_KEY) &&
    isNonEmpty(environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  );
}

const adminProxy = clerkMiddleware(async (auth) => {
  await auth.protect();
});

export function createAdminAuthUnavailableResponse(): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "AUTH_UNAVAILABLE",
        message: "Layanan autentikasi admin belum tersedia.",
      },
    },
    { status: 503 },
  );
}

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // Clerk is a defense-in-depth route filter only. Every protected resource
  // must independently call requireAdmin() before reading or mutating data.
  if (!hasClerkAdminCredentials()) {
    return createAdminAuthUnavailableResponse();
  }

  return adminProxy(request, event);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
