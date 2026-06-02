import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { ok, plan, run, step, warn } from "./util.mjs";
import { which } from "./detect.mjs";
import { t } from "./i18n.mjs";

export const TOOL_INSTALL = {
  claude: {
    label: "Claude Code",
    script: "curl -fsSL https://claude.ai/install.sh | bash -s stable",
    installUrl: "https://claude.ai/install.sh",
    installShell: "/bin/bash",
    installArgs: ["stable"],
    update: "claude update",
    version: "claude --version"
  },
  codex: {
    label: "Codex CLI",
    script: "curl -fsSL https://chatgpt.com/codex/install.sh | sh",
    installUrl: "https://chatgpt.com/codex/install.sh",
    installShell: "/bin/sh",
    installArgs: [],
    brewCask: "codex",
    update: "codex update",
    version: "codex --version"
  }
};

function isWindows() {
  return process.platform === "win32";
}

async function runScript(script) {
  return run("/bin/sh", ["-c", script], { capture: false });
}

async function runDownloadedInstaller(tool, spec) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `ainet-${tool}-install-`));
  const scriptFile = path.join(tmpDir, "install.sh");
  try {
    const curl = await run("curl", ["-fsSL", spec.installUrl, "-o", scriptFile], { capture: false });
    if (curl.code !== 0) return curl;
    await fs.chmod(scriptFile, 0o700);
    return run(spec.installShell, [scriptFile, ...spec.installArgs], { capture: false });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

export async function installTool(tool, { dryRun = false } = {}) {
  const spec = TOOL_INSTALL[tool];
  if (!spec) throw new Error(t("unknownToolShort", { tool }));
  if (dryRun) {
    await plan(t("installPlan", { label: spec.label, script: spec.script }));
    return;
  }
  if (isWindows()) {
    await warn(t("nativeInstallUnsupported", { label: spec.label }));
    throw new Error(t("windowsInstallUnsupported", { tool }));
  }
  await step(t("installing", { label: spec.label }));
  let result = await runDownloadedInstaller(tool, spec);
  if (result.code !== 0 && spec.brewCask && (await which("brew"))) {
    await warn(t("primaryInstallerFailed", { code: result.code }));
    result = await runScript(`brew install --cask ${spec.brewCask}`);
  }
  if (result.code !== 0) {
    throw new Error(t("installingFailed", { label: spec.label, code: result.code, script: spec.script }));
  }
  const installedPath = await which(tool);
  if (!installedPath) {
    throw new Error(t("installingFailed", { label: spec.label, code: -1, script: spec.script }));
  }
  await ok(t("installed", { label: spec.label }));
}

export async function updateTool(tool, { dryRun = false } = {}) {
  const spec = TOOL_INSTALL[tool];
  if (!spec) throw new Error(t("unknownToolShort", { tool }));
  if (dryRun) {
    await plan(t("updatePlan", { label: spec.label, command: spec.update }));
    return true;
  }
  await step(t("updating", { label: spec.label }));
  const result = await runScript(spec.update);
  if (result.code !== 0) {
    await warn(t("updateFailedMaybeCurrent", { command: spec.update, code: result.code }));
    return false;
  }
  await ok(t("updated", { label: spec.label }));
  return true;
}

export async function toolVersion(tool) {
  const spec = TOOL_INSTALL[tool];
  if (!spec) throw new Error(t("unknownToolShort", { tool }));
  const result = await run("/bin/sh", ["-c", spec.version], { capture: true });
  if (result.code !== 0) return null;
  const line = (result.stdout || result.stderr).split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  if (!line) return null;
  const m = line.match(/\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?/);
  return m ? m[0] : line;
}

export async function ensureInstalled(tool, current, { update = false, dryRun = false } = {}) {
  const present = Boolean(current && current.path);
  if (!present) {
    await installTool(tool, { dryRun });
    return { path: tool, freshlyInstalled: true };
  }
  if (update) {
    await updateTool(tool, { dryRun });
  }
  return { ...current, freshlyInstalled: false };
}
