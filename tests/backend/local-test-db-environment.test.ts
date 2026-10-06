import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it.skipIf(process.platform !== "win32")("local DB wrapper preserves an explicit test URL and rejects unsafe targets before loading a file", () => {
  const file = resolve("scripts/local-test-db.ps1").replace(/'/g, "''");
  const command = `
    $ast = [System.Management.Automation.Language.Parser]::ParseFile('${file}', [ref]$null, [ref]$null)
    $node = $ast.Find({ param($item) $item -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $item.Name -eq 'Get-SafeTestDatabaseUrl' }, $true)
    function Import-TestEnvironment { throw 'Environment file must not override an explicit target' }
    $safe = $node.Body.GetScriptBlock()
    $env:TEST_DATABASE_URL = 'postgresql://fixture@127.0.0.1:55432/isolated_test_fixture'
    if ((& $safe) -ne $env:TEST_DATABASE_URL) { throw 'Explicit test URL was changed' }
    foreach ($candidate in @('postgresql://fixture@remote.example.test/isolated_test_fixture', 'postgresql://fixture@127.0.0.1/application')) {
      $env:TEST_DATABASE_URL = $candidate
      $rejected = $false
      try { & $safe | Out-Null } catch { $rejected = $true }
      if (-not $rejected) { throw 'Unsafe target was accepted' }
    }
    Write-Output 'explicit target preserved and unsafe targets rejected'
  `;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], { encoding: "utf8", timeout: 10_000 });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("explicit target preserved and unsafe targets rejected");
});
