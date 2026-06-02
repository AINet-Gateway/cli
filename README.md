# @ainet/cli

A persistent **switcher** for [AINet Gateway](https://ainet.bytestrike.dev).
Flip Claude Code and the Codex CLI between **your own subscription** and
**AINet** with one keystroke — your subscription login is never touched.

Source-available (BSL 1.1) — read every line before you run it. Runs as your
user, no admin rights required.

## First run

```sh
npm install -g github:AINet-Gateway/cli
ainet setup
```

The wizard detects your tools, installs (or updates) the ones you pick via
their **native binary installers** (no npm), authorizes this device against the
gateway with the scopes those tools need, saves your AINet key, and activates
AINet mode.

## Switching

```sh
ainet                       # show each tool's mode + offer a one-keystroke switch
ainet status                # same as above, explicit

ainet use subscription      # both tools back to your own login
ainet use ainet             # both tools back to AINet
ainet use subscription codex   # just one tool
ainet use ainet claude
```

Bare `ainet` runs the wizard on first use (no `~/.ainet/state.json` yet), and
the interactive status/switch screen afterwards.

```sh
ainet login        # re-run the device-code auth (issues a fresh key)
ainet help         # usage info
ainet --version
```

## Preview first (`--dry-run`)

Add `--dry-run` (or `-n`) to any command to print every action — installs,
file writes, backups, state changes — without touching anything on disk or
issuing a key:

```sh
ainet setup --dry-run
ainet use ainet --dry-run
ainet use subscription codex --dry-run
```

## How the switch works (and what it never touches)

The switch only writes a deterministic, AINet-managed config override; it never
reads, moves, or deletes your subscription credentials.

- **Claude Code** — toggles two keys in `~/.claude/settings.json` `env`:
  `ANTHROPIC_BASE_URL` (→ `<gateway>/anthropic`) and `ANTHROPIC_AUTH_TOKEN`
  (your AINet key). These outrank the subscription OAuth. Subscription mode
  restores the previous values for those two keys, or removes them if they did
  not exist before AINet was enabled. Other Anthropic env keys are left alone.
  Your subscription login (macOS Keychain / `~/.claude/.credentials.json`) is
  left alone, and we never run `claude /logout`.
- **Codex CLI** — toggles an `# >>> ainet-managed` block in
  `~/.codex/config.toml`: `model_provider = "ainet"` plus a
  `[model_providers.ainet]` provider (`wire_api = "responses"`,
  `requires_openai_auth = false`) whose key is delivered by a credential helper
  that `cat`s `~/.ainet/codex-token`. Subscription mode restores your original
  `model_provider` (captured at first apply) and strips the block.
  `~/.codex/auth.json` (your ChatGPT login) is never written.

Every mutating action backs the target file up first (under
`~/.ainet/backups/<tool>/<timestamp>/`) and prints exactly what changed. The
writers merge into your existing settings — they never clobber unrelated keys —
and are safe to re-run (repair-on-rerun).

## State

The CLI keeps its own state in `~/.ainet/` (mode 0600):

- `state.json` — gateway URL and per-tool `{mode, keyPrefix, updatedAt, …}`.
- `codex-token` — the raw AINet key, read by the Codex credential helper. The
  key is never printed after handoff and never written to your shell env.

## Environment overrides

| Variable             | Default                          | What it does                                |
| -------------------- | -------------------------------- | ------------------------------------------- |
| `AINET_LANG`         | auto (`ru` or `en`)              | Force CLI language (`ru` / `en`).           |
| `AINET_GATEWAY_URL`  | `https://ainet.bytestrike.dev`   | Point the CLI at a self-hosted gateway.     |
| `AINET_DEBUG`        | unset                            | `=1` prints HTTP traces for support tickets.|

## Verifying a switch

- Claude Code: run `/status` inside the agent.
- Codex: run `codex login status`.

## Why you can trust it

This is the program that touches your machine, so don't take our word — read it.
Every claim here is verifiable in this repo:

- **It never reads or moves your subscription login.** No code path opens the
  Claude Code Keychain item or `~/.codex/auth.json` to read it, and it never
  runs `claude /logout`. Switching is pure config override.
- **It has no analytics or telemetry.** AINet-specific network calls are the
  device-code auth and selected provider `/models` smoke tests, both to the
  gateway URL you see. If you ask setup to install missing tools, it also
  downloads those tools through their official installers.
- **Your key never leaks.** It goes from the one-time auth response into a
  `0600` file and the tool config — never printed after handoff, never into your
  shell history or shell env.
- **Everything is reversible.** Each mutation backs up first; `--dry-run` shows
  you the full plan before anything happens; `ainet use subscription` restores
  your own login with no re-login required.
- **No elevated privileges.** Runs as your user and installs the tools with
  their official installers — never our own mirrors.

## License

Source-available under the **Business Source License 1.1** — see [LICENSE](./LICENSE).
You may read, audit, modify, and use it; you may not offer it to third parties
as a competing hosted or managed service. It converts to an open-source license
on the Change Date.

## Source

Source lives at <https://github.com/AINet-Gateway/cli>.  Issues and PRs welcome.
