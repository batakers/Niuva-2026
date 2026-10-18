import { createJiti } from "jiti";
import type { PrismaClient } from "../src/generated/prisma/client";

const jiti = createJiti(import.meta.url, { tsconfigPaths: true });
const [{ getPrismaClient }, { executeJobCli }, { createOperationalJobRuntime }] = await Promise.all([
  jiti.import<typeof import("../src/lib/db/prisma")>("../src/lib/db/prisma"),
  jiti.import<typeof import("../src/modules/jobs/cli")>("../src/modules/jobs/cli"),
  jiti.import<typeof import("../src/modules/jobs/runtime")>("../src/modules/jobs/runtime"),
]);

let prisma: PrismaClient | undefined;
const result = await executeJobCli(process.argv.slice(2), () => {
  prisma = getPrismaClient();
  return createOperationalJobRuntime({ prisma, source: process.env });
});
console.log(JSON.stringify(result.output));
process.exitCode = result.exitCode;
await prisma?.$disconnect().catch(() => { process.exitCode = 1; });
