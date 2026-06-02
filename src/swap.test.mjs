import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

async function withTempHome(fn) {
  const previousHome = process.env.HOME;
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "ainet-cli-swap-test-"));
  process.env.HOME = home;
  try {
    return await fn(home);
  } finally {
    process.env.HOME = previousHome;
  }
}

test("switchTo refuses Codex AINet mode when saved key lacks OpenAI scopes", async () => {
  await withTempHome(async (home) => {
    const stateDir = path.join(home, ".ainet");
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(path.join(stateDir, "codex-token"), "ak_test", { mode: 0o600 });
    await fs.writeFile(
      path.join(stateDir, "state.json"),
      JSON.stringify(
        {
          gateway: "https://gateway.example",
          tools: {
            codex: {
              mode: "subscription",
              keyScopes: ["anthropic:messages"]
            }
          }
        },
        null,
        2
      )
    );

    const { switchTo } = await import(`./swap.mjs?scopes=${Date.now()}`);

    await assert.rejects(
      () => switchTo("codex", "ainet"),
      /not authorized for Codex|не подходит для Codex/
    );
  });
});

test("switchTo can restore Claude AINet mode from the Claude-specific saved key", async () => {
  await withTempHome(async (home) => {
    const stateDir = path.join(home, ".ainet");
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(path.join(stateDir, "claude-token"), "ak_claude", { mode: 0o600 });
    await fs.writeFile(
      path.join(stateDir, "state.json"),
      JSON.stringify(
        {
          gateway: "https://gateway.example",
          tools: {
            claude: {
              mode: "subscription",
              keyScopes: ["anthropic:messages", "anthropic:models", "anthropic:count_tokens"]
            }
          }
        },
        null,
        2
      )
    );

    const { switchTo } = await import(`./swap.mjs?claude=${Date.now()}`);
    await switchTo("claude", "ainet");

    const settings = JSON.parse(
      await fs.readFile(path.join(home, ".claude", "settings.json"), "utf8")
    );
    assert.equal(settings.env.ANTHROPIC_BASE_URL, "https://gateway.example/anthropic");
    assert.equal(settings.env.ANTHROPIC_AUTH_TOKEN, "ak_claude");
  });
});
