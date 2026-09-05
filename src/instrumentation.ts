export async function register() {
  const { validateStartupEnvironment } = await import("./lib/env/server");

  validateStartupEnvironment();
}
