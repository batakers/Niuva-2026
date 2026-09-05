type DatabaseEnvironmentSource = Readonly<
  Partial<Record<"DATABASE_URL" | "TEST_DATABASE_URL", string | undefined>>
>;

export class TestDatabaseSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestDatabaseSafetyError";
  }
}

function parsePostgresUrl(value: string, field: string): URL {
  try {
    const url = new URL(value);

    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      throw new TestDatabaseSafetyError(`${field} harus menggunakan URL PostgreSQL.`);
    }

    return url;
  } catch (error) {
    if (error instanceof TestDatabaseSafetyError) {
      throw error;
    }

    throw new TestDatabaseSafetyError(`${field} bukan URL PostgreSQL yang valid.`);
  }
}

function getDatabaseName(url: URL): string {
  return decodeURIComponent(url.pathname).replace(/^\/+/, "");
}

function getDatabaseIdentity(url: URL): string {
  return `${url.protocol}//${url.hostname}:${url.port}/${getDatabaseName(url)}`;
}

function hasTestMarker(databaseName: string): boolean {
  return /(^|[_-])test([_-]|$)/i.test(databaseName);
}

export function getSafeTestDatabaseUrl(
  source: DatabaseEnvironmentSource,
): string {
  const candidate = source.TEST_DATABASE_URL?.trim();

  if (candidate === undefined || candidate.length === 0) {
    throw new TestDatabaseSafetyError("TEST_DATABASE_URL wajib disediakan.");
  }

  const testUrl = parsePostgresUrl(candidate, "TEST_DATABASE_URL");
  const databaseName = getDatabaseName(testUrl);

  if (!hasTestMarker(databaseName)) {
    throw new TestDatabaseSafetyError(
      "Nama database test harus memuat marker test yang terpisah.",
    );
  }

  const applicationUrl = source.DATABASE_URL?.trim();

  if (applicationUrl !== undefined && applicationUrl.length > 0) {
    const parsedApplicationUrl = parsePostgresUrl(applicationUrl, "DATABASE_URL");

    if (getDatabaseIdentity(parsedApplicationUrl) === getDatabaseIdentity(testUrl)) {
      throw new TestDatabaseSafetyError(
        "TEST_DATABASE_URL tidak boleh menunjuk database aplikasi.",
      );
    }
  }

  return testUrl.toString();
}
