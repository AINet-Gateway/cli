import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { backupFile, codexTokenPath } from "./state.mjs";

const SECTION_MARKER = "ainet-managed";
const CLAUDE_MANAGED_ENV_KEYS = ["ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN"];

export function claudeSettingsPath() {
  return path.join(os.homedir(), ".claude", "settings.json");
}

export function codexConfigPath() {
  return path.join(os.homedir(), ".codex", "config.toml");
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function readText(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return "";
  }
}

async function writeSecure(file, content) {
  await fs.writeFile(file, content, { mode: 0o600 });
  await fs.chmod(file, 0o600);
}

export async function applyClaudeAinet({ baseUrl, apiKey, dryRun = false }) {
  const file = claudeSettingsPath();
  const existing = (await readJson(file)) ?? {};
  const env = { ...(existing.env ?? {}) };
  const previousEnv = previousClaudeEnv(existing, env);
  env.ANTHROPIC_BASE_URL = `${baseUrl}/anthropic`;
  env.ANTHROPIC_AUTH_TOKEN = apiKey;
  const next = {
    ...existing,
    env,
    [SECTION_MARKER]: {
      gateway: baseUrl,
      mode: "ainet",
      updated_at: new Date().toISOString(),
      installer: "ainet-cli",
      managed_env_keys: CLAUDE_MANAGED_ENV_KEYS,
      previous_env: previousEnv
    }
  };
  const content = JSON.stringify(next, null, 2) + "\n";
  if (dryRun) return { file, backup: null, dryRun: true, content };
  await fs.mkdir(path.dirname(file), { recursive: true });
  const backup = await backupFile(file);
  await writeSecure(file, content);
  return { file, backup };
}

export async function removeClaudeAinet({ dryRun = false } = {}) {
  const file = claudeSettingsPath();
  const existing = await readJson(file);
  if (!existing) return { file, backup: null, changed: false };
  if (!existing[SECTION_MARKER]) return { file, backup: null, changed: false };
  const env = { ...(existing.env ?? {}) };
  restoreClaudeEnv(env, existing[SECTION_MARKER]?.previous_env);
  const next = { ...existing };
  if (Object.keys(env).length > 0) {
    next.env = env;
  } else {
    delete next.env;
  }
  delete next[SECTION_MARKER];
  const content = JSON.stringify(next, null, 2) + "\n";
  if (dryRun) return { file, backup: null, dryRun: true, changed: true, content };
  const backup = await backupFile(file);
  await writeSecure(file, content);
  return { file, backup, changed: true };
}

function previousClaudeEnv(existing, env) {
  const marker = existing?.[SECTION_MARKER];
  if (marker && typeof marker === "object" && marker.previous_env) {
    return marker.previous_env;
  }
  if (marker) {
    return Object.fromEntries(CLAUDE_MANAGED_ENV_KEYS.map((key) => [key, { present: false }]));
  }
  const previous = {};
  for (const key of CLAUDE_MANAGED_ENV_KEYS) {
    if (Object.prototype.hasOwnProperty.call(env, key)) {
      previous[key] = { present: true, value: env[key] };
    } else {
      previous[key] = { present: false };
    }
  }
  return previous;
}

function restoreClaudeEnv(env, previousEnv) {
  for (const key of CLAUDE_MANAGED_ENV_KEYS) {
    const previous = previousEnv?.[key];
    if (previous && previous.present === true) {
      env[key] = previous.value;
    } else {
      delete env[key];
    }
  }
}

