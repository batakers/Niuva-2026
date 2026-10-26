import { isolatedTestDatabase } from "./isolated-test-database";
import { operationalJobFixture } from "./operational-job-fixture";

export async function isolatedOperationalJobFixture() {
  const database = await isolatedTestDatabase("status");
  try {
    const fixture = await operationalJobFixture({ prisma: database.prisma, url: database.url });
    return { ...fixture, async dispose() { try { await fixture.dispose(); } finally { await database.dispose(); } } };
  } catch (error) { await database.dispose(); throw error; }
}
