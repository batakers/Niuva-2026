export async function register() {
  const { assertObjectStorageStartup } = await import(
    "./lib/env/object-storage-startup"
  );
  const { validateStartupEnvironment } = await import("./lib/env/server");

  // Half-filled storage config would silently drop the upload connect-src origin.
  assertObjectStorageStartup();
  validateStartupEnvironment();
}
