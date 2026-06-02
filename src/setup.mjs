import open from "open";
import prompts from "prompts";

import { gatewayUrl, createDeviceCode, pollUntilApproved, DeviceCodeError } from "./deviceCode.mjs";
import { checkInstalledTools, detectPlatform, detectShell } from "./detect.mjs";
import { applyClaudeAinet, applyCodexAinet } from "./config.mjs";
import { ensureInstalled } from "./install.mjs";
import { joinList, t } from "./i18n.mjs";
import { readState, saveAinetKey, updateToolState, writeState } from "./state.mjs";
import { smokeTest } from "./smoke.mjs";
import { clearLine, debug, logo, ok, pending, plan, step, warn } from "./util.mjs";

const CLI_VERSION = "0.2.0";

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

async function cancelSetup() {
  await warn(t("setupCancelled"));
  process.exitCode = 1;
}

export function deriveScopes(tools) {
  const set = new Set();
  for (const tool of tools) {
    for (const scope of SCOPES_BY_TOOL[tool] ?? []) set.add(scope);
  }
  return ALLOWED_SCOPES.filter((s) => set.has(s));
}

export async function runSetup({ dryRun = false } = {}) {
  await logo();
  await step(t("detectingSystem"));
  const platform = detectPlatform();
  const shell = detectShell();
  await ok(`OS: ${platform.platform} (${platform.arch})`);
  await ok(t("hostname", { hostname: platform.hostname }));
  await ok(t("shell", { shell }));
  await ok(t("gateway", { gateway: gatewayUrl() }));
  console.log("");

  await step(t("checkingTools"));
  const installed = await checkInstalledTools();
  if (!installed.node.ok) {
    await warn(t("nodeTooOld", { version: installed.node.version }));
    return;
  }
  await ok(`Node.js ${installed.node.version}`);
  await ok(
    `Claude Code: ${installed.claude ? `${installed.claude.path} (${installed.claude.version ?? "?"})` : t("notInstalled")}`
  );
  await ok(
    `Codex: ${installed.codex ? `${installed.codex.path} (${installed.codex.version ?? "?"})` : t("notInstalled")}`
  );
  console.log("");

  if (!process.stdin.isTTY) {
    await warn(t("setupRequiresTty"));
    process.exitCode = 1;
    return;
  }

  const answer = await prompts({
    type: "multiselect",
    name: "tools",
    message: t("selectTools"),
    choices: [
      { title: "Claude Code", value: "claude", selected: true },
      { title: "Codex CLI", value: "codex", selected: true }
    ],
    instructions: false,
    hint: t("promptHintSelect")
  });
  if (!answer.tools) {
    await cancelSetup();
    return;
  }
  let toolsToSetup = answer.tools;
  if (toolsToSetup.length === 0) {
    await warn(t("noToolsSelected"));
    return;
  }
  console.log("");

  const missingTools = toolsToSetup.filter((tool) => !installed[tool]?.path);
  if (missingTools.length > 0) {
    const missingLabels = joinList(missingTools.map(toolLabel));
    const installChoice = await prompts({
      type: "select",
      name: "action",
      message: t("installMissingPrompt", { tools: missingLabels }),
      choices: [
        { title: t("installMissingYes"), value: "install" },
        { title: t("installMissingNo"), value: "skip" }
      ],
      initial: 0,
      instructions: false,
      hint: t("promptHintSelectOne")
    });
    if (!installChoice.action) {
      await cancelSetup();
      return;
    }
    if (installChoice.action === "install") {
      for (const tool of missingTools) {
        try {
          await ensureInstalled(tool, installed[tool], { dryRun });
        } catch (err) {
          await warn(t("skippingTool", { tool, message: err.message }));
        }
      }
    } else {
      await warn(t("installMissingSkipped", { tools: missingLabels }));
      toolsToSetup = toolsToSetup.filter((tool) => installed[tool]?.path);
      if (toolsToSetup.length === 0) {
        await warn(t("noToolsAfterInstallSkip"));
        return;
      }
    }
    console.log("");
  }

  let scopes = deriveScopes(toolsToSetup);
  await step(t("scopesTitle"));
  if (toolsToSetup.includes("claude")) {
    console.log(`  ${t("scopesClaude")}`);
  }
  if (toolsToSetup.includes("codex")) {
    console.log(`  ${t("scopesCodex")}`);
  }
  console.log(`  ${t("scopesHint")}`);
  console.log("");

  const advanced = await prompts({
    type: "confirm",
    name: "customize",
    message: t("advancedScopes"),
    initial: false
  });
  if (advanced.customize === undefined) {
    await cancelSetup();
    return;
  }
  if (advanced.customize) {
    const picked = await prompts({
      type: "multiselect",
      name: "scopes",
      message: t("selectScopes"),
      choices: ALLOWED_SCOPES.map((s) => ({ title: s, value: s, selected: scopes.includes(s) })),
      instructions: false,
      hint: t("promptHintToggle")
    });
    if (!picked.scopes) {
      await cancelSetup();
      return;
    }
    if (picked.scopes.length) scopes = picked.scopes;
  }
  debug(`scopes=${scopes.join(",")}`);
  console.log("");

  if (dryRun) {
    await step(t("dryRunPreview"));
    const previewBase = gatewayUrl();
    await plan(
      t("planRequestDeviceCode", { url: previewBase, scopes: scopes.join(", ") })
    );
    await plan(t("planOpenBrowser", { url: previewBase }));
    await plan(t("planSaveKey"));
    const previewKey = "sk_live_<issued-after-approval>";
    if (toolsToSetup.includes("claude")) {
      const res = await applyClaudeAinet({ baseUrl: previewBase, apiKey: previewKey, dryRun: true });
      await plan(t("planWriteClaude", { file: res.file, url: previewBase }));
    }
    if (toolsToSetup.includes("codex")) {
      const res = await applyCodexAinet({ baseUrl: previewBase, dryRun: true });
      await plan(t("planWriteCodex", { file: res.file }));
    }
    const smokeRoutes = [];
    if (toolsToSetup.includes("codex") && scopes.includes("openai:models")) {
      smokeRoutes.push(`${previewBase}/openai/v1/models`);
    }
    if (toolsToSetup.includes("claude") && scopes.includes("anthropic:models")) {
      smokeRoutes.push(`${previewBase}/anthropic/v1/models`);
    }
    if (smokeRoutes.length > 0) {
      await plan(t("planSmoke", { routes: joinList(smokeRoutes) }));
    } else {
      await plan(t("planSkipSmoke"));
    }
    console.log("");
    await warn(t("dryRunSetupDone"));
    return;
  }

  await step(t("requestingDeviceCode"));
  let dcResp;
  try {
    dcResp = await createDeviceCode({
      hostname: platform.hostname,
      platform: platform.platform,
      clientVersion: CLI_VERSION,
      scopes
    });
  } catch (err) {
    if (err instanceof DeviceCodeError) {
      await warn(t("deviceCodeReachFailed", { url: gatewayUrl(), message: err.message }));
      await warn(t("checkNetwork"));
      return;
    }
    throw err;
  }
  const { device_code, user_code, verification_uri_complete, expires_in, interval } = dcResp;
  await ok(t("gotCode", { code: user_code }));
  console.log("");

  console.log(t("openUrl"));
  console.log(`  ${verification_uri_complete}`);
  console.log("");
  console.log(t("approveHint"));
  console.log(t("codeExpires", { minutes: Math.round(expires_in / 60) }));
  console.log("");

  try {
    await open(verification_uri_complete);
    await ok(t("browserOpened"));
  } catch {
    await warn(t("browserOpenFailed"));
  }
  console.log("");

  await step(t("waitingApproval"));
  let polled;
  try {
    polled = await pollUntilApproved({
      deviceCode: device_code,
      intervalSeconds: interval,
      expiresIn: expires_in,
      onTick: (remaining) => {
        pending(t("waiting", { seconds: remaining }));
      }
    });
  } catch (err) {
    clearLine();
    if (err instanceof DeviceCodeError && err.status === 410) {
      await warn(t("authorizationTimedOut"));
      return;
    }
    if (err instanceof DeviceCodeError && err.status === 403) {
      await warn(t("authorizationDenied"));
      return;
    }
    throw err;
  }
  clearLine();
  await ok(t("approvedKey", { prefix: polled.key_prefix, name: polled.key_name }));
  debug(`api_key_id=${polled.api_key_id} account_id=${polled.account_id}`);
  console.log("");

  await step(t("activatingAinet"));
  const baseUrl = gatewayUrl();
  await saveAinetKey(polled.api_key);
  const state = await readState();
  state.gateway = baseUrl;
  await writeState(state);

  if (toolsToSetup.includes("claude")) {
    const res = await applyClaudeAinet({ baseUrl, apiKey: polled.api_key });
    await ok(t("activatedTool", { label: "Claude Code", file: res.file }));
    await updateToolState("claude", { mode: "ainet", gateway: baseUrl, keyPrefix: polled.key_prefix });
  }
  if (toolsToSetup.includes("codex")) {
    const res = await applyCodexAinet({ baseUrl });
    await ok(t("activatedTool", { label: "Codex", file: res.file }));
    const patch = { mode: "ainet", gateway: baseUrl, keyPrefix: polled.key_prefix };
    if (res.capturedOriginal) patch.originalModelProvider = res.originalModelProvider;
    await updateToolState("codex", patch);
  }
  console.log("");

  await step(t("runningSmoke"));
  const result = await smokeTest({ apiKey: polled.api_key, tools: toolsToSetup, scopes });
  if (result.ok) {
    if (result.skipped) {
      await warn(t("smokeSkipped"));
    } else {
      const summary = result.checks
        .map((check) => `${check.label}: ${check.modelCount ?? "?"} models`)
        .join("; ");
      await ok(t("smokePassed", { summary }));
    }
  } else {
    await warn(t("smokeFailed", { message: result.message }));
    await warn(t("configWrittenButIssue"));
    process.exitCode = 1;
    return;
  }
  console.log("");

  console.log(t("setupDone"));
  console.log(t("nextCommandStatus"));
  console.log(t("nextCommandSubscription"));
  console.log(t("nextCommandAinet"));
  console.log("");
  console.log(t("subscriptionUntouched"));
  console.log(t("managePanel", { url: baseUrl }));
}

function toolLabel(tool) {
  if (tool === "claude") return "Claude Code";
  if (tool === "codex") return "Codex CLI";
  return tool;
}
