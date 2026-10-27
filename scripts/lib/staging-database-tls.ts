import { createRequire } from "node:module";
import { TLSSocket } from "node:tls";

type DatabaseClient = {
  connect(): Promise<unknown>;
  end(): Promise<void>;
  connection: { stream: unknown };
};
type DatabaseDriver = { Client: new (config: { connectionString: string; connectionTimeoutMillis: number }) => DatabaseClient };

function databaseDriver(value: unknown): value is DatabaseDriver {
  return typeof value === "object" && value !== null && "Client" in value && typeof value.Client === "function";
}

// The database may be behind a TLS proxy, so verify the client-side socket.
export async function verifyDatabaseTls(connectionString: string): Promise<boolean> {
  const url = new URL(connectionString);
  const modes = url.searchParams.getAll("sslmode");
  if (modes.length !== 1 || modes[0] !== "verify-full") return false;

  const driver: unknown = createRequire(import.meta.url)("pg");
  if (!databaseDriver(driver)) throw new Error("Database driver unavailable");
  const client = new driver.Client({ connectionString, connectionTimeoutMillis: 5_000 });
  try {
    await client.connect();
    const stream = client.connection.stream;
    return stream instanceof TLSSocket && stream.authorized;
  } finally {
    await client.end();
  }
}
