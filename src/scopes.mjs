export const ALLOWED_SCOPES = [
  "anthropic:messages",
  "anthropic:models",
  "anthropic:count_tokens",
  "openai:responses",
  "openai:chat_completions",
  "openai:models",
  "openai:embeddings",
  "openai:images",
  "openai:moderations",
  "openai:audio"
];

const SCOPES_BY_TOOL = {
  claude: ["anthropic:messages", "anthropic:models", "anthropic:count_tokens"],
  codex: ["openai:responses", "openai:chat_completions", "openai:models"]
};

const TOOL_LABELS = {
  claude: "Claude Code",
  codex: "Codex CLI"
};

export function deriveScopes(tools) {
  const set = new Set();
  for (const tool of tools) {
    for (const scope of SCOPES_BY_TOOL[tool] ?? []) set.add(scope);
  }
  return ALLOWED_SCOPES.filter((s) => set.has(s));
}

export function missingRequiredScopes(tools, scopes) {
  const granted = new Set(scopes);
  const missing = [];
  for (const tool of tools) {
    for (const scope of SCOPES_BY_TOOL[tool] ?? []) {
      if (!granted.has(scope)) missing.push(`${TOOL_LABELS[tool] ?? tool}: ${scope}`);
    }
  }
  return missing;
}
