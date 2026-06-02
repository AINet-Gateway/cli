import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export function ainetDir() {
  return path.join(os.homedir(), ".ainet");
}

export function statePath() {
  return path.join(ainetDir(), "state.json");
}

export function codexTokenPath() {
  return path.join(ainetDir(), "codex-token");
}

export function claudeTokenPath() {
  return path.join(ainetDir(), "claude-token");
}

export function toolTokenPath(tool) {
  if (tool === "claude") return claudeTokenPath();
  if (tool === "codex") return codexTokenPath();
  throw new Error(`Unknown tool: ${tool}`);
}

export function backupsDir() {
  return path.join(ainetDir(), "backups");
}

const EMPTY_STATE = Object.freeze({
  gateway: null,
  tools: {}
});

export async function readState() {
  try {
    const raw = await fs.readFile(statePath(), "utf8");
    const parsed = JSON.parse(raw);
    return {
      gateway: parsed.gateway ?? null,
      tools: parsed.tools ?? {}
    };
  } catch {
    return { ...EMPTY_STATE, tools: {} };
  }
}

export async function writeState(state) {
  await fs.mkdir(ainetDir(), { recursive: true });
  const next = {
    gateway: state.gateway ?? null,
    tools: state.tools ?? {}
  };
  const file = statePath();
  await fs.writeFile(file, JSON.stringify(next, null, 2) + "\n", { mode: 0o600 });
  await fs.chmod(file, 0o600);
  return file;
}

export async function updateToolState(tool, patch) {
  const state = await readState();
  const current = state.tools[tool] ?? {};
  state.tools[tool] = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  await writeState(state);
  return state.tools[tool];
}

export async function saveAinetKey(key) {
  return saveToolKey("codex", key);
}

export async function saveToolKey(tool, key) {
  await fs.mkdir(ainetDir(), { recursive: true });
  const file = toolTokenPath(tool);
  await fs.writeFile(file, key, { mode: 0o600 });
  await fs.chmod(file, 0o600);
  return file;
}

export async function backupFile(absPath) {
  let content;
  try {
    content = await fs.readFile(absPath);
  } catch {
    return null;
  }
  const tool = path.basename(path.dirname(absPath)).replace(/^\./, "") || "tool";
  const stamp = timestamp();
  const dir = path.join(backupsDir(), tool, stamp);
  await fs.mkdir(dir, { recursive: true });
  const saved = path.join(dir, path.basename(absPath));
  await fs.writeFile(saved, content, { mode: 0o600 });
  return saved;
}

function timestamp() {
  const d = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}` +
    `${pad(d.getMilliseconds(), 3)}`
  );
}
