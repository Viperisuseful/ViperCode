# Viper Code

Viper Code is a minimal web GUI for coding agents — run Claude Code and Codex side by side in one app, with git worktrees, per-turn diffs, and one-click PRs.

Viper Code is a rebranded fork of [T3 Code](https://github.com/pingdotgg/t3code) by T3 Tools Inc. (MIT licensed). The Cursor integration has been removed; Claude Code and Codex are the primary providers (Grok and OpenCode remain available).

## Providers

Install and authenticate at least one provider before use:

- Claude: install [Claude Code](https://claude.com/product/claude-code) and run `claude` once to log in
- Codex: install [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`
- OpenCode (optional): install [OpenCode](https://opencode.ai) and run `opencode auth login`
- Grok (optional): install the Grok CLI and log in

## Development setup

Requirements:

- Node.js 24+ (Node 25 works)
- pnpm 10 (`npm install -g pnpm@10.24.0`)
- Vite+ (`npm install -g vite-plus@0.1.24`, provides the `vp` command)

```bash
# install dependencies
vp i

# run the web app + server in dev mode
pnpm dev

# run the Electron desktop app in dev mode
pnpm dev:desktop

# typecheck / test
pnpm typecheck
pnpm test
```

## Building the desktop app (Windows)

```bash
pnpm build:desktop
pnpm dist:desktop:win
```

The installer lands in the output directory printed by the build script. Auto-update is disabled unless you set `VIPERCODE_DESKTOP_UPDATE_REPOSITORY=<owner>/<repo>` at build time to point at your own GitHub releases.

## CLI

The server package builds a `viper` CLI (`apps/server`, bin `viper`):

```bash
pnpm build
node apps/server/dist/bin.mjs        # or `viper` once linked/installed
```

## Notes

- This is a fork of an alpha-stage upstream — expect bugs.
- Docs live in [docs/](./docs).
- Architecture overview: [docs/architecture/overview.md](./docs/architecture/overview.md)
- Upstream remote is kept as `upstream` for pulling future T3 Code changes.
