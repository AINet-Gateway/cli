import { debug, sleep } from "./util.mjs";
import { t } from "./i18n.mjs";

const DEFAULT_BASE = "https://ainet.bytestrike.dev";

export function gatewayUrl() {
  return (process.env.AINET_GATEWAY_URL ?? DEFAULT_BASE).replace(/\/$/, "");
}

export class DeviceCodeError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function jsonRequest(path, init = {}, { timeoutMs = 30_000 } = {}) {
  const url = `${gatewayUrl()}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let resp;
  try {
    debug(`→ ${init.method ?? "GET"} ${url}`);
    resp = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(init.headers ?? {})
      }
    });
  } catch (err) {
    throw new DeviceCodeError(
      t("networkError", { url, message: err.message }),
      { status: 0 }
    );
  } finally {
    clearTimeout(timeout);
  }
  const text = await resp.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }
  debug(`← ${resp.status} ${url} ${text.slice(0, 200)}`);
  return { status: resp.status, body };
}

export async function createDeviceCode({ hostname, platform, clientVersion, scopes }) {
  const { status, body } = await jsonRequest("/user/v1/device-codes", {
    method: "POST",
    body: JSON.stringify({
      client_name: "ainet-cli",
      client_version: clientVersion,
      hostname,
      platform,
      ...(Array.isArray(scopes) && scopes.length ? { scopes } : {})
    })
  });
  if (status !== 200) {
    throw new DeviceCodeError(
      messageFor(body, t("deviceStartFailed")),
      { status }
    );
  }
  return body;
}

export async function pollUntilApproved({ deviceCode, intervalSeconds, expiresIn, onTick }) {
  const deadline = Date.now() + expiresIn * 1000;
  let interval = Math.max(1, intervalSeconds);
  while (Date.now() < deadline) {
    const { status, body } = await jsonRequest(
      `/user/v1/device-codes/poll?device_code=${encodeURIComponent(deviceCode)}`,
      { method: "GET" }
    );
    if (status === 200) return body;
    if (status === 428) {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      onTick?.(remaining);
      await sleep(interval * 1000);
      continue;
    }
    if (status === 429) {
      interval = Math.min(interval * 2, 30);
      await sleep(interval * 1000);
      continue;
    }
    throw new DeviceCodeError(
      messageFor(body, t("authorizationIncomplete")),
      { status }
    );
  }
  throw new DeviceCodeError(t("deviceExpired"), { status: 410 });
}

function messageFor(body, fallback) {
  if (body && typeof body === "object") {
    if (body.error && typeof body.error === "object" && typeof body.error.message === "string") {
      return body.error.message;
    }
    if (typeof body.detail === "string") return body.detail;
  }
  return fallback;
}
