// Sanity-check that the freshly-minted key works against the gateway.
// We use provider /models endpoints because they are cheap and do not spend
// tokens. Checks are selected from the tools/scopes the user actually chose.

import { gatewayUrl } from "./deviceCode.mjs";
import { debug } from "./util.mjs";

export async function smokeTest({ apiKey, tools = ["codex"], scopes = [] }) {
  const checks = smokeChecks({ tools, scopes });
  if (checks.length === 0) {
    return { ok: true, skipped: true, checks: [] };
  }

  const results = [];
  for (const check of checks) {
    const result = await runCheck(check, apiKey);
    if (!result.ok) return result;
    results.push(result);
  }
  return { ok: true, status: 200, checks: results };
}

export function smokeChecks({ tools = [], scopes = [] } = {}) {
  const selected = new Set(tools);
  const granted = new Set(scopes);
  const checks = [];
  if (selected.has("codex") && granted.has("openai:models")) {
    checks.push({ label: "OpenAI route", path: "/openai/v1/models" });
  }
  if (selected.has("claude") && granted.has("anthropic:models")) {
    checks.push({ label: "Anthropic route", path: "/anthropic/v1/models" });
  }
  return checks;
}

async function runCheck(check, apiKey) {
  const url = `${gatewayUrl()}${check.path}`;
  debug(`smoke → GET ${url}`);
  const resp = await fetch(url, {
    headers: { authorization: `Bearer ${apiKey}` }
  });
  if (!resp.ok) {
    const text = await resp.text();
    return {
      ok: false,
      label: check.label,
      status: resp.status,
      message: `${check.label} returned ${resp.status}: ${text.slice(0, 240)}`
    };
  }
  const body = await resp.json();
  const count = Array.isArray(body?.data) ? body.data.length : null;
  return { ok: true, label: check.label, status: 200, modelCount: count };
}
