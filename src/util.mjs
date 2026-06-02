// Minimal terminal helpers — kept dep-free so the CLI fails loud on a missing
// dependency rather than silently importing nothing.  We import picocolors
// lazily so an `npm install` problem doesn't blow up before we can apologize.

import { spawn } from "node:child_process";
import { t } from "./i18n.mjs";

let _pico = null;
async function pico() {
  if (_pico) return _pico;
  try {
    _pico = (await import("picocolors")).default;
  } catch {
    _pico = new Proxy({}, { get: () => (s) => s });
  }
  return _pico;
}

export async function logo() {
  const c = await pico();
  // 7-row chunky ASCII — keeps the install feel deliberate, not a script.
  const art = [
    "     _    ___ _   _ _____ _   ",
    "    / \\  |_ _| \\ | | ____| |_ ",
    "   / _ \\  | ||  \\| |  _| | __|",
    "  / ___ \\ | || |\\  | |___| |_ ",
    " /_/   \\_\\___|_| \\_|_____|\\__|"
  ];
  for (const row of art) console.log(c.bold(c.cyan(row)));
  console.log(c.dim(t("setupTagline")));
  console.log("");
}

export async function step(label) {
  const c = await pico();
  console.log(`${c.cyan("◆")} ${c.bold(label)}`);
}

export async function ok(label) {
  const c = await pico();
  console.log(`${c.green("✔")} ${label}`);
}

export async function warn(label) {
  const c = await pico();
  console.log(`${c.yellow("!")} ${label}`);
}

export async function plan(label) {
  const c = await pico();
  console.log(`${c.yellow("~")} ${label}`);
}

export function printError(message) {
  console.error(`\n✖ ${message}\n`);
}

export async function pending(label) {
  const c = await pico();
  process.stdout.write(`${c.dim("…")} ${c.dim(label)}\r`);
}

export function clearLine() {
  if (process.stdout.isTTY) {
    process.stdout.write("\x1b[2K\r");
  }
}

export function isDebug() {
  return process.env.AINET_DEBUG === "1" || process.env.AINET_DEBUG === "true";
}

export function debug(msg) {
  if (!isDebug()) return;
  console.error(`[ainet] ${msg}`);
}

// Promise wrapper around child_process.spawn that captures stdout/stderr.
// Used for checking whether `claude` / `codex` exist and for `npm install -g`.
export function run(cmd, args, { capture = true, env } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      env: env ? { ...process.env, ...env } : process.env,
      shell: false
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.on("data", (b) => (stdout += b.toString()));
      child.stderr.on("data", (b) => (stderr += b.toString()));
    }
    child.on("error", (err) => resolve({ code: -1, stdout, stderr: stderr + err.message }));
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