function stripCodexBlock(text) {
  return text
    .replace(new RegExp(`# >>> ${SECTION_MARKER}[\\s\\S]*?# <<< ${SECTION_MARKER}\\n?`, "g"), "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

function stripTopLevelModelProvider(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let seenTable = false;
  for (const line of lines) {
    if (!seenTable && line.trim().startsWith("[")) seenTable = true;
    if (!seenTable && /^\s*model_provider\s*=\s*"[^"]*"\s*$/.test(line)) continue;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

function readTopLevelModelProvider(text) {
  const stripped = text.replace(
    new RegExp(`# >>> ${SECTION_MARKER}[\\s\\S]*?# <<< ${SECTION_MARKER}`, "g"),
    ""
  );
  for (const rawLine of stripped.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("[")) break;
    const m = line.match(/^model_provider\s*=\s*"([^"]*)"/);
    if (m) return m[1];
  }
  return null;
}

function readManagedOriginalModelProvider(text) {
  const block = text.match(new RegExp(`# >>> ${SECTION_MARKER}([\\s\\S]*?)# <<< ${SECTION_MARKER}`));
  if (!block) return null;
  const line = block[1].match(/^\s*#\s*original_model_provider\s*=\s*("(?:[^"\\]|\\.)*")\s*$/m);
  if (!line) return null;
  try {
    return JSON.parse(line[1]);
  } catch {
    return null;
  }
}

function codexBlock(baseUrl, originalModelProvider) {
  const tokenFile = codexTokenPath();
  return [
    `# >>> ${SECTION_MARKER}`,
    `# Written by @ainet/cli at ${new Date().toISOString()}.`,
    `# Switch back to your subscription with \`ainet use subscription codex\`.`,
    `# original_model_provider = ${JSON.stringify(originalModelProvider || "openai")}`,
    `model_provider = "ainet"`,
    ``,
    `[model_providers.ainet]`,
    `name = "AINet Gateway"`,
    `base_url = "${baseUrl}/openai/v1"`,
    `wire_api = "responses"`,
    `requires_openai_auth = false`,
    ``,
    `[model_providers.ainet.auth]`,
    `command = "/bin/sh"`,
    `args = ["-c", "cat \\"$HOME/.ainet/codex-token\\""]`,
    `timeout_ms = 5000`,
    `# <<< ${SECTION_MARKER}`,
    ``
  ].join("\n");
}

export async function applyCodexAinet({ baseUrl, dryRun = false }) {
  const file = codexConfigPath();
  const previous = await readText(file);
  const hadBlock = previous.includes(`# >>> ${SECTION_MARKER}`);
  const originalModelProvider = hadBlock
    ? readManagedOriginalModelProvider(previous)
    : readTopLevelModelProvider(previous) ?? "openai";
  const stripped = stripTopLevelModelProvider(stripCodexBlock(previous));
  const block = codexBlock(baseUrl, originalModelProvider);
  const next = (stripped ? stripped + "\n\n" : "") + block;
  if (dryRun) {
    return { file, backup: null, dryRun: true, originalModelProvider, capturedOriginal: !hadBlock, content: next };
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  const backup = await backupFile(file);
  await writeSecure(file, next);
  return { file, backup, originalModelProvider, capturedOriginal: !hadBlock };
}

export async function restoreCodexSubscription({ originalModelProvider, dryRun = false } = {}) {
  const file = codexConfigPath();
  const previous = await readText(file);
  if (!previous) return { file, backup: null, changed: false };
  if (!previous.includes(`# >>> ${SECTION_MARKER}`)) {
    return { file, backup: null, changed: false };
  }
  const target = originalModelProvider || readManagedOriginalModelProvider(previous) || "openai";
  let stripped = stripCodexBlock(previous);
  const hasTopLevel = readTopLevelModelProvider(stripped) !== null;
  if (hasTopLevel) {
    stripped = stripped.replace(
      /^(\s*)model_provider\s*=\s*"[^"]*"/m,
      `$1model_provider = "${target}"`
    );
  } else {
    const lines = stripped.split(/\r?\n/);
    let insertAt = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("[")) break;
      if (lines[i].trim() !== "") insertAt = i + 1;
    }
    lines.splice(insertAt, 0, `model_provider = "${target}"`);
    stripped = lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
  }
  const content = stripped + "\n";
  if (dryRun) return { file, backup: null, dryRun: true, changed: true, modelProvider: target, content };
  const backup = await backupFile(file);
  await writeSecure(file, content);
  return { file, backup, changed: true, modelProvider: target };
}
