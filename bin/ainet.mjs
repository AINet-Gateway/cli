#!/usr/bin/env node
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { t } from "../src/i18n.mjs";

const rawArgv = process.argv.slice(2);
const dryRun = rawArgv.includes("--dry-run") || rawArgv.includes("-n");
const argv = rawArgv.filter((a) => a !== "--dry-run" && a !== "-n");
const command = argv[0];

function printError(message) {
  console.error(`\n✖ ${message}\n`);
}

function statePath() {
  return path.join(os.homedir(), ".ainet", "state.json");
}

async function runUse(args, { dryRun = false } = {}) {
  const target = args[0];
  if (target !== "ainet" && target !== "subscription") {
    printError(t("usageUse"));
    process.exitCode = 2;
    return;
  }
  const { switchTo, reportSwitch, TOOLS } = await import("../src/swap.mjs");
  const { readState } = await import("../src/state.mjs");
  const { readFile } = await import("node:fs/promises");
  const { codexTokenPath } = await import("../src/state.mjs");
  const { gatewayUrl } = await import("../src/deviceCode.mjs");

  const tools = args[1] ? [args[1]] : TOOLS;
  for (const tool of tools) {
    if (!TOOLS.includes(tool)) {
      printError(t("unknownTool", { tool }));
      process.exitCode = 2;
      return;
    }
  }
  const state = await readState();
  const baseUrl = process.env.AINET_GATEWAY_URL ? gatewayUrl() : state.gateway;
  let apiKey = null;
  if (target === "ainet") {
    try {
      apiKey = (await readFile(codexTokenPath(), "utf8")).trim() || null;
    } catch {
      apiKey = null;
    }
  }
  for (const tool of tools) {
    try {
      const result = await switchTo(tool, target, { gateway: baseUrl, apiKey, dryRun });
      await reportSwitch(result);
    } catch (err) {
      printError(`${tool}: ${err.message}`);
      process.exitCode = 1;
    }
  }
}

async function main() {
  switch (command) {
    case undefined: {
      if (!existsSync(statePath())) {
        const { runSetup } = await import("../src/setup.mjs");
        await runSetup({ dryRun });
      } else {
        const { runStatus } = await import("../src/status.mjs");
        await runStatus({ dryRun });
      }
      return;
    }
    case "setup":
    case "login": {
      const { runSetup } = await import("../src/setup.mjs");
      await runSetup({ dryRun });
      return;
    }
    case "status": {
      const { runStatus } = await import("../src/status.mjs");
      await runStatus({ dryRun });
      return;
    }
    case "use": {
      await runUse(argv.slice(1), { dryRun });
      return;
    }
    case "--help":
    case "-h":
    case "help":
      console.log(t("help"));
      return;
    case "--version":
    case "-v":
    case "version": {
      const { version } = await import("../package.json", { with: { type: "json" } }).then(
        (m) => m.default
      );
      console.log(version);
      return;
    }
    default:
      printError(t("unknownCommand", { command }));
      process.exitCode = 2;
  }
}

main().catch((err) => {
  printError(err?.stack ?? err?.message ?? String(err));
  process.exit(1);
});
