import os from "node:os";
import { run } from "./util.mjs";

export function detectPlatform() {
  const platform = process.platform;
  const release = os.release();
  const arch = process.arch;
  return {
    platform,
    arch,
    release,
    isWindows: platform === "win32",
    isMac: platform === "darwin",
    isLinux: platform === "linux",
    hostname: os.hostname()
  };
}

export function detectShell() {
  if (process.platform === "win32") {
    return process.env.PSModulePath ? "powershell" : process.env.ComSpec ? "cmd" : "powershell";
  }
  const shell = process.env.SHELL ?? "";
  if (shell.endsWith("/zsh")) return "zsh";
  if (shell.endsWith("/bash")) return "bash";
  if (shell.endsWith("/fish")) return "fish";
  return shell.split("/").pop() || "bash";
}

export async function which(cmd) {
  const probe = process.platform === "win32"
    ? await run("where", [cmd])
    : await run("/bin/sh", ["-c", `command -v ${shellQuote(cmd)}`]);
  if (probe.code !== 0) return null;
  const path = probe.stdout.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  return path || null;
}

function shellQuote(s) {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

async function probeVersion(cmd) {
  const probe = await run("/bin/sh", ["-c", `${cmd} --version`], { capture: true });
  if (probe.code !== 0) return null;
  const line = (probe.stdout || probe.stderr)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(Boolean);
  if (!line) return null;
  const m = line.match(/\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?/);
  return m ? m[0] : line;
}

export async function checkInstalledTools() {
  const [claudePath, codexPath, nodeVersion] = await Promise.all([
    which("claude"),
    which("codex"),
    nodeVersionInfo()
  ]);
  const [claudeVersion, codexVersion] = await Promise.all([
    claudePath ? probeVersion("claude") : Promise.resolve(null),
    codexPath ? probeVersion("codex") : Promise.resolve(null)
  ]);
  return {
    claude: claudePath ? { path: claudePath, version: claudeVersion } : null,
    codex: codexPath ? { path: codexPath, version: codexVersion } : null,
    node: nodeVersion
  };
}

async function nodeVersionInfo() {
  const major = Number(process.versions.node.split(".")[0]);
  return { version: process.versions.node, major, ok: major >= 20 };
}
