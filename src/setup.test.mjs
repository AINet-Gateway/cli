import assert from "node:assert/strict";
import test from "node:test";

import { deriveScopes, missingRequiredScopes } from "./scopes.mjs";

test("deriveScopes grants the standard required scopes for selected tools", () => {
  assert.deepEqual(deriveScopes(["codex"]), [
    "openai:responses",
    "openai:chat_completions",
    "openai:models"
  ]);
  assert.deepEqual(deriveScopes(["claude"]), [
    "anthropic:messages",
    "anthropic:models",
    "anthropic:count_tokens"
  ]);
});

test("missingRequiredScopes rejects custom scopes that cannot run the selected tool", () => {
  assert.deepEqual(missingRequiredScopes(["codex"], ["openai:models"]), [
    "Codex CLI: openai:responses",
    "Codex CLI: openai:chat_completions"
  ]);
  assert.deepEqual(
    missingRequiredScopes(["claude"], ["anthropic:messages", "anthropic:models"]),
    ["Claude Code: anthropic:count_tokens"]
  );
  assert.deepEqual(missingRequiredScopes(["codex"], deriveScopes(["codex"])), []);
});
