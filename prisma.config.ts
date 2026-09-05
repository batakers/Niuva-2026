import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // `prisma generate` must work in CI before a database capability is enabled.
  // Runtime access is still fail-closed in src/lib/env/server.ts.
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
