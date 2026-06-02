import fs from "node:fs/promises";

import {
  applyClaudeAinet,
  applyCodexAinet,
  claudeSettingsPath,
  codexConfigPath,
  removeClaudeAinet,
  restoreCodexSubscription
} from "./config.mjs";
import { gatewayUrl } from "./deviceCode.mjs";
import { t } from "./i18n.mjs";
import { codexTokenPath, readState, updateToolState } from "./state.mjs";
import { ok, step, warn } from "./util.mjs";

export const TOOLS = ["claude", "codex"];

const SECTION_MARKER = "ainet-managed";

async function fileHasAinet(tool) {
  try {
    if (tool === "claude") {
      const raw = await fs.readFile(claudeSettingsPath(), "utf8");
      const json = JSON.parse(raw);
      return Boolean(json?.env?.ANTHROPIC_BASE_URL && json?.env?.ANTHROPIC_AUTH_TOKEN);
    }
    if (tool === "codex") {
      const raw = await fs.readFile(codexConfigPath(), "utf8");
      return raw.includes(`# >>> ${SECTION_MARKER}`) && /model_provider\s*=\s*"ainet"/.test(raw);
    }
  } catch {
    return false;
  }
  return false;
}

async function readSavedAinetKey() {
  try {
    const key = (await fs.readFile(codexTokenPath(), "utf8")).trim();
    return key || null;
  } catch {
    return null;
  }
}

async function requireAinetKey(apiKey, { dryRun = false } = {}) {
  if (dryRun) return apiKey ?? "dry-run";
  const key = apiKey ?? (await readSavedAinetKey());
  if (!key) {
    throw new Error(t("noAinetKey"));
  }
  return key;
}

export async function currentMode(tool) {
  const state = await readState();
  const recorded = state.tools?.[tool]?.mode ?? null;
  const onDisk = (await fileHasAinet(tool)) ? "ainet" : "subscription";
  return { recorded, effective: onDisk, drift: recorded !== null && recorded !== onDisk };
}

export async function switchTo(tool, target, { gateway, apiKey, dryRun = false } = {}) {
  if (!TOOLS.includes(tool)) throw new Error(t("unknownToolShort", { tool }));
  if (target !== "ainet" && target !== "subscription") {
    throw new Error(t("unknownMode", { mode: target }));
  }
  const baseUrl = gateway ?? (await readState()).gateway ?? gatewayUrl();
  const changes = [];

  if (tool === "claude") {
    if (target === "ainet") {
      const key = await requireAinetKey(apiKey, { dryRun });
      const res = await applyClaudeAinet({ baseUrl, apiKey: key, dryRun });
      changes.push(t("setClaude", { url: baseUrl, file: res.file }));
      if (res.backup) changes.push(t("backupSettings", { file: res.backup }));
      if (!dryRun) await updateToolState("claude", { mode: "ainet", gateway: baseUrl });
    } else {
      const res = await removeClaudeAinet({ dryRun });
      if (res.changed) {
        changes.push(t("removeClaude", { file: res.file }));
      } else {
        changes.push(t("noClaudeOverride", { file: res.file }));
      }
      if (res.backup) changes.push(t("backupSettings", { file: res.backup }));
      if (!dryRun) await updateToolState("claude", { mode: "subscription" });
    }
  }

  if (tool === "codex") {
    if (target === "ainet") {
      await requireAinetKey(null, { dryRun });
      const res = await applyCodexAinet({ baseUrl, dryRun });
      changes.push(t("setCodex", { file: res.file }));
      if (res.backup) changes.push(t("backupConfig", { file: res.backup }));
      if (!dryRun) {
        const patch = { mode: "ainet", gateway: baseUrl };
        if (res.capturedOriginal) patch.originalModelProvider = res.originalModelProvider;
        await updateToolState("codex", patch);
      }
    } else {
      const state = await readState();
      const original = state.tools?.codex?.originalModelProvider;
      const res = await restoreCodexSubscription({ originalModelProvider: original, dryRun });
      if (res.changed) {
        changes.push(t("restoreCodex", { provider: res.modelProvider, file: res.file }));
      } else {
        changes.push(t("noCodexBlock", { file: res.file }));
      }
      if (res.backup) changes.push(t("backupConfig", { file: res.backup }));
      if (!dryRun) await updateToolState("codex", { mode: "subscription" });
    }
  }

  return { tool, target, gateway: baseUrl, changes, dryRun };
}

export async function reportSwitch(result) {
  const targetLabel = result.target === "ainet" ? t("modeAinet") : t("modeSubscription");
  await step(
    result.dryRun
      ? t("wouldSwitch", { tool: result.tool, target: targetLabel })
      : t("switched", { tool: result.tool, target: targetLabel })
  );
  for (const change of result.changes) {
    if (result.dryRun) {
      const { plan } = await import("./util.mjs");
      await plan(change);
    } else {
      await ok(change);
    }
  }
  if (result.dryRun) {
    await warn(t("dryRunNoChanges"));
    return;
  }
  const hint =
    result.tool === "claude"
      ? t("verifyClaude")
      : t("verifyCodex");
  await warn(hint);
}
