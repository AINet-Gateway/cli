import fs from "node:fs/promises";

import { checkInstalledTools } from "./detect.mjs";
import { gatewayUrl } from "./deviceCode.mjs";
import { t } from "./i18n.mjs";
import { codexTokenPath, readState } from "./state.mjs";
import { currentMode, reportSwitch, switchTo, TOOLS } from "./swap.mjs";
import { ok, step, warn } from "./util.mjs";

async function readAinetKey() {
  try {
    const key = (await fs.readFile(codexTokenPath(), "utf8")).trim();
    return key || null;
  } catch {
    return null;
  }
}

export async function runStatus({ dryRun = false } = {}) {
  const prompts = (await import("prompts")).default;
  const state = await readState();
  const switchGateway = process.env.AINET_GATEWAY_URL ? gatewayUrl() : state.gateway;
  const installed = await checkInstalledTools();

  await step(t("statusTitle"));
  if (switchGateway) await ok(t("gateway", { gateway: switchGateway }));

  const rows = [];
  for (const tool of TOOLS) {
    const info = installed[tool];
    const mode = await currentMode(tool);
    rows.push({ tool, info, mode });
    const installLabel = info ? t("installedStatus", { version: info.version ?? "?" }) : t("notInstalled");
    const modeLabel = mode.effective === "ainet" ? t("modeAinet") : t("modeSubscription");
    const recordedLabel = mode.recorded === "ainet" ? t("modeAinet") : t("modeSubscription");
    const driftLabel = mode.drift ? t("stateSaid", { mode: recordedLabel }) : "";
    await ok(t("modeLine", { tool: tool.padEnd(7), installLabel: installLabel.padEnd(22), mode: modeLabel, drift: driftLabel }));
  }
  console.log("");

  const switchable = rows.filter((r) => r.info);
  if (switchable.length === 0) {
    await warn(t("neitherInstalled"));
    return;
  }
  if (!process.stdin.isTTY) {
    await ok(t("nonInteractiveStatus"));
    return;
  }

  const apiKey = await readAinetKey();
  const choices = [];
  let skippedAinet = false;
  for (const r of switchable) {
    const target = r.mode.effective === "ainet" ? "subscription" : "ainet";
    const targetLabel = target === "ainet" ? t("modeAinet") : t("targetSubscription");
    if (target === "ainet" && !apiKey) {
      skippedAinet = true;
      continue;
    }
    choices.push({
      title: t("switchChoice", { tool: r.tool, target: targetLabel }),
      value: { tool: r.tool, target }
    });
  }
  if (skippedAinet) {
    await warn(t("noKeyForSwitch"));
  }
  choices.push({ title: t("doNothing"), value: null });

  const answer = await prompts({
    type: "select",
    name: "action",
    message: t("switchPrompt"),
    choices,
    initial: 0,
    instructions: false,
    hint: t("promptHintSelectOne")
  });
  if (!answer.action) {
    await ok(t("noChanges"));
    return;
  }

  const result = await switchTo(answer.action.tool, answer.action.target, {
    gateway: switchGateway,
    apiKey,
    dryRun
  });
  await reportSwitch(result);
}
