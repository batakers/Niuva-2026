import { getSafeTestDatabaseUrl } from "@/lib/db/test-safety";

process.env.DATABASE_URL = getSafeTestDatabaseUrl({
  DATABASE_URL: process.env.DATABASE_URL,
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
});
