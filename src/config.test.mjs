import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

async function withTempHome(fn) {
  const previousHome = process.env.HOME;
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "ainet-cli-config-test-"));
  process.env.HOME = home;
  try {
    return await fn(home);
  } finally {
    process.env.HOME = previousHome;
  }
}

async function withPlatform(platform, fn) {
  const descriptor = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", { value: platform });
  try {
    return await fn();
  } finally {
    Object.defineProperty(process, "platform", descriptor);
  }
}

test("applyCodexAinet writes model_provider before TOML tables", async () => {
  await withTempHome(async (home) => {
    const configFile = path.join(home, ".codex", "config.toml");
    await fs.mkdir(path.dirname(configFile), { recursive: true });
    await fs.writeFile(configFile, '[profiles.default]\nmodel = "gpt-5"\n');

    const { applyCodexAinet } = await import(`./config.mjs?placement=${Date.now()}`);
    const res = await applyCodexAinet({ baseUrl: "https://gateway.example", dryRun: true });

    assert.equal(
      res.content.match(/^model_provider = "ainet"$/gm)?.length,
      1,
      res.content
    );
    assert.ok(
      res.content.indexOf('model_provider = "ainet"') <
        res.content.indexOf("[profiles.default]"),
      res.content
    );
    assert.doesNotMatch(
      res.content.match(/# >>> ainet-managed[\s\S]*# <<< ainet-managed/)?.[0] ?? "",
      /^model_provider = "ainet"$/m
    );
  });
});

test("applyCodexAinet replaces single-quoted model_provider with inline comment", async () => {
  await withTempHome(async (home) => {
    const configFile = path.join(home, ".codex", "config.toml");
    await fs.mkdir(path.dirname(configFile), { recursive: true });
    await fs.writeFile(
      configFile,
      "model_provider = 'openai' # user comment\n\n[profiles.default]\nmodel = \"gpt-5\"\n"
    );

    const { applyCodexAinet } = await import(`./config.mjs?single-quoted=${Date.now()}`);
    const res = await applyCodexAinet({ baseUrl: "https://gateway.example", dryRun: true });

    assert.equal(
      res.content.match(/^model_provider\s*=/gm)?.length,
      1,
      res.content
    );
    assert.match(res.content, /^model_provider = "ainet"$/m);
    assert.doesNotMatch(res.content, /model_provider = 'openai'/);
    assert.match(res.content, /^# original_model_provider = "openai"$/m);
  });
});

test("applyCodexAinet uses Windows-compatible auth helper on win32", async () => {
  await withTempHome(async () => {
    await withPlatform("win32", async () => {
      const { applyCodexAinet } = await import(`./config.mjs?win32=${Date.now()}`);
      const res = await applyCodexAinet({ baseUrl: "https://gateway.example", dryRun: true });

      assert.match(res.content, /command = "cmd\.exe"/);
      assert.match(res.content, /%USERPROFILE%\\\\.ainet\\\\codex-token/);
      assert.doesNotMatch(res.content, /\/bin\/sh/);
    });
  });
});
