export async function register() {
  const { assertObjectStorageStartup } = await import(
    "./lib/env/object-storage-startup"
  );
  const { validateStartupEnvironment } = await import("./lib/env/server");

  // Half-filled R2 config would silently drop the R2 connect-src origin.
  assertObjectStorageStartup();
  validateStartupEnvironment();
}
