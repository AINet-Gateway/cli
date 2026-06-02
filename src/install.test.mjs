import assert from "node:assert/strict";
import test from "node:test";

test("installCommandForPlatform uses PowerShell installers on Windows", async () => {
  const { installCommandForPlatform } = await import(`./install.mjs?win-install=${Date.now()}`);

  assert.equal(
    installCommandForPlatform("claude", "win32"),
    'powershell -ExecutionPolicy Bypass -Command "irm https://claude.ai/install.ps1 | iex"'
  );
  assert.equal(
    installCommandForPlatform("codex", "win32"),
    'powershell -ExecutionPolicy Bypass -Command "irm https://chatgpt.com/codex/install.ps1 | iex"'
  );
});

test("installCommandForPlatform keeps native shell installers off Windows", async () => {
  const { installCommandForPlatform } = await import(`./install.mjs?unix-install=${Date.now()}`);

  assert.match(installCommandForPlatform("claude", "darwin"), /https:\/\/claude\.ai\/install\.sh/);
  assert.match(installCommandForPlatform("codex", "linux"), /https:\/\/chatgpt\.com\/codex\/install\.sh/);
});
